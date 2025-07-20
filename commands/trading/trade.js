const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const firebase = require('../../utils/firebase');

const database = firebase.firestore();

module.exports = {
    cooldown: 60 * 1,
    data: new SlashCommandBuilder()
        .setName('trade')
        .setDescription('Creates a direct trade request to a user.'),
    async execute(interaction) {
        const userId = interaction.user.id;

        const issuerUserReference = database.collection('user').doc(userId);
        const issuerUserSnapshot = await issuerUserReference.get();

        // ! If the user is not registered, returns an error message.
        if (!issuerUserSnapshot.exists) {
            await interaction.reply({ content: `${process.env.EMOJI_ERROR}  You are not registered! Use /\`card\` to start playing.`, ephemeral: true });
            return;
        }

        // * Aggregation query to the database counting the number of obtained SCPs.
        const obtainingReference = database.collection('user').doc(userId).collection('obtaining');
        const obtainingSnapshot = await obtainingReference.count().get();
        const SCPCount = obtainingSnapshot.data().count;

        // ! If the user has no SCPs, returns an error message.
        if (SCPCount === 0) {
            await interaction.reply(`${process.env.EMOJI_ERROR}  You don't have any SCPs to trade!`);
            return;
        }

        const modal = displayModal(userId);
        
        await interaction.showModal(modal);

        const filter = (userModal) => userModal.customId === `modal-${userId}`;
        const time = 1000 * 50;

        interaction.awaitModalSubmit({ filter: filter, time: time }).then(async (modalInteraction) => {
            const recipientValue = modalInteraction.fields.getTextInputValue('txtRecipient');
            const issuerCardValue = modalInteraction.fields.getTextInputValue('txtIssuerCard');
            const issuerHolographicValue = modalInteraction.fields.getTextInputValue('txtIssuerHolographic');
            const recipientCardValue = modalInteraction.fields.getTextInputValue('txtRecipientCard');
            const recipientHolographicValue = modalInteraction.fields.getTextInputValue('txtRecipientHolographic');

            // * Notify the Discord API that the interaction was received successfully and set a maximun timeout of 15 minutes.
            await modalInteraction.deferReply({ ephemeral: true });

            const fieldsValidation = validateFields(recipientValue, issuerCardValue, issuerHolographicValue, recipientCardValue, recipientHolographicValue);

            // ! If the fields are not valid, returns an error message.
            if (fieldsValidation.errorState) {
                await modalInteraction.editReply(fieldsValidation.errorMessage);
                return;
            }

             const specialConditionValidations = validateSpecialConditions(userId, fieldsValidation.recipientValue, fieldsValidation.fixedIssuerCardValue, fieldsValidation.fixedIssuerHolographicValue, fieldsValidation.fixedRecipientCardValue, fieldsValidation.fixedRecipientHolographicValue);

             // ! If the user is trying to create a trade request with himself or trading the same card, returns an error message.
            if (specialConditionValidations.errorState) {
                await modalInteraction.editReply(specialConditionValidations.errorMessage);
                return;
            }

            let tradeEntry = null;

            const errorMessage1 = 'The user you are trying to trade with is either not registered or not found.';
            const errorMessage2 = 'The user you are trying to trade with has disabled trade requests.';
            const errorMessage3 = 'It seems that you don\'t have the card you are offering.';
            const errorMessage4 = 'It seems that the user doesn\'t have the card you want.';

            try {
                await database.runTransaction(async (transaction) => {
                    const recipientUserReference = database.collection('user').doc(recipientValue);
                    const recipientUserSnapshot = await recipientUserReference.get();

                    // ! If the recipient is not registered or not found, returns an error message.
                    if (!recipientUserSnapshot.exists) {
                        throw new Error(errorMessage1);
                    }

                    const recipientDocument = recipientUserSnapshot.data();

                    // ! If the recipient has disabled trade requests, returns an error message.
                    if (recipientDocument.acceptTradeOffers === false) {
                        throw new Error(errorMessage2);
                    }

                    const foundCardIssuer = await findCard(userId, fieldsValidation.fixedIssuerCardValue, fieldsValidation.fixedIssuerHolographicValue, transaction);
                
                    // ! If the issuer doesn't have the card, returns an error message.
                    if (!foundCardIssuer.wasFound) {
                        throw new Error(errorMessage3);
                    }

                    const foundCardRecipient = await findCard(recipientValue, fieldsValidation.fixedRecipientCardValue, fieldsValidation.fixedRecipientHolographicValue, transaction);

                    // ! If the recipient doesn't have the card, returns an error message.
                    if (!foundCardRecipient.wasFound) {
                        throw new Error(errorMessage4);
                    }

                    /**
                     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
                     * * The command passes all validations and the operation is performed. *
                     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
                     */

                    tradeEntry = database.collection('trade').doc();

                    await transaction.set(tradeEntry, {
                        issuer: userId,
                        issuerCard: foundCardIssuer.cardReference,
                        issuerHolographic: foundCardIssuer.holographic,
                        recipient: recipientValue,
                        recipientCard: foundCardRecipient.cardReference,
                        recipientHolographic: foundCardRecipient.holographic,
                        securityCooldown: new Date(),
                        tradeConfirmation: false,
                        tradeDate: null,
                    });
                });

                await modalInteraction.editReply(`${process.env.EMOJI_CHECK}  Trade request sent with ID **\`${tradeEntry.id}\`**. You can use the same ID to cancel the request.`);
            } catch (error) {
                if (error.message.includes(errorMessage1) ||
                    error.message.includes(errorMessage2) ||
                    error.message.includes(errorMessage3) ||
                    error.message.includes(errorMessage4)) {

                    await modalInteraction.editReply(`${process.env.EMOJI_ERROR}  Request cancelled! ${error.message}`);
                } else {
                    console.log(`${new Date()} >>> *** ERROR: trade.js *** by ${userId} (${interaction.user.username})`);
                    console.error(error);

                    await modalInteraction.editReply('${process.env.EMOJI_ERROR}  An error has occurred while trying to create the trade request. Please try again.');
                }
            }
        }).catch(async (error) => {
            console.log(`${new Date()} >>> *** WARNING: trade.js *** by ${userId} (${interaction.user.username})`);
            console.error(error);

            await interaction.followUp({ content: `${process.env.EMOJI_ERROR}  Request cancelled due to inactivity.`, ephemeral: true });
        });
    },
};

