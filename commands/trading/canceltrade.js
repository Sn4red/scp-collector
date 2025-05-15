const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } = require('discord.js');
const firebase = require('../../utils/firebase');

const database = firebase.firestore();

module.exports = {
    cooldown: 20,
    data: new SlashCommandBuilder()
        .setName('canceltrade')
        .setDescription('Cancels a specific trade request you have sent.')
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

        // ! If the user is not registered, returns an error message.
        if (!userSnapshot.exists) {
            await interaction.editReply(`${process.env.EMOJI_ERROR}  You are not registered! Use /\`card\` to start playing.`);
            return;
        }
        
        // * Some extra validation is performed here, according to the Firestore's documents ID requirements.
        const tradeId = interaction.options.getString('trade');
        const tradeIdValidation = /^(?!\.\.?$)(?!.*__.*__)([^/]{1,1500})$/.test(tradeId);

        // ! If the field has wrong data, returns an error message.
        if (!tradeIdValidation) {
            await interaction.editReply(`${process.env.EMOJI_ERROR}  Error. Please, provide a valid trade ID.`);
            return;
        }

        const tradeReference = database.collection('trade').doc(tradeId);
        const tradeSnapshot = await tradeReference.get();

        // ! If the trade ID provided does not exist, returns an error message.
        if (!tradeSnapshot.exists) {
            await interaction.editReply(`${process.env.EMOJI_ERROR}  There is no trade with that ID!`);
            return;
        }

        const tradeDocument = tradeSnapshot.data();

        // ! If the user didn't create the trade request, returns an error message.
        if (tradeDocument.issuer !== userId) {
            await interaction.editReply(`${process.env.EMOJI_ERROR}  Error. You cannot cancel this trade because you are not the owner.`);
            return;
        }

        // ! If the trade request has already been confirmed, returns an error message.
        if (tradeDocument.tradeConfirmation) {
            await interaction.editReply(`${process.env.EMOJI_ERROR}  Error. The trade has already been made.`);
            return;
        }

        const buttonsRow = displayButtons();

        const reply = await interaction.editReply({
            content: `${process.env.EMOJI_STOP}  Are you sure you want to cancel the trade request **\`${tradeSnapshot.id}\`**?`,
            components: [buttonsRow],
        });

        const collectorFilter = (userInteraction) => userInteraction.user.id === tradeDocument.issuer;
        const time = 1000 * 30;

        const collector = reply.createMessageComponentCollector({ componentType: ComponentType.Button, filter: collectorFilter, time: time });

        let deletedMessage = false;

        // * All errors inside the transaction are handled with user-defined exceptions, along with its corresponding error message.
        collector.on('collect', async (button) => {
            if (button.customId === 'confirm') {
                deletedMessage = true;

                const errorMessage1 = `${process.env.EMOJI_ERROR}  Error. It seems that the trade has already been cancelled/declined.`;
                const errorMessage2 = `${process.env.EMOJI_ERROR}  Error. It seems that the trade has already been made.`;

                try {
                    await database.runTransaction(async (transaction) => {
                        const newTradeSnapshot = await transaction.get(tradeReference);

                        // ! If the trade request has already been cancelled/declined during the transaction, returns an error message.
                        if (!newTradeSnapshot.exists) {
                            throw new Error(errorMessage1);
                        }

                        // ! If the trade request has already been confirmed during the transaction, returns an error message.
                        if (tradeSnapshot.data().tradeConfirmation !== newTradeSnapshot.data().tradeConfirmation) {
                            throw new Error(errorMessage2);
                        }

                        /**
                         * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
                         * * The command passes all validations and the operation is performed. *
                         * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
                         */

                        await transaction.delete(tradeReference);
                    });

                    await interaction.followUp({ content: `${process.env.EMOJI_CHECK}  Trade >> **\`${tradeSnapshot.id}\`** << successfully cancelled. ${process.env.EMOJI_TRASH}`, ephemeral: true });
                    await interaction.deleteReply();
                } catch (error) {
                    if (error.message.includes(errorMessage1) || error.message.includes(errorMessage2)) {
                        await interaction.followUp({ content: error.message, ephemeral: true });
                        await interaction.deleteReply();
                    } else {
                        console.log(`${new Date()} >>> *** ERROR: canceltrade.js *** by ${userId} (${interaction.user.username})`);
                        console.error(error);

                        await interaction.followUp({ content: `${process.env.EMOJI_ERROR}  An error has occurred while trying to cancel the request. Please try again.`, ephemeral: true });
                    }
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
