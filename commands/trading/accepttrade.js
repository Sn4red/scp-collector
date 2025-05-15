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
            .setDescription('Trade request ID to accept.')
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

        // ! If the user it's not the recipient of the trade request, returns an error message.
        if (tradeDocument.recipient !== userId) {
            await interaction.editReply(`${process.env.EMOJI_ERROR}  Error. You cannot accept this trade because it wasn't sent to you.`);
            return;
        }

        // ! If the trade request has already been confirmed, returns an error message.
        if (tradeDocument.tradeConfirmation) {
            await interaction.editReply(`${process.env.EMOJI_ERROR}  Error. The trade has already been made.`);
            return;
        }

        // * Using moment, the difference between the current date and the securityCooldown (trade) is calculated in minutes.
        const tradeDate = tradeDocument.securityCooldown.toDate();
        const currentDate = moment();
        const diffMinutes = currentDate.diff(moment(tradeDate), 'minutes');

        if (diffMinutes < 1) {
            const cooldownDuration = 1;
            const futureTime = new Date(tradeDate.getTime() + cooldownDuration * 60000);
            const futureTimestamp = Math.round(futureTime.getTime() / 1000);

            await interaction.editReply(`${process.env.EMOJI_ERROR}  This trade has been created recently. You can accept it <t:${futureTimestamp}:R>.  ${process.env.BIT_CLOCK}`);
            return;
        }

        const buttonsRow = displayButtons();

        const reply = await interaction.editReply({
            content: `${process.env.EMOJI_STOP}  Are you sure you want to accept the trade request **\`${tradeSnapshot.id}\`**?`,
            components: [buttonsRow],
        });

        const collectorFilter = (userInteraction) => userInteraction.user.id === tradeDocument.recipient;
        const time = 1000 * 30;

        const collector = reply.createMessageComponentCollector({ componentType: ComponentType.Button, filter: collectorFilter, time: time });

        let deletedMessage = false;

        // * All errors inside the transaction are handled with user-defined exceptions, along with its corresponding error message.
        // * Because of this, when it comes with the deletion of the trade document for some errors (third and fourth), this is handled in the catch block,
        // * because the user-defined exceptions prevent the deletion to be comitted.
        collector.on('collect', async (button) => {
            if (button.customId === 'confirm') {
                deletedMessage = true;

                const errorMessage1 = `${process.env.EMOJI_ERROR}  Error. It seems that the trade has already been cancelled/declined.`;
                const errorMessage2 = `${process.env.EMOJI_ERROR}  Error. It seems that the trade has already been made.`;
                const errorMessage3 = `${process.env.EMOJI_ERROR}  Error. The user no longer have the card needed to proceed with the trade. The trade request was automatically cancelled.`;
                const errorMessage4 = `${process.env.EMOJI_ERROR}  Error. You no longer have the card needed to proceed with the trade. The trade request was automatically cancelled.`;

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

                        const foundCardIssuer = await findCard(tradeDocument.issuer, tradeDocument.issuerCard, tradeDocument.issuerHolographic, transaction);

                        // ! If the issuer no longer has the card needed to proceed with the trade, return an error message and the trade request is automatically cancelled.
                        if (!foundCardIssuer.wasFound) {
                            throw new Error(errorMessage3);
                        }

                        const foundCardRecipient = await findCard(tradeDocument.recipient, tradeDocument.recipientCard, tradeDocument.recipientHolographic, transaction);

                        // ! If the recipient no longer has the card needed to proceed with the trade, return an error message and the trade request is automatically cancelled.
                        if (!foundCardRecipient.wasFound) {
                            throw new Error(errorMessage4);
                        }

                        /**
                         * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
                         * * The command passes all validations and the operation is performed. *
                         * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
                         */

                        await cleaningPendingTrades(tradeDocument.issuer, tradeDocument.recipient, tradeDocument.issuerCard, tradeDocument.recipientCard, tradeDocument.issuerHolographic, tradeDocument.recipientHolographic, foundCardIssuer.obtainingCount, foundCardRecipient.obtainingCount, tradeId, transaction);

                        await sendCard(foundCardIssuer.obtainingReference, tradeDocument.recipient, tradeDocument.issuerCard, tradeDocument.issuerHolographic, transaction);
                        await sendCard(foundCardRecipient.obtainingReference, tradeDocument.issuer, tradeDocument.recipientCard, tradeDocument.recipientHolographic, transaction);

                        // * The trade is confirmed by updating some fields.
                        await transaction.update(tradeReference, {
                            tradeConfirmation: true,
                            tradeDate: new Date(),
                        });
                    });

                    await interaction.followUp({ content: `${process.env.EMOJI_CHECK}  Trade >> **\`${tradeSnapshot.id}\`** <<  was successfully completed!`, ephemeral: true });
                    await interaction.deleteReply();
                } catch (error) {
                    if (error.message.includes(errorMessage1) || error.message.includes(errorMessage2)) {
                        await interaction.followUp({ content: error.message, ephemeral: true });
                        await interaction.deleteReply();
                    } else if (error.message.includes(errorMessage3) || error.message.includes(errorMessage4)) {
                        await tradeReference.delete();

                        await interaction.followUp({ content: error.message, ephemeral: true });
                        await interaction.deleteReply();
                    } else {
                        console.log(`${new Date()} >>> *** ERROR: accepttrade.js *** by ${userId} (${interaction.user.username})`);
                        console.error(error);

                        await interaction.followUp({ content: `${process.env.EMOJI_ERROR}  An error has occurred while trying to accept the request. Please try again.`, ephemeral: true });
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

// * This function searches for the card through the user's collection.
async function findCard(userId, cardReference, holographic, transaction) {
    const obtainingReference = database.collection('user').doc(userId).collection('obtaining');
    let obtainingQuery = obtainingReference.where('card', '==', cardReference)
                                            .where('holographic', '==', holographic).limit(1);
    const obtainingSnapshot = await transaction.get(obtainingQuery);

    // * This query is to know how many repeated cards the user has, so in case there is only one, the function 'cleaningPendingTrades'
    // * is executed. 
    obtainingQuery = obtainingReference.where('card', '==', cardReference)
                                        .where('holographic', '==', holographic);
    const obtainingCountSnapshot = await transaction.get(obtainingQuery.count());
    const SCPCount = obtainingCountSnapshot.data().count;

    if (!obtainingSnapshot.empty) {
        return {
            wasFound: true,
            obtainingReference: obtainingSnapshot.docs[0].ref,
            obtainingCount: SCPCount,
        };
    } else {
        return { wasFound: false };
    }
}

// * This function 'sends' the card to the other user and deletes its own.
async function sendCard(issuerObtainingReference, recipientId, cardReference, holographic, transaction) {
    // * The card is sent to the recipient.
    const obtainingEntry = database.collection('user').doc(recipientId).collection('obtaining').doc();

    await transaction.set(obtainingEntry, {
        card: cardReference,
        holographic: holographic,
    });

    // * The card is deleted from the issuer.
    await transaction.delete(issuerObtainingReference);
}

// * This function cleans up the pending trades that are no longer possible to complete, cause the user no longer has the necessary card for it.
async function cleaningPendingTrades(issuerId, recipientId, issuerCardReference, recipientCardReference, issuerHolographic, recipientHolographic, issuerObtainingCount, recipientObtainingCount, tradeId, transaction) {
    const pendingTradesReference = database.collection('trade');

    let issuerIssuerPendingTradesSnapshot = null;
    let issuerRecipientPendingTradesSnapshot = null;

    let recipientIssuerPendingTradesSnapshot = null;
    let recipientRecipientPendingTradesSnapshot = null;

    // * If the user has only one card, the pending trades which involve that card and the user are searched.
    if (issuerObtainingCount === 1) {
        const issuerPendingTradesQuery = pendingTradesReference.where('issuer', '==', issuerId)
                                                                .where('issuerCard', '==', issuerCardReference)
                                                                .where('issuerHolographic', '==', issuerHolographic)
                                                                .where('tradeConfirmation', '==', false);
        
        const recipientPendingTradesQuery = pendingTradesReference.where('recipient', '==', issuerId)
                                                                .where('recipientCard', '==', issuerCardReference)
                                                                .where('recipientHolographic', '==', issuerHolographic)
                                                                .where('tradeConfirmation', '==', false);

        issuerIssuerPendingTradesSnapshot = await transaction.get(issuerPendingTradesQuery);
        issuerRecipientPendingTradesSnapshot = await transaction.get(recipientPendingTradesQuery);
    }

    if (recipientObtainingCount === 1) {
        const issuerPendingTradesQuery = pendingTradesReference.where('issuer', '==', recipientId)
                                                                .where('issuerCard', '==', recipientCardReference)
                                                                .where('issuerHolographic', '==', recipientHolographic)
                                                                .where('tradeConfirmation', '==', false);

        const recipientPendingTradesQuery = pendingTradesReference.where('recipient', '==', recipientId)
                                                                    .where('recipientCard', '==', recipientCardReference)
                                                                    .where('recipientHolographic', '==', recipientHolographic)
                                                                    .where('tradeConfirmation', '==', false);

        recipientIssuerPendingTradesSnapshot = await transaction.get(issuerPendingTradesQuery);
        recipientRecipientPendingTradesSnapshot = await transaction.get(recipientPendingTradesQuery);
    }
    
    // * If found, the pending trades are deleted.
    // * The nested ifs are used to avoid deleting our trade document.
    if (issuerIssuerPendingTradesSnapshot) {
        issuerIssuerPendingTradesSnapshot.forEach(async (trade) => {
            if (trade.id === tradeId) {
                return;
            }

            await transaction.delete(trade.ref);
        });
    }

    if (issuerRecipientPendingTradesSnapshot) {
        issuerRecipientPendingTradesSnapshot.forEach(async (trade) => {
            if (trade.id === tradeId) {
                return;
            }

            await transaction.delete(trade.ref);
        });
    }
    
    if (recipientIssuerPendingTradesSnapshot) {
        recipientIssuerPendingTradesSnapshot.forEach(async (trade) => {
            if (trade.id === tradeId) {
                return;
            }

            await transaction.delete(trade.ref);
        });
    }

    if (recipientRecipientPendingTradesSnapshot) {
        recipientRecipientPendingTradesSnapshot.forEach(async (trade) => {
            if (trade.id === tradeId) {
                return;
            }

            await transaction.delete(trade.ref);
        });
    }
}
