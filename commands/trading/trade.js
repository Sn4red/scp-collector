const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const firebase = require('../../utils/firebase');

const database = firebase.firestore();

module.exports = {
    cooldown: 60,
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
            const time = 1000 * 60 * 1;

            interaction.awaitModalSubmit({ filter: filter, time: time }).then(async (modalInteraction) => {
                const recipientValue = modalInteraction.fields.getTextInputValue('txtRecipient');
                const issuerCardValue = modalInteraction.fields.getTextInputValue('txtIssuerCard');
                const recipientCardValue = modalInteraction.fields.getTextInputValue('txtRecipientCard');

                // Notify the Discord API that the interaction was received successfully and set a maximun timeout of 15 minutes.
                await modalInteraction.deferReply({ ephemeral: true });

                const fieldsValidation = validateFields(recipientValue, issuerCardValue, recipientCardValue);

                if (!fieldsValidation.errorState) {
                    const foundCardIssuer = await findCard(issuerUserReference, fieldsValidation.fixedIssuerCardValue);

                    if (foundCardIssuer) {
                        const recipientUserReference = database.collection('user').doc(recipientValue);
                        const recipientUserSnapshot = await recipientUserReference.get();

                        if (recipientUserSnapshot.exists) {
                            const foundCardRecipient = await findCard(recipientUserReference, fieldsValidation.fixedRecipientCardValue);

                            if (foundCardRecipient) {
                                const tradeEntry = database.collection('trade').doc();
                                
                                await tradeEntry.set({
                                    issuer: userId,
                                    issuerCard: foundCardIssuer.ref,
                                    recipientCard: foundCardRecipient.ref,
                                    recipient: recipientValue,
                                    securityCooldown: new Date(),
                                    tradeConfirmation: false,
                                    tradeDate: null,
                                    
                                });

                                lockCard(issuerUserReference, foundCardIssuer);

                                modalInteraction.editReply(`✅  Trade request sent with ID **\`${tradeEntry.id}\`**. You can use the same ID to cancel de request.`);
                            } else {
                                modalInteraction.editReply('❌  Request canceled! It seems that the user either doesn\'t have the card you want or it is locked.');
                            }
                        } else {
                            modalInteraction.editReply('❌  Request canceled. The user you are trying to trade with is either not registered or not found.');
                        }
                    } else {
                        modalInteraction.editReply('❌  Request canceled! It seems that you don\'t have the card you are offering, or it is locked.');
                    }
                } else {
                    modalInteraction.editReply(fieldsValidation.errorMessage);
                }
            }).catch((error) => {
                console.log(`Error: ${error}`);

                interaction.followUp({ content: '❌  Request canceled due to inactivity.', ephemeral: true });
            });
        } else {
            await interaction.reply({ content: '❌  You are not registered! Use /card to save your information.', ephemeral: true });
        }
    },
};

// Function that builds the modal.
function displayModal(idUsuario) {
    const modal = new ModalBuilder()
        .setCustomId(`modal-${idUsuario}`)
        .setTitle('Trade Request  📑');
        
    const txtRecipient = new TextInputBuilder()
        .setCustomId('txtRecipient')
        .setLabel('User:')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('123456789')
        .setRequired(true);

    const txtIssuerCard = new TextInputBuilder()
        .setCustomId('txtIssuerCard')
        .setLabel('Card to offer:')
        .setStyle(TextInputStyle.Short)
        .setMinLength(7)
        .setMaxLength(8)
        .setPlaceholder('SCP-000')
        .setRequired(true);
        
    const txtRecipientCard = new TextInputBuilder()
        .setCustomId('txtRecipientCard')
        .setLabel('Desired card:')
        .setStyle(TextInputStyle.Short)
        .setMinLength(7)
        .setMaxLength(8)
        .setPlaceholder('SCP-000')
        .setRequired(true);
            
    const recipientRow = new ActionRowBuilder().addComponents(txtRecipient);
    const issuerCardRow = new ActionRowBuilder().addComponents(txtIssuerCard);
    const recipientCardRow = new ActionRowBuilder().addComponents(txtRecipientCard);
        
    modal.addComponents(recipientRow, issuerCardRow, recipientCardRow);

    return modal;
}

// The function validates that the fields of the modal are entered correctly.
function validateFields(recipientValue, issuerCardValue, recipientCardValue) {
    // The validation is performed to ensure that the user ID contains only numbers.
    const recipientValidation = /^[0-9]+$/.test(recipientValue);

    // The card IDs are converted to uppercase.
    const fixedIssuerCardValue = issuerCardValue.toUpperCase();
    const fixedRecipientCardValue = recipientCardValue.toUpperCase();

    // Validates that the card format is correct.
    const issuerCardValidation = /^scp-\d{3,4}$/i.test(fixedIssuerCardValue);
    const recipientCardValidation = /^scp-\d{3,4}$/i.test(fixedRecipientCardValue);
    
    let errorMessage = '❌  The following data was entered incorrectly:\n';
    let errorState = false;

    if (!recipientValidation) {
        errorMessage += '▫️ User ID\n';
        errorState = true;
    }
    
    if (!issuerCardValidation) {
        errorMessage += '▫️ Offered card\n';
        errorState = true;
    }

    if (!recipientCardValidation) {
        errorMessage += '▫️ Desired card';
        errorState = true;
    }

    return { fixedIssuerCardValue, fixedRecipientCardValue, errorState, errorMessage };
}

// This function searches for a card from a user that is not 'locked'.
async function findCard(userReference, cardValue) {
    const obtainingReference = database.collection('obtaining').where('user', '==', userReference).where('locked', '==', false);
    const obtainingSnapshot = await obtainingReference.get();

    const promises = [];
    
    for (const x of obtainingSnapshot.docs) {
        const obtaining = x.data();
        const cardReference = obtaining.card;
        const cardSnapshot = cardReference.get();

        promises.push(cardSnapshot);
    }

    const cardsArray = await Promise.all(promises);
    const foundCard = cardsArray.find((x) => x.id === cardValue);

    return foundCard;
}

// This function 'locks' the card of the user who creates de request so that it cannot be used for other trades in parallel.
async function lockCard(issuerUserReference, foundCardIssuer) {
    const obtainingReference = database.collection('obtaining').where('user', '==', issuerUserReference)
                                                            .where('card', '==', foundCardIssuer.ref)
                                                            .where('locked', '==', false).limit(1);
    const obtainingSnapshot = await obtainingReference.get();
    
    const obtainingDocument = obtainingSnapshot.docs[0];

    obtainingDocument.ref.update({
        locked: true,
    });
}
