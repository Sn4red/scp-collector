const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } = require('discord.js');
const firebase = require('../../utils/firebase');

const database = firebase.firestore();

module.exports = {
    cooldown: 20,
    data: new SlashCommandBuilder()
        .setName('cancelartradeo')
        .setDescription('Cancela un tradeo en específico que hayas enviado.')
        .addStringOption(option =>
            option.setName('solicitud')
            .setDescription('ID solicitud del tradeo a cancelar.')
            .setRequired(true)),
    async execute(interaction) {
        // Notify the Discord API that the interaction was received successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply({ ephemeral: true });

        const userId = interaction.user.id;

        const userReference = database.collection('usuario').doc(userId);
        const userSnapshot = await userReference.get();

        if (userSnapshot.exists) {
            const tradeId = interaction.options.getString('solicitud');

            const tradeReference = database.collection('tradeo').doc(tradeId);
            const tradeSnapshot = await tradeReference.get();

            if (tradeSnapshot.exists) {
                const tradeDocument = tradeSnapshot.data();

                if (tradeDocument.emisor == userId) {
                    const buttonsRow = displayButtons();

                    const reply = await interaction.editReply({
                        content: `¿Estás seguro de cancelar la solicitud de tradeo **${tradeSnapshot.id}**?`,
                        components: [buttonsRow],
                    });

                    const collectorFilter = (userInteraction) => userInteraction.user.id === tradeDocument.emisor;
                    const time = 1000 * 30;

                    const collector = reply.createMessageComponentCollector({ componentType: ComponentType.Button, filter: collectorFilter, time: time });

                    let deletedMessage = false;

                    collector.on('collect', async (button) => {
                        if (button.customId === 'confirm') {
                            deletedMessage = true;

                            // The card is searched for the user whom it belongs, and it is unlocked. After that, the trade document
                            // is deleted.
                            const obtentionReference = database.collection('obtencion').where('usuario', '==', userReference)
                                                                                    .where('carta', '==', tradeDocument.cartaEmisor)
                                                                                    .where('lockeado', '==', true).limit(1);

                            const obtentionSnapshot = await obtentionReference.get();

                            const obtentionDocument = obtentionSnapshot.docs[0];

                            obtentionDocument.ref.update({
                                lockeado: false,
                            });

                            await database.collection('tradeo').doc(tradeSnapshot.id).delete();
                            
                            await interaction.followUp({ content: `Tradeo >> **${tradeSnapshot.id}** << cancelado con éxito.`, ephemeral: true });
                            await interaction.deleteReply();
                        }

                        if (button.customId === 'cancel') {
                            deletedMessage = true;

                            await interaction.deleteReply();
                        }
                    });

                    collector.on('end', async () => {
                        // Only the message is deleted through here if the user doesn't reply in the indicated time.
                        if (!deletedMessage) {
                            await interaction.deleteReply();
                        }
                    });
                } else {
                    await interaction.editReply('Error. No puedes cancelar este tradeo porque no eres el propietario.');
                }
            } else {
                await interaction.editReply('¡No existe un tradeo con esa ID!');
            }
        } else {
            await interaction.editReply('¡No estás registrado(a)! Usa /tarjeta para guardar tus datos.');
        }
    },
};

function displayButtons() {
    const confirmButton = new ButtonBuilder()
        .setCustomId('confirm')
        .setLabel('Confirmar')
        .setStyle(ButtonStyle.Danger);
    
    const cancelButton = new ButtonBuilder()
        .setCustomId('cancel')
        .setLabel('Cancelar')
        .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder();

    row.addComponents(cancelButton, confirmButton);

    return row;
}
