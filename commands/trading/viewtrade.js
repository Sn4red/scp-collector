const {
    SlashCommandBuilder,
    MessageFlags,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ContainerBuilder,
    ComponentType,
 } = require('discord.js');
const firebase = require('../../utils/firebase');
const moment = require('moment');

const database = firebase.firestore();

module.exports = {
    cooldown: 30,
    data: new SlashCommandBuilder()
        .setName('viewtrade')
        .setDescription(
            'Displays the details of a trade, where you can accept, decline ' +
                'or cancel it.',
        )
        .addStringOption(option =>
            option.setName('trade')
                .setDescription('Trade request ID to inquire about.')
                .setRequired(true)),
    async execute(interaction) {
        // * Notify the Discord API that the interaction was received
        // * successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply({
            flags: [MessageFlags.Ephemeral],
        });

        const userId = interaction.user.id;

        const userReference = database.collection('user').doc(userId);
        const userSnapshot = await userReference.get();

        // ! If the user is not registered, returns an error message.
        if (!userSnapshot.exists) {
            const errorMessage = new TextDisplayBuilder()
                .setContent(
                    `${process.env.EMOJI_ERROR}  You are not registered! ` +
                        'Use /`card` to start playing.',
                );

            await interaction.editReply({
                components: [errorMessage],
                flags: [MessageFlags.IsComponentsV2],
            });
            return;
        }

        // * Some extra validation is performed here, according to the
        // * Firestore's documents ID requirements.
        const tradeId = interaction.options.getString('trade');
        const tradeIdValidation = /^(?!\.\.?$)(?!.*__.*__)([^/]{1,1500})$/
            .test(tradeId);

        // ! If the field has wrong data or enters the test trade ID, return an
        // ! error message.
        if (!tradeIdValidation || tradeId === 'testTradeDocument') {
            const errorMessage = new TextDisplayBuilder()
                .setContent(
                    `${process.env.EMOJI_ERROR}  Error. Please, provide a ` +
                        'valid trade ID.',
                );

            await interaction.editReply({
                components: [errorMessage],
                flags: [MessageFlags.IsComponentsV2],
            });
            return;
        }

        const tradeReference = database.collection('trade').doc(tradeId);
        const tradeSnapshot = await tradeReference.get();

        // ! If the trade ID provided does not exist, returns an error message.
        if (!tradeSnapshot.exists) {
            const errorMessage = new TextDisplayBuilder()
                .setContent(
                    `${process.env.EMOJI_ERROR}  There is no trade with that ` +
                        'ID!',
                );

            await interaction.editReply({
                components: [errorMessage],
                flags: [MessageFlags.IsComponentsV2],
            });
            return;
        }

        /**
         * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
         * * The command passes all validations and the operation is performed.*
         * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
         */

        const tradeDocument = tradeSnapshot.data();

        const tradeObject = await formattingValues(tradeDocument);

        const issuerCardName = limitCardName(tradeObject.issuerCardName);
        const recipientCardName = limitCardName(tradeObject.recipientCardName);

        // * The trade container is created.
        const tradeContainer = createTradeContainer(
            tradeSnapshot.id,
            tradeObject,
            issuerCardName,
            recipientCardName,
            userId,
        );

        const reply = await interaction.editReply({
            components: [tradeContainer],
            flags: [MessageFlags.IsComponentsV2],
        });

        // * Although the reply is ephemeral and only the command executor can
        // * interact with it, this filter is kept for security purposes and
        // * code clarity.
        const collectorFilter = (userInteraction) =>
            userInteraction.user.id === userId;
        // * The time is set to 20 seconds. Less time than the command cooldown,
        // * so the user can't spawn more than 1 collector at the same time,
        // * which could cause glitches.
        const time = 1000 * 20;

        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: collectorFilter,
            time: time,
        });

        let deletedMessage = false;

        // * All errors inside the transactions are handled with user-defined
        // * exceptions, along with its corresponding error message.
        collector.on('collect', async (button) => {
            // * Validates the button interaction so it prevents unexpected
            // * errors (it basically makes sure that the buttons was actually
            // * clicked).
            if (!button) {
                return;
            }

            // * Interaction is acknowledged to prevent the interaction timeout.
            button.deferUpdate();

            // * Validates that the button clicked is one of the actions buttons
            // * (there is just 3 buttons, but it clarifies the intention).
            if (button.customId !== 'btnCancel' &&
                button.customId !== 'btnConfirm' &&
                button.customId !== 'btnDecline') {
                return;
            }

            if (button.customId === 'btnCancel') {
                deletedMessage = true;

                const errorMessage1 =
                    `${process.env.EMOJI_ERROR}  Error. It seems that the ` +
                        'trade has already been cancelled/declined.';
                const errorMessage2 =
                    `${process.env.EMOJI_ERROR}  Error. It seems that the ` +
                    'trade has already been made.';

                try {
                    await database.runTransaction(async (transaction) => {
                        const newTradeSnapshot = await transaction
                            .get(tradeReference);

                        // ! If the trade request has already been
                        // ! cancelled/declined during the transaction, returns
                        // ! an error message.
                        if (!newTradeSnapshot.exists) {
                            throw new Error(errorMessage1);
                        }

                        // ! If the trade request has already been confirmed
                        // ! during the transaction, returns an error message.
                        if (tradeSnapshot.data().tradeConfirmation !==
                            newTradeSnapshot.data().tradeConfirmation) {

                            throw new Error(errorMessage2);
                        }

                        /**
                         * * * * * * * * * * * * * * * * * * * * * * * * * * * *
                         * * The command passes all validations and the * * * *
                         * * operation is performed. * * * * * * * * * * * * * *
                         * * * * * * * * * * * * * * * * * * * * * * * * * * * *
                         */

                        await transaction.delete(tradeReference);
                    });

                    const message = new TextDisplayBuilder()
                        .setContent(
                            `${process.env.EMOJI_CHECK}  Trade >> ` +
                                `**\`${tradeSnapshot.id}\`** << successfully ` +
                                `cancelled. ${process.env.EMOJI_TRASH}`,
                        );

                    await interaction.followUp({
                        components: [message],
                        flags: [
                            MessageFlags.IsComponentsV2,
                            MessageFlags.Ephemeral,
                        ],
                    });

                    await interaction.deleteReply();
                } catch (error) {
                    if (error.message.includes(errorMessage1) ||
                        error.message.includes(errorMessage2)) {

                        const errorMessage = new TextDisplayBuilder()
                            .setContent(error.message);

                        await interaction.followUp({
                            components: [errorMessage],
                            flags: [
                                MessageFlags.IsComponentsV2,
                                MessageFlags.Ephemeral,
                            ],
                        });

                        await interaction.deleteReply();
                    } else {
                        console.log(
                            `${new Date()} >>> *** ERROR: viewtrade.js ` +
                                `(CANCEL) *** by ${userId} ` +
                                `(${interaction.user.username})`,
                        );
                        console.error(error);

                        const errorMessage = new TextDisplayBuilder()
                            .setContent(
                                `${process.env.EMOJI_ERROR}  An error has ` +
                                    'occurred while trying to cancel the ' +
                                    'request. Please try again.',
                            );

                        await interaction.followUp({
                            components: [errorMessage],
                            flags: [
                                MessageFlags.IsComponentsV2,
                                MessageFlags.Ephemeral,
                            ],
                        });

                        await interaction.deleteReply();
                    }
                }
            }

            if (button.customId === 'btnConfirm') {
                deletedMessage = true;

                // * Calculates cooldown end time (1 minute after creation) to
                // * display it in 'errorMessage1'.
                const tradeDate = tradeDocument.securityCooldown.toDate();
                const cooldownDuration = 1;
                const futureTime = new Date(
                    tradeDate.getTime() + cooldownDuration * 60000,
                );
                const futureTimestamp = Math.round(futureTime.getTime() / 1000);

                const errorMessage1 =
                    `${process.env.EMOJI_ERROR}  This trade has been created ` +
                        'recently. You can accept it ' +
                        `<t:${futureTimestamp}:R>.  ` +
                        `${process.env.EMOJI_BIT_CLOCK}`;
                const errorMessage2 =
                    `${process.env.EMOJI_ERROR}  Error. It seems that the ` +
                        'trade has already been cancelled/declined.';
                const errorMessage3 =
                    `${process.env.EMOJI_ERROR}  Error. It seems that the ` +
                        'trade has already been made.';
                const errorMessage4 =
                    `${process.env.EMOJI_ERROR}  Error. The user no longer ` +
                        'have the card needed to proceed with the trade. The ' +
                        'trade request was automatically cancelled.';
                const errorMessage5 =
                    `${process.env.EMOJI_ERROR}  Error. You no longer have ` +
                        'the card needed to proceed with the trade. The ' +
                        'trade request was automatically cancelled.';

                try {
                    await database.runTransaction(async (transaction) => {
                        const newTradeSnapshot = await transaction
                            .get(tradeReference);

                        // * Using moment, the difference between the current
                        // * date and the securityCooldown (trade) is calculated
                        // * in minutes.
                        const currentDate = moment();
                        const diffMinutes = currentDate.diff(
                            moment(tradeDate),
                            'minutes',
                        );

                        // ! If the trade request has less than 1 minute that
                        // ! has been created, returns an error message.
                        if (diffMinutes < 1) {
                            throw new Error(errorMessage1);
                        }

                        // ! If the trade request has already been
                        // ! cancelled/declined during the transaction, returns
                        // ! an error message.
                        if (!newTradeSnapshot.exists) {
                            throw new Error(errorMessage2);
                        }

                        // ! If the trade request has already been confirmed
                        // ! during the transaction, returns an error message.
                        if (tradeSnapshot.data().tradeConfirmation !==
                            newTradeSnapshot.data().tradeConfirmation) {

                            throw new Error(errorMessage3);
                        }

                        const foundCardIssuer = await findCard(
                            tradeDocument.issuer,
                            tradeDocument.issuerCard,
                            tradeDocument.issuerHolographic,
                            transaction,
                        );

                        // ! If the issuer no longer has the card needed to
                        // ! proceed with the trade, return an error message and
                        // ! the trade request is automatically cancelled.
                        if (!foundCardIssuer.wasFound) {
                            throw new Error(errorMessage4);
                        }

                        const foundCardRecipient = await findCard(
                            tradeDocument.recipient,
                            tradeDocument.recipientCard,
                            tradeDocument.recipientHolographic,
                            transaction,
                        );

                        // ! If the recipient no longer has the card needed to
                        // ! proceed with the trade, return an error message and
                        // ! the trade request is automatically cancelled.
                        if (!foundCardRecipient.wasFound) {
                            throw new Error(errorMessage5);
                        }

                        /**
                         * * * * * * * * * * * * * * * * * * * * * * * * * * * *
                         * * The command passes all validations and the * * * *
                         * * operation is performed. * * * * * * * * * * * * * *
                         * * * * * * * * * * * * * * * * * * * * * * * * * * * *
                         */

                        // * The pending trade requests from both users that
                        // * are not longer possible to accept, are deleted.
                        await cleaningPendingTrades(
                            tradeDocument.issuer,
                            tradeDocument.recipient,
                            tradeDocument.issuerCard,
                            tradeDocument.recipientCard,
                            tradeDocument.issuerHolographic,
                            tradeDocument.recipientHolographic,
                            foundCardIssuer.obtainingCount,
                            foundCardRecipient.obtainingCount,
                            tradeId, transaction,
                        );

                        // * The card is sent to the recipient.
                        await sendCard(
                            foundCardIssuer.obtainingReference,
                            tradeDocument.recipient,
                            tradeDocument.issuerCard,
                            tradeDocument.issuerHolographic,
                            transaction,
                        );

                        // * The card is sent to the issuer.
                        await sendCard(
                            foundCardRecipient.obtainingReference,
                            tradeDocument.issuer,
                            tradeDocument.recipientCard,
                            tradeDocument.recipientHolographic,
                            transaction,
                        );

                        // * The trade is confirmed by updating some fields.
                        await transaction.update(tradeReference, {
                            tradeConfirmation: true,
                            tradeDate: new Date(),
                        });
                    });

                    const message = new TextDisplayBuilder()
                        .setContent(
                            `${process.env.EMOJI_CHECK}  Trade >> ` +
                                `**\`${tradeSnapshot.id}\`** <<  was ` +
                                'successfully completed!',
                        );

                    await interaction.followUp({
                        components: [message],
                        flags: [
                            MessageFlags.IsComponentsV2,
                            MessageFlags.Ephemeral,
                        ],
                    });

                    await interaction.deleteReply();
                } catch (error) {
                    if (error.message.includes(errorMessage1) ||
                        error.message.includes(errorMessage2) ||
                        error.message.includes(errorMessage3)) {

                        const errorMessage = new TextDisplayBuilder()
                            .setContent(error.message);

                        await interaction.followUp({
                            components: [errorMessage],
                            flags: [
                                MessageFlags.IsComponentsV2,
                                MessageFlags.Ephemeral,
                            ],
                        });

                        await interaction.deleteReply();
                    } else if (error.message.includes(errorMessage4) ||
                        error.message.includes(errorMessage5)) {

                        await tradeReference.delete();

                        const errorMessage = new TextDisplayBuilder()
                            .setContent(error.message);

                        await interaction.followUp({
                            components: [errorMessage],
                            flags: [
                                MessageFlags.IsComponentsV2,
                                MessageFlags.Ephemeral,
                            ],
                        });

                        await interaction.deleteReply();
                    } else {
                        console.log(
                            `${new Date()} >>> *** ERROR: accepttrade.js *** ` +
                                'by ${userId} (${interaction.user.username})',
                        );
                        console.error(error);

                        const errorMessage = new TextDisplayBuilder()
                            .setContent(
                                `${process.env.EMOJI_ERROR}  An error has ` +
                                    'occurred while trying to accept the ' +
                                    'request. Please try again.',
                            );

                        await interaction.followUp({
                            components: [errorMessage],
                            flags: [
                                MessageFlags.IsComponentsV2,
                                MessageFlags.Ephemeral,
                            ],
                        });

                        await interaction.deleteReply();
                    }
                }
            }

            if (button.customId === 'btnDecline') {
                deletedMessage = true;

                const errorMessage1 =
                    `${process.env.EMOJI_ERROR}  Error. It seems that the ` +
                        'trade has already been cancelled/declined.';
                const errorMessage2 =
                    `${process.env.EMOJI_ERROR}  Error. It seems that the ` +
                        'trade has already been made.';

                try {
                    await database.runTransaction(async (transaction) => {
                        const newTradeSnapshot = await transaction
                            .get(tradeReference);

                        // ! If the trade request has already been
                        // ! cancelled/declined during the transaction, returns
                        // ! an error message.
                        if (!newTradeSnapshot.exists) {
                            throw new Error(errorMessage1);
                        }

                        // ! If the trade request has already been confirmed
                        // ! during the transaction, returns an error message.
                        if (tradeSnapshot.data().tradeConfirmation !==
                            newTradeSnapshot.data().tradeConfirmation) {

                            throw new Error(errorMessage2);
                        }

                        /**
                         * * * * * * * * * * * * * * * * * * * * * * * * * * * *
                         * * The command passes all validations and the * * * *
                         * * operation is performed. * * * * * * * * * * * * * *
                         * * * * * * * * * * * * * * * * * * * * * * * * * * * *
                         */

                        await transaction.delete(tradeReference);
                    });

                    const message = new TextDisplayBuilder()
                        .setContent(
                            `${process.env.EMOJI_CHECK}  Trade >> ` +
                                `**\`${tradeSnapshot.id}\`** << was ` +
                                `declined. ${process.env.EMOJI_TRASH}`,
                        );

                    await interaction.followUp({
                        components: [message],
                        flags: [
                            MessageFlags.IsComponentsV2,
                            MessageFlags.Ephemeral,
                        ],
                    });

                    await interaction.deleteReply();
                } catch (error) {
                    if (error.message.includes(errorMessage1) ||
                        error.message.includes(errorMessage2)) {

                        const errorMessage = new TextDisplayBuilder()
                            .setContent(error.message);

                        await interaction.followUp({
                            components: [errorMessage],
                            flags: [
                                MessageFlags.IsComponentsV2,
                                MessageFlags.Ephemeral,
                            ],
                        });

                        await interaction.deleteReply();
                    } else {
                        console.log(
                            `${new Date()} >>> *** ERROR: declinetrade.js ` +
                                `(DECLINE) *** by ${userId} ` +
                                `(${interaction.user.username})`,
                        );
                        console.error(error);

                        const errorMessage = new TextDisplayBuilder()
                            .setContent(
                                `${process.env.EMOJI_ERROR}  An error has ` +
                                    'occurred while trying to decline the ' +
                                    'request. Please try again.',
                            );

                        await interaction.followUp({
                            content: [errorMessage],
                            flags: [
                                MessageFlags.IsComponentsV2,
                                MessageFlags.Ephemeral,
                            ],
                        });

                        await interaction.deleteReply();
                    }
                }
            }
        });

        collector.on('end', async () => {
            // * Only the message is deleted through here if the user doesn't
            // * reply in the indicated time.
            if (!deletedMessage) {
                await interaction.deleteReply();
            }
        });
    },
};