// * Function that builds the modal.
function displayModal(userId) {
    const modal = new ModalBuilder()
        .setCustomId(`modal-${userId}`)
        .setTitle('Trade Request  📑');
        
    const txtRecipient = new TextInputBuilder()
        .setCustomId('txtRecipient')
        .setLabel('👤  User:')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('123456789')
        .setRequired(true);

    const txtIssuerCard = new TextInputBuilder()
        .setCustomId('txtIssuerCard')
        .setLabel('📄  Card to offer:')
        .setStyle(TextInputStyle.Short)
        .setMinLength(7)
        .setMaxLength(8)
        .setPlaceholder('SCP-000')
        .setRequired(true);

    const txtIssuerHolographic = new TextInputBuilder()
        .setCustomId('txtIssuerHolographic')
        .setLabel('❇️  Holographic (optional):')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Emerald/Golden/Diamond')
        .setRequired(false);
        
    const txtRecipientCard = new TextInputBuilder()
        .setCustomId('txtRecipientCard')
        .setLabel('📄  Desired card:')
        .setStyle(TextInputStyle.Short)
        .setMinLength(7)
        .setMaxLength(8)
        .setPlaceholder('SCP-000')
        .setRequired(true);

    const txtRecipientHolographic = new TextInputBuilder()
        .setCustomId('txtRecipientHolographic')
        .setLabel('❇️  Holographic (optional):')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Emerald/Golden/Diamond')
        .setRequired(false);
            
    const recipientRow = new ActionRowBuilder().addComponents(txtRecipient);
    const issuerCardRow = new ActionRowBuilder().addComponents(txtIssuerCard);
    const issuerHolographicRow = new ActionRowBuilder().addComponents(txtIssuerHolographic);
    const recipientCardRow = new ActionRowBuilder().addComponents(txtRecipientCard);
    const recipientHolographicRow = new ActionRowBuilder().addComponents(txtRecipientHolographic);
        
    modal.addComponents(recipientRow, issuerCardRow, issuerHolographicRow, recipientCardRow, recipientHolographicRow);

    return modal;
}

