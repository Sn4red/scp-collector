const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } = require('discord.js');
const firebase = require('../../utils/firebase');

const database = firebase.firestore();

module.exports = {
    cooldown: 20,
    data: new SlashCommandBuilder()
        .setName('canceltrade')
        .setDescription('Cancels a specific trade request you have sent.')
        .addStringOption(option =>
            option.setName('request')
            .setDescription('Trade request ID to cancel.')
            .setRequired(true)),
    async execute(interaction) {
        // Notify the Discord API that the interaction was received successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply({ ephemeral: true });

        const userId = interaction.user.id;

        const userReference = database.collection('user').doc(userId);
        const userSnapshot = await userReference.get();

        if (userSnapshot.exists) {
            const tradeId = interaction.options.getString('request');

            const tradeReference = database.collection('trade').doc(tradeId);
            const tradeSnapshot = await tradeReference.get();

            if (tradeSnapshot.exists) {
                const tradeDocument = tradeSnapshot.data();

                if (tradeDocument.issuer == userId) {
                    const buttonsRow = displayButtons();

                    const reply = await interaction.editReply({
                        content: `⛔  Are you sure you want to cancel the trade request **\`${tradeSnapshot.id}\`**?`,
                        components: [buttonsRow],
                    });

                    const collectorFilter = (userInteraction) => userInteraction.user.id === tradeDocument.issuer;
                    const time = 1000 * 30;

                    const collector = reply.createMessageComponentCollector({ componentType: ComponentType.Button, filter: collectorFilter, time: time });

                    let deletedMessage = false;

                    collector.on('collect', async (button) => {
                        if (button.customId === 'confirm') {
                            deletedMessage = true;

                            // The card is searched for the user whom it belongs, and it is unlocked. After that, the trade document
                            // is deleted.
                            const obtainingReference = database.collection('obtaining').where('user', '==', userReference)
                                                                                    .where('card', '==', tradeDocument.issuerCard)
                                                                                    .where('locked', '==', true).limit(1);

                            const obtainingSnapshot = await obtainingReference.get();

                            const obtainingDocument = obtainingSnapshot.docs[0];

                            obtainingDocument.ref.update({
                                locked: false,
                            });

                            await database.collection('trade').doc(tradeSnapshot.id).delete();
                            
                            await interaction.followUp({ content: `✅  Trade >> **\`${tradeSnapshot.id}\`** << successfully canceled.`, ephemeral: true });
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
                    await interaction.editReply('❌  Error. You cannot cancel this trade because you are not the owner.');
                }
            } else {
                await interaction.editReply('❌  There is no trade with that ID!');
            }
        } else {
            await interaction.editReply('❌  You are not registered! Use /card to save your information.');
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