// * This function formats the values of the trade document to be displayed in
// * the container.
async function formattingValues(tradeDocument) {
    const issuerReference = database.collection('user')
        .doc(tradeDocument.issuer);
    const issuerSnapshot = await issuerReference.get();
    const issuerDocument = issuerSnapshot.data();
    const issuerNickname = issuerDocument.nickname;
    const issuerId = issuerSnapshot.id;

    const issuerCardReference = tradeDocument.issuerCard;
    const issuerCardSnapshot = await issuerCardReference.get();
    const issuerCardDocument = issuerCardSnapshot.data();
    const issuerCardId = issuerCardSnapshot.id;
    const issuerCardName = issuerCardDocument.name;

    const recipientReference = database.collection('user')
        .doc(tradeDocument.recipient);
    const recipientSnapshot = await recipientReference.get();
    const recipientDocument = recipientSnapshot.data();
    const recipientNickname = recipientDocument.nickname;
    const recipientId = recipientSnapshot.id;

    const recipientCardReference = tradeDocument.recipientCard;
    const recipientCardSnapshot = await recipientCardReference.get();
    const recipientCardDocument = recipientCardSnapshot.data();
    const recipientCardId = recipientCardSnapshot.id;
    const recipientCardName = recipientCardDocument.name;

    const holographicEmojis = {
        'Normal': `${process.env.EMOJI_NORMAL}`,
        'Emerald': `${process.env.EMOJI_EMERALD}`,
        'Golden': `${process.env.EMOJI_GOLDEN}`,
        'Diamond': `${process.env.EMOJI_DIAMOND}`,
    }; 

    const issuerHolographicEmoji = holographicEmojis[
        tradeDocument.issuerHolographic
    ];
    const recipientHolographicEmoji = holographicEmojis[
        tradeDocument.recipientHolographic
    ];

    const creationDate = tradeDocument.securityCooldown.toDate()
        .toLocaleString();

    let tradeStatus = false;
    let statusEmoji = null;
    let tradeDate = null;

    if (tradeDocument.tradeConfirmation == false) {
        tradeStatus = 'Pending';
        statusEmoji = `${process.env.EMOJI_PENDING_STATUS}`;
    } else {
        tradeStatus = 'Completed';
        statusEmoji = `${process.env.EMOJI_CHECK}`;
        tradeDate = tradeDocument.tradeDate.toDate().toLocaleString();
    }

    return {
        issuerNickname,
        issuerId,
        issuerCardId,
        issuerCardName,
        issuerHolographicEmoji,
        recipientNickname,
        recipientId,
        recipientCardId,
        recipientCardName,
        recipientHolographicEmoji,
        creationDate,
        tradeStatus,
        statusEmoji,
        tradeDate,
    };
}

