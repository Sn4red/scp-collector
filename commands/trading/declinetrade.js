const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } = require('discord.js');
const firebase = require('../../utils/firebase');

const database = firebase.firestore();

module.exports = {
    cooldown: 20,
    data: new SlashCommandBuilder()
        .setName('declinetrade')
        .setDescription('Declines a trade offer.')
        .addStringOption(option =>
            option.setName('trade')
                .setDescription('Trade request ID to decline.')
                .setRequired(true)),
    async execute(interaction) {
        // * Notify the Discord API that the interaction was received successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply({ ephemeral: true });

        const userId = interaction.user.id;

        const userReference = database.collection('user').doc(userId);
        const userSnapshot = await userReference.get();

        // ! If the user is not registered, returns an error message.
        if (!userSnapshot.exists) {
            await interaction.editReply('<a:error:1229592805710762128>  You are not registered! Use /`card` to start playing.');
            return;
        }

        // * Some extra validation is performed here, according to the Firestore's documents ID requirements.
        const tradeId = interaction.options.getString('trade');
        const tradeIdValidation = /^(?!\.\.?$)(?!.*__.*__)([^/]{1,1500})$/.test(tradeId);

        // ! If the field has wrong data, returns an error message.
        if (!tradeIdValidation) {
            await interaction.editReply('<a:error:1229592805710762128>  Error. Please, provide a valid trade ID.');
            return;
        }

        const tradeReference = database.collection('trade').doc(tradeId);
        const tradeSnapshot = await tradeReference.get();

        // ! If the trade ID provided does not exist, returns an error message.
        if (!tradeSnapshot.exists) {
            await interaction.editReply('<a:error:1229592805710762128>  There is no trade with that ID!');
            return;
        }

        const tradeDocument = tradeSnapshot.data();
        
        // ! If the user it's not the recipient of the trade request, returns an error message.
        if (tradeDocument.recipient !== userId) {
            await interaction.editReply('<a:error:1229592805710762128>  Error. You cannot decline this trade because it wasn\'t sent it to you.');
            return;
        }

        // ! If the trade request has already been confirmed, returns an error message.
        if (tradeDocument.tradeConfirmation) {
            await interaction.editReply('<a:error:1229592805710762128>  Error. The trade has already been made.');
            return;
        }

        const buttonsRow = displayButtons();

        const issuerReference = database.collection('user').doc(tradeDocument.issuer);
        const issuerSnapshot = await issuerReference.get();
        const issuerDocument = issuerSnapshot.data();
        const issuerNickname = issuerDocument.nickname;

        const reply = await interaction.editReply({
            content: `<a:stop:1243398806402240582>  Are you sure you want to decline the trade request **\`${tradeSnapshot.id}\`** from \`${issuerNickname}\`?`,
            components: [buttonsRow],
        });

        const collectorFilter = (userInteraction) => userInteraction.user.id === tradeDocument.recipient;
        const time = 1000 * 30;

        const collector = reply.createMessageComponentCollector({ componentType: ComponentType.Button, filter: collectorFilter, time: time });

        let deletedMessage = false;

        // * The return statements are used to get out of the collector event.
        collector.on('collect', async (button) => {
            if (button.customId === 'confirm') {
                deletedMessage = true;

                try {
                    await database.runTransaction(async (transaction) => {
                        const newTradeSnapshot = await transaction.get(tradeReference);

                        // ! If the trade request has already been cancelled/declined during the transaction, returns an error message.
                        if (!newTradeSnapshot.exists) {
                            await interaction.followUp({ content: '<a:error:1229592805710762128>  Error. It seems that the trade has already been cancelled/declined.', ephemeral: true });
                            await interaction.deleteReply();

                            return;
                        }

                        // ! If the trade request has already been confirmed during the transaction, returns an error message.
                        if (tradeSnapshot.data().tradeConfirmation !== newTradeSnapshot.data().tradeConfirmation) {
                            await interaction.followUp({ content: '<a:error:1229592805710762128>  Error. It seems that the trade has already been made.', ephemeral: true });
                            await interaction.deleteReply();

                            return;
                        }

                        /**
                         * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
                         * * The command passes all validations and the operation is performed. *
                         * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
                         */

                        await transaction.delete(tradeReference);
                    });

                    await interaction.followUp({ content: `<a:check:1235800336317419580>  Trade >> **\`${tradeSnapshot.id}\`** << was declined. <a:trash:1247734945552531628>`, ephemeral: true });
                    await interaction.deleteReply();
                } catch (error) {
                    console.log(`${new Date()} >>> *** ERROR: declinetrade.js *** by ${userId} (${interaction.user.username})`);
                    console.error(error);

                    await interaction.followUp({ content: '<a:error:1229592805710762128>  An error has occurred while trying to decline the request. Please try again.', ephemeral: true });
                }
            }

            if (button.customId === 'cancel') {
                deletedMessage = true;

                await interaction.deleteReply();
            }
        });

        collector.on('end', async () => {
            // * Only the message is deleted through here if the user doesn't reply in the indicated time.
            if (!deletedMessage) {
                await interaction.deleteReply();
            }
        });
    },
};

// * This function displays the 'confirm' and 'cancel' buttons.
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
