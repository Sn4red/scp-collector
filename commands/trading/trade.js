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

        if (issuerUserSnapshot.exists) {
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

                if (!fieldsValidation.errorState) {   
                    const specialConditionValidations = validateSpecialConditions(userId, fieldsValidation.recipientValue, fieldsValidation.fixedIssuerCardValue, fieldsValidation.fixedIssuerHolographicValue, fieldsValidation.fixedRecipientCardValue, fieldsValidation.fixedRecipientHolographicValue);

                    if (!specialConditionValidations.errorState) {
                        let tradeEntry = null;

                        try {
                            await database.runTransaction(async (transaction) => {
                                const foundCardIssuer = await findCard(userId, fieldsValidation.fixedIssuerCardValue, fieldsValidation.fixedIssuerHolographicValue, transaction);
                            
                                if (!foundCardIssuer.wasFound) {
                                    throw new Error('It seems that you don\'t have the card you are offering.');
                                }

                                const recipientUserReference = database.collection('user').doc(recipientValue);
                                const recipientUserSnapshot = await recipientUserReference.get();

                                if (!recipientUserSnapshot.exists) {
                                    throw new Error('The user you are trying to trade with is either not registered or not found.');
                                }

                                const recipientDocument = recipientUserSnapshot.data();

                                if (recipientDocument.acceptTradeOffers === false) {
                                    throw new Error('The user you are trying to trade with has disabled trade requests.');
                                }

                                const foundCardRecipient = await findCard(recipientValue, fieldsValidation.fixedRecipientCardValue, fieldsValidation.fixedRecipientHolographicValue, transaction);

                                if (!foundCardRecipient.wasFound) {
                                    throw new Error('It seems that the user doesn\'t have the card you want.');
                                }

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

                            modalInteraction.editReply(`<a:check:1235800336317419580>  Trade request sent with ID **\`${tradeEntry.id}\`**. You can use the same ID to cancel the request.`);
                        } catch (error) {
                            modalInteraction.editReply(`<a:error:1229592805710762128>  Request cancelled! ${error.message}`);
                        }
                    } else {
                        modalInteraction.editReply(specialConditionValidations.errorMessage);
                    }
                } else {
                    modalInteraction.editReply(fieldsValidation.errorMessage);
                }
            }).catch((error) => {
                console.log(error.message);

                interaction.followUp({ content: '<a:error:1229592805710762128>  Request cancelled due to inactivity.', ephemeral: true });
            });
        } else {
            await interaction.reply({ content: '<a:error:1229592805710762128>  You are not registered! Use /`card` to start playing.', ephemeral: true });
        }
    },
};

// * Function that builds the modal.
function displayModal(idUsuario) {
    const modal = new ModalBuilder()
        .setCustomId(`modal-${idUsuario}`)
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
    
    let errorMessage = '<a:error:1229592805710762128>  The following data was entered incorrectly:\n';
    let errorState = false;

    if (!recipientValidation) {
        errorMessage += '▫️ User ID. It should only contain numbers.\n';
        errorState = true;
    }
    
    if (!issuerCardValidation) {
        errorMessage += '▫️ Offered card. Card ID format is `SCP-XXXX`.\n';
        errorState = true;
    }

    if (!issuerHolographicValidation) {
        errorMessage += '▫️ Offered holographic. Allowed values are Emerald/Golden/Diamond.\n';
        errorState = true;
    }

    if (!recipientCardValidation) {
        errorMessage += '▫️ Desired card. Card ID format is `SCP-XXXX`.\n';
        errorState = true;
    }

    if (!recipientHolographicValidation) {
        errorMessage += '▫️ Desired holographic. Allowed values are Emerald/Golden/Diamond.';
        errorState = true;
    }

    return { recipientValue, fixedIssuerCardValue, fixedIssuerHolographicValue, fixedRecipientCardValue, fixedRecipientHolographicValue, errorState, errorMessage };
}

// * This function does special validations that are not covered by the previous function, such as trading with yourself or trading the same card.
function validateSpecialConditions(userId, recipientValue, issuerCardValue, issuerHolographicValue, recipientCardValue, recipientHolographicValue) {
    let errorMessage = '<a:error:1229592805710762128>  You can\'t perform the following actions:\n';
    let errorState = false;
    
    if (userId === recipientValue) {
        errorMessage += '▫️ You can\'t trade with yourself.\n';
        errorState = true;
    }

    if (issuerCardValue === recipientCardValue && issuerHolographicValue === recipientHolographicValue) {
        errorMessage += '▫️ You can\'t trade the same card.';
        errorState = true;
    }

    return { errorState, errorMessage };
}