// * This function ensures that the card name with all the value field does not
// * exceed the maximum character limit, which is 1024.
// * To make sure that no errors occur, and for a better visual, the card name
// * will be cutted more than it should be (until 100).
function limitCardName(cardName) {
    let fixedCardName = cardName;

    if (fixedCardName.length <= 100) {
        return fixedCardName;
    }

    fixedCardName = fixedCardName.slice(0, 101);

    // * If the last character is not a space, it will be removed until it finds
    // * one, to avoid cutting a word in half.
    while (fixedCardName[fixedCardName.length - 1] !== ' ') {
        fixedCardName = fixedCardName.slice(0, -1);
    }

    // * The original card name is replaced by the new one with an ellipsis.
    fixedCardName = fixedCardName.slice(0, -1) + '...';

    return fixedCardName;
}

// * Creates the trade container with all the information.
function createTradeContainer(
    tradeId,
    tradeObject,
    issuerCardName,
    recipientCardName,
    userId,
) {
    // * Header.
    const header = new TextDisplayBuilder()
        .setContent(
            `### ${process.env.EMOJI_PAGE}  Trade #: \`${tradeId}\``,
        );

    // * Separator 1.
    const separator1 = new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small);

    // * Issuer.
    const issuerText = new TextDisplayBuilder()
        .setContent(
            `**${process.env.EMOJI_USER}  Issuer**\n` +
                `\`${tradeObject.issuerNickname}\` ` +
                `(\`${tradeObject.issuerId}\`)`,
        );

    // * Issuer Card.
    const issuerCardText = new TextDisplayBuilder()
        .setContent(
            `**${tradeObject.issuerHolographicEmoji}  Card**\n` +
                `\`${tradeObject.issuerCardId}\` // \`${issuerCardName}\``,
        );

    // * Recipient.
    const recipientText = new TextDisplayBuilder()
        .setContent(
            `**${process.env.EMOJI_USER}  Recipient**\n` +
                `\`${tradeObject.recipientNickname}\` ` +
                `(\`${tradeObject.recipientId}\`)`,
        );

    // * Recipient Card.
    const recipientCardText = new TextDisplayBuilder()
        .setContent(
            `**${tradeObject.recipientHolographicEmoji}  Card**\n` +
                `\`${tradeObject.recipientCardId}\` // ` +
                `\`${recipientCardName}\``,
        );

    // * Creation Date.
    const creationDateText = new TextDisplayBuilder()
        .setContent(
            `**${process.env.EMOJI_BIT_CLOCK}  Creation Date**\n` +
                `\`${tradeObject.creationDate}\``,
        );

    // * Status.
    const statusText = new TextDisplayBuilder()
        .setContent(
            `**${process.env.EMOJI_PIN}  Status**\n` +
                `**\`${tradeObject.tradeStatus}\`**  ` +
                `${tradeObject.statusEmoji}`,
        );

    // * Container.
    const tradeContainer = new ContainerBuilder()
        .setAccentColor(0x010101)
        .addTextDisplayComponents(header)
        .addSeparatorComponents(separator1)
        .addTextDisplayComponents(issuerText)
        .addTextDisplayComponents(issuerCardText)
        .addTextDisplayComponents(recipientText)
        .addTextDisplayComponents(recipientCardText)
        .addTextDisplayComponents(creationDateText)
        .addTextDisplayComponents(statusText);

    // * If the trade is completed, the trade date is added to the container.
    // * If the trade is still pending, a user ID validation is performed to
    // * determine if the user is the issuer or the recipient of the trade, to
    // * display the appropriate buttons.
    if (tradeObject.tradeStatus === 'Completed') {
        // * Trade Date.
        const tradeDateText = new TextDisplayBuilder()
            .setContent(
                `**${process.env.EMOJI_BIT_CLOCK}  Trade Date**\n` +
                    `\`${tradeObject.tradeDate}\``,
            );

        tradeContainer.addTextDisplayComponents(tradeDateText);
    } else {
        // * If the user is the issuer of the trade, a cancel button is added to
        // * allow them to cancel the request.
        if (userId === tradeObject.issuerId) {
            const cancelButton = new ButtonBuilder()
                .setCustomId('btnCancel')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Danger);

            const actionRow = new ActionRowBuilder()
                .addComponents(cancelButton);

            // * Separator 2.
            const separator2 = new SeparatorBuilder()
                .setSpacing(SeparatorSpacingSize.Large);

            tradeContainer.addSeparatorComponents(separator2);
            tradeContainer.addActionRowComponents(actionRow);
        }

        // * If the user is the recipient of the trade, a confirm button and a
        // * decline button are added to allow them to confirm or decline the
        // * request.
        if (userId === tradeObject.recipientId) {
            const confirmButton = new ButtonBuilder()
                .setCustomId('btnConfirm')
                .setLabel('Confirm')
                .setStyle(ButtonStyle.Success);

            const declineButton = new ButtonBuilder()
                .setCustomId('btnDecline')
                .setLabel('Decline')
                .setStyle(ButtonStyle.Danger);

            const actionRow = new ActionRowBuilder()
                .addComponents(confirmButton, declineButton);

            // * Separator 3.
            const separator3 = new SeparatorBuilder()
                .setSpacing(SeparatorSpacingSize.Large);

            tradeContainer.addSeparatorComponents(separator3);
            tradeContainer.addActionRowComponents(actionRow);
        }
    }

    return tradeContainer;
}