// *The function validates that the fields of the modal are entered correctly.
function validateFields(recipientValue, issuerCardValue, issuerHolographicValue, recipientCardValue, recipientHolographicValue) {    
    // * The validation is performed to ensure that the user ID contains only numbers.
    const recipientValidation = /^[0-9]+$/.test(recipientValue);

    // * The card IDs are formatted to uppercase.
    const fixedIssuerCardValue = issuerCardValue.toUpperCase();
    const fixedRecipientCardValue = recipientCardValue.toUpperCase();

    // * Validates that the card format is correct.
    const issuerCardValidation = /^scp-\d{3,4}$/i.test(fixedIssuerCardValue);
    const recipientCardValidation = /^scp-\d{3,4}$/i.test(fixedRecipientCardValue);

    // * Array that contains the valid holographic values.
    const validHolographics = ['', 'Emerald', 'Golden', 'Diamond'];

    // * Formats the holographic values and validates that are correct.
    const fixedIssuerHolographicValue = issuerHolographicValue.charAt(0).toUpperCase() + issuerHolographicValue.toLowerCase().slice(1);
    const fixedRecipientHolographicValue = recipientHolographicValue.charAt(0).toUpperCase() + recipientHolographicValue.toLowerCase().slice(1);

    const issuerHolographicValidation = validHolographics.includes(fixedIssuerHolographicValue);
    const recipientHolographicValidation = validHolographics.includes(fixedRecipientHolographicValue);
    
    let errorMessage = `${process.env.EMOJI_ERROR}  The following data was entered incorrectly:\n`;
    let errorState = false;

    if (!recipientValidation) {
        errorMessage += `${process.env.EMOJI_SMALL_WHITE_DASH}User ID. It should only contain numbers.\n`;
        errorState = true;
    }
    
    if (!issuerCardValidation) {
        errorMessage += `${process.env.EMOJI_SMALL_WHITE_DASH}Offered card. Card ID format is \`SCP-XXXX\`.\n`;
        errorState = true;
    }

    if (!issuerHolographicValidation) {
        errorMessage += `${process.env.EMOJI_SMALL_WHITE_DASH}Offered holographic. Allowed values are Emerald/Golden/Diamond.\n`;
        errorState = true;
    }

    if (!recipientCardValidation) {
        errorMessage += `${process.env.EMOJI_SMALL_WHITE_DASH}Desired card. Card ID format is \`SCP-XXXX\`.\n`;
        errorState = true;
    }

    if (!recipientHolographicValidation) {
        errorMessage += `${process.env.EMOJI_SMALL_WHITE_DASH}Desired holographic. Allowed values are Emerald/Golden/Diamond.`;
        errorState = true;
    }

    return { recipientValue, fixedIssuerCardValue, fixedIssuerHolographicValue, fixedRecipientCardValue, fixedRecipientHolographicValue, errorState, errorMessage };
}

// * This function does special validations that are not covered by the previous function, such as trading with yourself or trading the same card.
function validateSpecialConditions(userId, recipientValue, issuerCardValue, issuerHolographicValue, recipientCardValue, recipientHolographicValue) {
    let errorMessage = `${process.env.EMOJI_ERROR}  You can't perform the following actions:\n`;
    let errorState = false;
    
    if (userId === recipientValue) {
        errorMessage += `${process.env.EMOJI_SMALL_WHITE_DASH}You can't trade with yourself.\n`;
        errorState = true;
    }

    if (issuerCardValue === recipientCardValue && issuerHolographicValue === recipientHolographicValue) {
        errorMessage += `${process.env.EMOJI_SMALL_WHITE_DASH}You can't trade the same card.`;
        errorState = true;
    }

    return { errorState, errorMessage };
}

// * This function searches for the card data through all the card collections, and then with the reference it checks if the user has the card in the collection.
async function findCard(userId, cardId, holographic, transaction) {
    let holographicValue = holographic;

    if (holographicValue.length < 2) {
        holographicValue = 'Normal';
    }

    const cardReferences = [
        database.collection('card').doc('Safe').collection('safe').doc(cardId),
        database.collection('card').doc('Euclid').collection('euclid').doc(cardId),
        database.collection('card').doc('Keter').collection('keter').doc(cardId),
        database.collection('card').doc('Thaumiel').collection('thaumiel').doc(cardId),
        database.collection('card').doc('Apollyon').collection('apollyon').doc(cardId),
    ];

    const cardPromises = cardReferences.map(reference => reference.get());

    const snapshots = await Promise.all(cardPromises);

    for (const snapshot of snapshots) {
        if (snapshot.exists) {
            const obtentionReference = database.collection('user').doc(userId).collection('obtaining');
            const obtentionQuery = obtentionReference.where('card', '==', snapshot.ref)
                                                        .where('holographic', '==', holographicValue).limit(1);
            const obtentionSnapshot = await transaction.get(obtentionQuery);

            if (!obtentionSnapshot.empty) {
                return {
                    wasFound: true,
                    holographic: holographicValue,
                    cardReference: snapshot.ref,
                };
            } else {
                return { wasFound: false };
            }
        }
    }

    return { wasFound: false };
}
