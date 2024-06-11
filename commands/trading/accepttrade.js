const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } = require('discord.js');
const firebase = require('../../utils/firebase');

const database = firebase.firestore();

module.exports = {
    cooldown: 20,
    data: new SlashCommandBuilder()
        .setName('accepttrade')
        .setDescription('Accepts the request, and the trade is done.')
        .addStringOption(option =>
            option.setName('trade')
            .setDescription('Trade request ID to cancel.')
            .setRequired(true)),
    async execute(interaction) {
        // * Notify the Discord API that the interaction was received successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply({ ephemeral: true });

        const userId = interaction.user.id;

        const userReference = database.collection('user').doc(userId);
        const userSnapshot = await userReference.get();

        if (userSnapshot.exists) {
            const tradeId = interaction.options.getString('trade');

            const tradeReference = database.collection('trade').doc(tradeId);
            const tradeSnapshot = await tradeReference.get();

            if (tradeSnapshot.exists) {
                const tradeDocument = tradeSnapshot.data();

                if (tradeDocument.issuer === userId) {
                    if (!tradeDocument.tradeConfirmation) {
                        // * TODO: Implementar la logica de intercambio de cartas, no pero sin antes validar que haya pasado el cooldown de un minuto para poder aceptar el trade request.
                    } else {
                        await interaction.editReply('<a:error:1229592805710762128>  Error. The trade has already been made.');
                    }
                } else {
                    await interaction.editReply('<a:error:1229592805710762128>  Error. You cannot cancel this trade because you are not the owner.');
                }
            } else {
                await interaction.editReply('<a:error:1229592805710762128>  There is no trade with that ID!');
            }
        } else {
            await interaction.editReply('<a:error:1229592805710762128>  You are not registered! Use /`card` to start playing.');
        }
    },
};

function displayButtons() {
    const confirmButton = new ButtonBuilder()
        .setCustomId('confirm')
        .setLabel('Confirm')
        .setStyle(ButtonStyle.Danger);
    
    const cancelButton = new ButtonBuilder()
        .setCustomId('cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder();

    row.addComponents(cancelButton, confirmButton);

    return row;
}