// * This function searches for the card through the user's collection.
async function findCard(userId, cardReference, holographic, transaction) {
    const obtainingReference = database.collection('user')
        .doc(userId).collection('obtaining');
    let obtainingQuery = obtainingReference
        .where('card', '==', cardReference)
        .where('holographic', '==', holographic)
        .limit(1);
    const obtainingSnapshot = await transaction.get(obtainingQuery);

    // * This query is to know how many repeated cards the user has, so in case
    // * there is only one, the function 'cleaningPendingTrades' is executed.
    obtainingQuery = obtainingReference
        .where('card', '==', cardReference)
        .where('holographic', '==', holographic);
    const obtainingCountSnapshot = await transaction
        .get(obtainingQuery.count());
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
async function sendCard(
    issuerObtainingReference,
    recipientId,
    cardReference,
    holographic,
    transaction,
) {
    // * The card is sent to the recipient.
    const obtainingEntry = database.collection('user')
        .doc(recipientId).collection('obtaining').doc();

    await transaction.set(obtainingEntry, {
        card: cardReference,
        holographic: holographic,
    });

    // * The card is deleted from the issuer.
    await transaction.delete(issuerObtainingReference);
}

// * This function cleans up the pending trades that are no longer possible to
// * complete, cause the user no longer has the necessary card for it.
async function cleaningPendingTrades(
    issuerId,
    recipientId,
    issuerCardReference,
    recipientCardReference,
    issuerHolographic,
    recipientHolographic,
    issuerObtainingCount,
    recipientObtainingCount,
    tradeId,
    transaction,
) {
    const pendingTradesReference = database.collection('trade');

    let issuerIssuerPendingTradesSnapshot = null;
    let issuerRecipientPendingTradesSnapshot = null;

    let recipientIssuerPendingTradesSnapshot = null;
    let recipientRecipientPendingTradesSnapshot = null;

    // * If the user has only one card, the pending trades which involve that
    // * card and the user are searched.
    if (issuerObtainingCount === 1) {
        const issuerPendingTradesQuery = pendingTradesReference
            .where('issuer', '==', issuerId)
            .where('issuerCard', '==', issuerCardReference)
            .where('issuerHolographic', '==', issuerHolographic)
            .where('tradeConfirmation', '==', false);

        const recipientPendingTradesQuery = pendingTradesReference
            .where('recipient', '==', issuerId)
            .where('recipientCard', '==', issuerCardReference)
            .where('recipientHolographic', '==', issuerHolographic)
            .where('tradeConfirmation', '==', false);

        issuerIssuerPendingTradesSnapshot = await transaction
            .get(issuerPendingTradesQuery);
        issuerRecipientPendingTradesSnapshot = await transaction
            .get(recipientPendingTradesQuery);
    }

    if (recipientObtainingCount === 1) {
        const issuerPendingTradesQuery = pendingTradesReference
            .where('issuer', '==', recipientId)
            .where('issuerCard', '==', recipientCardReference)
            .where('issuerHolographic', '==', recipientHolographic)
            .where('tradeConfirmation', '==', false);

        const recipientPendingTradesQuery = pendingTradesReference
            .where('recipient', '==', recipientId)
            .where('recipientCard', '==', recipientCardReference)
            .where('recipientHolographic', '==', recipientHolographic)
            .where('tradeConfirmation', '==', false);

        recipientIssuerPendingTradesSnapshot = await transaction
            .get(issuerPendingTradesQuery);
        recipientRecipientPendingTradesSnapshot = await transaction
            .get(recipientPendingTradesQuery);
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
