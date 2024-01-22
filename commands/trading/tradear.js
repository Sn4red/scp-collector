const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const firebase = require('../../utils/firebase');

const database = firebase.firestore();

module.exports = {
    cooldown: 60,
    data: new SlashCommandBuilder()
        .setName('tradear')
        .setDescription('Crea una petición de tradeo directa a un usuario.'),
    async execute(interaction) {
        const userId = interaction.user.id;

        const issuerUserReference = database.collection('usuario').doc(userId);
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
                        const recipientUserReference = database.collection('usuario').doc(recipientValue);
                        const recipientUserSnapshot = await recipientUserReference.get();

                        if (recipientUserSnapshot.exists) {
                            const foundCardRecipient = await findCard(recipientUserReference, fieldsValidation.fixedRecipientCardValue);

                            if (foundCardRecipient) {
                                const tradeEntry = database.collection('tradeo').doc();
                                
                                await tradeEntry.set({
                                    cartaEmisor: foundCardIssuer.ref,
                                    cartaReceptor: foundCardRecipient.ref,
                                    confirmacionTradeo: false,
                                    cooldownSeguridad: new Date(),
                                    emisor: userId,
                                    fechaTradeo: null,
                                    receptor: recipientValue,
                                });

                                lockCard(issuerUserReference, foundCardIssuer);

                                modalInteraction.editReply(`✅  Solicitud de tradeo enviada con el ID **\`${tradeEntry.id}\`**. Puedes usar el mismo ID para cancelar la solicitud.`);
                            } else {
                                modalInteraction.editReply('❌  Solicitud cancelada ¡Parece que el usuario no tiene la carta que quieres o está lockeada!');
                            }
                        } else {
                            modalInteraction.editReply('❌  Solicitud cancelada. El usuario con el que intentas tradear todavía no está registrado o no se ha encontrado.');
                        }
                    } else {
                        modalInteraction.editReply('❌  Solicitud cancelada ¡Parece que no tienes la carta que estás ofreciendo o está lockeada!');
                    }
                } else {
                    modalInteraction.editReply(fieldsValidation.errorMessage);
                }
            }).catch((error) => {
                console.log(`Error: ${error}`);

                interaction.followUp({ content: '❌  Solicitud cancelada debido a la inactividad.', ephemeral: true });
            });
        } else {
            await interaction.reply({ content: '❌  ¡No estás registrado(a)! Usa /tarjeta para guardar tus datos.', ephemeral: true });
        }
    },
};

// Function that builds the modal.
function displayModal(idUsuario) {
    const modal = new ModalBuilder()
        .setCustomId(`modal-${idUsuario}`)
        .setTitle('Solicitud de Tradeo  📑');
        
    const txtRecipient = new TextInputBuilder()
        .setCustomId('txtRecipient')
        .setLabel('Usuario:')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('123456789')
        .setRequired(true);

    const txtIssuerCard = new TextInputBuilder()
        .setCustomId('txtIssuerCard')
        .setLabel('Carta a ofrecer:')
        .setStyle(TextInputStyle.Short)
        .setMinLength(7)
        .setMaxLength(8)
        .setPlaceholder('SCP-000')
        .setRequired(true);
        
    const txtRecipientCard = new TextInputBuilder()
        .setCustomId('txtRecipientCard')
        .setLabel('Carta deseada:')
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
    
    let errorMessage = '❌  Los siguientes datos fueron ingresados incorrectamente:\n';
    let errorState = false;

    if (!recipientValidation) {
        errorMessage += '▫️ ID usuario\n';
        errorState = true;
    }
    
    if (!issuerCardValidation) {
        errorMessage += '▫️ Carta ofrecida\n';
        errorState = true;
    }

    if (!recipientCardValidation) {
        errorMessage += '▫️ Carta deseada';
        errorState = true;
    }

    return { fixedIssuerCardValue, fixedRecipientCardValue, errorState, errorMessage };
}

// This function searches for a card from a user that is not 'locked'.
async function findCard(userReference, cardValue) {
    const obtentionReference = database.collection('obtencion').where('usuario', '==', userReference).where('lockeado', '==', false);
    const obtentionSnapshot = await obtentionReference.get();

    const promises = [];
    
    for (const x of obtentionSnapshot.docs) {
        const obtention = x.data();
        const cardReference = obtention.carta;
        const cardSnapshot = cardReference.get();

        promises.push(cardSnapshot);
    }

    const cardsArray = await Promise.all(promises);
    const foundCard = cardsArray.find((x) => x.id === cardValue);

    return foundCard;
}

// This function 'locks' the card of the user who creates de request so that it cannot be used for other trades in parallel.
async function lockCard(issuerUserReference, foundCardIssuer) {
    const obtentionReference = database.collection('obtencion').where('usuario', '==', issuerUserReference)
                                                            .where('carta', '==', foundCardIssuer.ref)
                                                            .where('lockeado', '==', false).limit(1);
    const obtentionSnapshot = await obtentionReference.get();
    
    const obtentionDocument = obtentionSnapshot.docs[0];

    obtentionDocument.ref.update({
        lockeado: true,
    });
}