// * This function searches for the card data through all the card collections, and then with the reference it checks if the user has the card in his collection.
async function findCard(userId, cardId, holographic, transaction) {
    let holographicValue = holographic;

    if (holographicValue.length < 2) {
        holographicValue = 'Normal';
    }

    const cardSafeReference = database.collection('card').doc('Safe').collection('safe').doc(cardId);
    const cardSafeSnapshot = await cardSafeReference.get();

    const cardEuclidReference = database.collection('card').doc('Euclid').collection('euclid').doc(cardId);
    const cardEuclidSnapshot = await cardEuclidReference.get();

    const cardKeterReference = database.collection('card').doc('Keter').collection('keter').doc(cardId);
    const cardKeterSnapshot = await cardKeterReference.get();

    const cardThaumielReference = database.collection('card').doc('Thaumiel').collection('thaumiel').doc(cardId);
    const cardThaumielSnapshot = await cardThaumielReference.get();

    const cardApollyonReference = database.collection('card').doc('Apollyon').collection('apollyon').doc(cardId);
    const cardApollyonSnapshot = await cardApollyonReference.get();

    if (cardSafeSnapshot.exists) {
        const cardData = cardSafeSnapshot.data();
        
        const obtentionReference = database.collection('user').doc(userId).collection('obtaining');
        const obtentionQuery = obtentionReference.where('card', '==', cardSafeSnapshot.ref)
                                                    .where('holographic', '==', holographicValue).limit(1);
        const obtentionSnapshot = await transaction.get(obtentionQuery);

        if (!obtentionSnapshot.empty) {
            return {
                wasFound: true,
                cardData: cardData,
                class: 'Safe',
                holographic: holographicValue,
                cardReference: cardSafeSnapshot.ref,
            };
        } else {
            return { wasFound: false };
        }
    }

    if (cardEuclidSnapshot.exists) {
        const cardData = cardEuclidSnapshot.data();
        
        const obtentionReference = database.collection('user').doc(userId).collection('obtaining');
        const obtentionQuery = obtentionReference.where('card', '==', cardEuclidSnapshot.ref)
                                                    .where('holographic', '==', holographicValue).limit(1);
        const obtentionSnapshot = await transaction.get(obtentionQuery);

        if (!obtentionSnapshot.empty) {
            return {
                wasFound: true,
                cardData: cardData,
                class: 'Euclid',
                holographic: holographicValue,
                cardReference: cardEuclidSnapshot.ref,
            };
        } else {
            return { wasFound: false };
        }
    }

    if (cardKeterSnapshot.exists) {
        const cardData = cardKeterSnapshot.data();
        
        const obtentionReference = database.collection('user').doc(userId).collection('obtaining');
        const obtentionQuery = obtentionReference.where('card', '==', cardKeterSnapshot.ref)
                                                    .where('holographic', '==', holographicValue).limit(1);
        const obtentionSnapshot = await transaction.get(obtentionQuery);

        if (!obtentionSnapshot.empty) {
            return {
                wasFound: true,
                cardData: cardData,
                class: 'Keter',
                holographic: holographicValue,
                cardReference: cardKeterSnapshot.ref,
            };
        } else {
            return { wasFound: false };
        }
    }

    if (cardThaumielSnapshot.exists) {
        const cardData = cardThaumielSnapshot.data();
        
        const obtentionReference = database.collection('user').doc(userId).collection('obtaining');
        const obtentionQuery = obtentionReference.where('card', '==', cardThaumielSnapshot.ref)
                                                    .where('holographic', '==', holographicValue).limit(1);
        const obtentionSnapshot = await transaction.get(obtentionQuery);

        if (!obtentionSnapshot.empty) {
            return {
                wasFound: true,
                cardData: cardData,
                class: 'Thaumiel',
                holographic: holographicValue,
                cardReference: cardThaumielSnapshot.ref,
            };
        } else {
            return { wasFound: false };
        }
    }

    if (cardApollyonSnapshot.exists) {
        const cardData = cardApollyonSnapshot.data();
        
        const obtentionReference = database.collection('user').doc(userId).collection('obtaining');
        const obtentionQuery = obtentionReference.where('card', '==', cardApollyonSnapshot.ref)
                                                    .where('holographic', '==', holographicValue).limit(1);
        const obtentionSnapshot = await transaction.get(obtentionQuery);

        if (!obtentionSnapshot.empty) {
            return {
                wasFound: true,
                cardData: cardData,
                class: 'Apollyon',
                holographic: holographicValue,
                cardReference: cardApollyonSnapshot.ref,
            };
        } else {
            return { wasFound: false };
        }
    }

    return { wasFound: false };
}
