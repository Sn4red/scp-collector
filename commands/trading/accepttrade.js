const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } = require('discord.js');
const firebase = require('../../utils/firebase');
const moment = require('moment');

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

                if (tradeDocument.recipient === userId) {
                    if (!tradeDocument.tradeConfirmation) {
                        // * Using moment, the difference between the current date and the securityCooldown (trade) is calculated in minutes.
                        const tradeDate = tradeDocument.securityCooldown.toDate();
                        const currentDate = moment();
                        const diffMinutes = currentDate.diff(moment(tradeDate), 'minutes');

                        if (diffMinutes >= 1) {
                            const buttonsRow = displayButtons();

                            const reply = await interaction.editReply({
                                content: `<a:stop:1243398806402240582>  Are you sure you want to accept the trade request **\`${tradeSnapshot.id}\`**?`,
                                components: [buttonsRow],
                            });

                            const collectorFilter = (userInteraction) => userInteraction.user.id === tradeDocument.recipient;
                            const time = 1000 * 30;

                            const collector = reply.createMessageComponentCollector({ componentType: ComponentType.Button, filter: collectorFilter, time: time });

                            let deletedMessage = false;
                            let transactionState = true;

                            // * The return statements are used to get out of the collector event.
                            collector.on('collect', async (button) => {
                                if (button.customId === 'confirm') {
                                    deletedMessage = true;

                                    try {
                                        await database.runTransaction(async (transaction) => {
                                            const newTradeSnapshot = await transaction.get(tradeReference);

                                            if (!newTradeSnapshot.exists) {
                                                await interaction.followUp({ content: '<a:error:1229592805710762128>  Error. It seems that the trade has already been cancelled/declined.', ephemeral: true });
                                                await interaction.deleteReply();
    
                                                return;
                                            }

                                            if (tradeSnapshot.data().tradeConfirmation !== newTradeSnapshot.data().tradeConfirmation) {
                                                await interaction.followUp({ content: '<a:error:1229592805710762128>  Error. It seems that the trade has already been made.', ephemeral: true });
                                                await interaction.deleteReply();
    
                                                return;
                                            }

                                            const foundCardIssuer = await findCard(tradeDocument.issuer, tradeDocument.issuerCard, tradeDocument.issuerHolographic, transaction);

                                            if (!foundCardIssuer.wasFound) {
                                                await transaction.delete(tradeReference);

                                                await interaction.followUp({ content: '<a:error:1229592805710762128>  Error. The user no longer have the card needed to proceed with the trade. The trade request was automatically cancelled.', ephemeral: true });
                                                await interaction.deleteReply();

                                                return;
                                            }

                                            const foundCardRecipient = await findCard(tradeDocument.recipient, tradeDocument.recipientCard, tradeDocument.recipientHolographic, transaction);

                                            if (!foundCardRecipient.wasFound) {
                                                await transaction.delete(tradeReference);

                                                await interaction.followUp({ content: '<a:error:1229592805710762128>  Error. You no longer have the card needed to proceed with the trade. The trade request was automatically cancelled.', ephemeral: true });
                                                await interaction.deleteReply();

                                                return;
                                            }

                                            await sendCard(foundCardIssuer.obtentionReference, tradeDocument.recipient, tradeDocument.issuerCard, tradeDocument.issuerHolographic, transaction);
                                            await sendCard(foundCardRecipient.obtentionReference, tradeDocument.issuer, tradeDocument.recipientCard, tradeDocument.recipientHolographic, transaction);

                                            // * The trade is confirmed by updating some fields.
                                            await transaction.update(tradeReference, {
                                                tradeConfirmation: true,
                                                tradeDate: new Date(),
                                            });
                                        });
                                    } catch (error) {
                                        console.error(error);

                                        transactionState = false;

                                        await interaction.followUp({ content: '<a:error:1229592805710762128>  An error has occurred while trying to accept the request. Please try again.', ephemeral: true });
                                    }

                                    if (transactionState) {
                                        try {
                                            await database.runTransaction(async (transaction) => {
                                                // * This function is used for each user involved in the trade to clean up (delete) the pending trades that are no longer possible to complete,
                                                // * if they no longer have the necessary cards.
                                                await cleaningPendingTrades(tradeDocument.issuer, tradeDocument.issuerCard, tradeDocument.issuerHolographic, transaction);
                                                await cleaningPendingTrades(tradeDocument.recipient, tradeDocument.recipientCard, tradeDocument.recipientHolographic, transaction);

                                                await interaction.followUp({ content: `<a:check:1235800336317419580>  Trade >> **\`${tradeSnapshot.id}\`** <<  was successfully completed!`, ephemeral: true });
                                                await interaction.deleteReply();
                                            });
                                        } catch (error) {
                                            console.error(error);

                                            await interaction.followUp({ content: '<a:error:1229592805710762128>  An error has occurred while trying to accept the request. Please try again.', ephemeral: true });
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
                        } else {
                            const cooldownDuration = 1;
                            const futureTime = new Date(tradeDate.getTime() + cooldownDuration * 60000);
                            const futureTimestamp = Math.round(futureTime.getTime() / 1000);

                            await interaction.editReply(`<a:error:1229592805710762128>  This trade has been created recently. You can accept it <t:${futureTimestamp}:R>.  <a:bit_clock:1240110707295387718>`);
                        }
                    } else {
                        await interaction.editReply('<a:error:1229592805710762128>  Error. The trade has already been made.');
                    }
                } else {
                    await interaction.editReply('<a:error:1229592805710762128>  Error. You cannot accept this trade because it wasn\'t sent to you.');
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

async function findCard(userId, cardReference, holographic, transaction) {
    const obtentionReference = database.collection('user').doc(userId).collection('obtaining');
    const obtentionQuery = obtentionReference.where('card', '==', cardReference)
                                                .where('holographic', '==', holographic).limit(1);
    const obtentionSnapshot = await transaction.get(obtentionQuery);

    if (!obtentionSnapshot.empty) {
        return {
            wasFound: true,
            obtentionReference: obtentionSnapshot.docs[0].ref,
        };
    } else {
        return { wasFound: false };
    }
}

async function sendCard(issuerObtentionReference, recipientId, cardReference, holographic, transaction) {
    // * The card is sent to the recipient.
    const obtainingEntry = database.collection('user').doc(recipientId).collection('obtaining').doc();

    await transaction.set(obtainingEntry, {
        card: cardReference,
        holographic: holographic,
    });

    // * The card is deleted from the issuer.
    await transaction.delete(issuerObtentionReference);
}

async function cleaningPendingTrades(userId, cardReference, holographic, transaction) {
    // * The card is searched in the user's collection.
    const foundCard = await findCard(userId, cardReference, holographic, transaction);

    // * If found, nothing happens.
    if (foundCard.wasFound) {
        return;
    }

    // * If the card is not found, the pending trades that the user is involved in are searched and deleted.
    const pendingTradesReference = database.collection('trade');

    const issuerPendingTradesQuery = pendingTradesReference.where('issuer', '==', userId)
                                                            .where('issuerCard', '==', cardReference)
                                                            .where('issuerHolographic', '==', holographic)
                                                            .where('tradeConfirmation', '==', false);

    const recipientPendingTradesQuery = pendingTradesReference.where('recipient', '==', userId)
                                                                .where('recipientCard', '==', cardReference)
                                                                .where('recipientHolographic', '==', holographic)
                                                                .where('tradeConfirmation', '==', false);

    const issuerPendingTradesSnapshot = await transaction.get(issuerPendingTradesQuery);
    const recipientPendingTradesSnapshot = await transaction.get(recipientPendingTradesQuery);

    issuerPendingTradesSnapshot.forEach(async (trade) => {
        await transaction.delete(trade.ref);
    });

    recipientPendingTradesSnapshot.forEach(async (trade) => {
        await transaction.delete(trade.ref);
    });
}
