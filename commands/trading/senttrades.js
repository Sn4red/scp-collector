const {
    SlashCommandBuilder,
    MessageFlags,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    ComponentType,
} = require('discord.js');

const firebase = require('../../utils/firebase');

const database = firebase.firestore();

module.exports = {
    cooldown: 20,
    data: new SlashCommandBuilder()
        .setName('senttrades')
        .setDescription(
            'Lists pending trade requests along with a history of trades you ' +
                'have completed.',
        ),
    async execute(interaction) {
        const userId = interaction.user.id;

        // * Notify the Discord API that the interaction was received
        // * successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply({
            flags: [MessageFlags.Ephemeral],
        });

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

        const pendingTradeReference = database.collection('trade');
        const pendingTradeQuery = pendingTradeReference
            .where('issuer', '==', userId)
            .where('tradeConfirmation', '==', false)
            .orderBy('securityCooldown', 'desc');
        const pendingTradeSnapshot = await pendingTradeQuery.get();

        // ! If the user has no pending sent trades, it displays the container
        // ! with no details and the history of recent trades performed.
        if (pendingTradeSnapshot.empty) {
            const container = await createContainer(
                isListEmpty = true,
                tradeCount = pendingTradeSnapshot.size,
                this.userId = userId,
            );

            await interaction.editReply({
                components: [container],
                flags: [MessageFlags.IsComponentsV2],
            });

            return;
        }

        /**
         * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
         * * The command passes all validations and the operation is performed.*
         * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
         */

        const promises = [];

        // * First 'for' structure is used to iterate over the trades using
        // * promises and get the information faster.
        for (const trade of pendingTradeSnapshot.docs) {
            const tradeDocument = trade.data();

            const tradeDate = tradeDocument.securityCooldown.toDate()
                .toLocaleString();

            const recipientReference = database.collection('user')
                .doc(tradeDocument.recipient);
            const recipientSnapshot = recipientReference.get();

            promises.push(recipientSnapshot);
            promises.push(tradeDate);
        }

        const results = await Promise.all(promises);

        // * The trades are listed by iterating in a single string to display it
        // * in the container.
        let tradeList = '';
        // * 'tradeLists' will store the accumulated text of 'tradeList' and
        // * it will be used when creating the container.
        const tradeLists = [];
        // * 'pages' will store the current page number of the user.
        const pages = {};
        // * 'totalContainers' will store the total number of containers.
        let totalContainers = 0;
        // * 'entriesPerPageLimit' will store the number of entries per page
        // * (10 entries per page).
        let entriesPerPageLimit = 0;

        // * Second 'for' structure is used to iterate over the results and fill
        // * the container with the trade information.
        // * Because the results were pushed in pairs, the iteration is done
        // * with a step of 2.
        for (let i = 0; i < results.length; i += 2) {
            const recipientSnapshot = results[i];
            const tradeDate = results[i + 1];

            const recipientDocument = recipientSnapshot.data();
            const recipientNickname = recipientDocument.nickname;

            tradeList +=
                `[**\`${pendingTradeSnapshot.docs[i / 2].id}\`**] ` +
                    `\`${tradeDate}\` to \`${recipientNickname}\`\n`;

            entriesPerPageLimit++;

            // * When 10 trade entries are accumulated, they are stored on a
            // * single page and the variable is reset.
            if (entriesPerPageLimit == 10) {
                tradeLists.push(tradeList);

                totalContainers++;
                tradeList = '';
                entriesPerPageLimit = 0;
            }

            // * The validation is performed here for the last page in case 10
            // * entries are not accumulated.
            if (i / 2 == pendingTradeSnapshot.size - 1) {
                // * If there are only 10 entries, the execution will still
                // * enter here, which will result in an error because
                // * 'tradeList' no longer contains text and it will attempt to
                // * add this in a new container. So, this validation is
                // * performed to prevent this.
                if (tradeList.length == 0) {
                    // * 'break' is used for 'for'.
                    break;
                }

                tradeLists.push(tradeList);

                totalContainers++;
            }
        }

        // * Initializes the pagination to 0, which this is the first page when
        // * the command is executed.
        pages[userId] = 0;

        const container = await createContainer(
            false,
            pendingTradeSnapshot.size,
            userId,
            tradeLists[pages[userId]],
            pages[userId],
            totalContainers,
        );

        // * Although the reply is ephemeral and only the command executor can
        // * interact with it, this filter is kept for security purposes and
        // * code clarity.
        const collectorFilter = (x) => x.user.id === userId;
        const time = 1000 * 60 * 5;

        const reply = await interaction.editReply({
            components: [container],
            flags: [MessageFlags.IsComponentsV2],
        });

        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: collectorFilter,
            time: time,
        });

        // * Collector listener for the navigation buttons.
        collector.on('collect', async (button) => {
            // * Validates the button interaction so it prevents unexpected
            // * errors (it basically makes sure that the buttons was actually
            // * clicked).
            if (!button) {
                return;
            }

            // * Interaction is acknowledged to prevent the interaction timeout.
            await button.deferUpdate();

            // * Validates that the button clicked is one of the navigation
            // * buttons (there is just 2 buttons, but it clarifies the
            // * intention).
            if (button.customId !== 'btnPrevious' &&
                button.customId !== 'btnNext') {

                return;
            }

            if (button.customId === 'btnPrevious' && pages[userId] > 0) {
                --pages[userId];
            } else if (button.customId === 'btnNext' &&
                pages[userId] < totalContainers - 1) {

                ++pages[userId];
            }

            // * The container is recreated to update the page with the new
            // * information.
            const updatedContainer = await createContainer(
                false,
                pendingTradeSnapshot.size,
                userId,
                tradeLists[pages[userId]],
                pages[userId],
                totalContainers,
            );

            await interaction.editReply({
                components: [updatedContainer],
            });
        });
    },
};

// * Creates a container simulating a single page of the collection.
async function createContainer(
    isListEmpty,
    tradeCount,
    userId,
    tradeList = '',
    currentPage = 0,
    totalPages = 0,
) {
    // * Header 1.
    const header1 = new TextDisplayBuilder()
        .setContent(
            `## ${process.env.EMOJI_PAGE}  List of Pending Sent Trades - ` +
                `${tradeCount}`,
        );

    // * Separator 1.
    const separator1 = new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small);

    // * Trade List.
    const textTradeList = new TextDisplayBuilder();

    // * If the trade list is empty, it displays a message indicating that, if
    // * not, it displays the trade list.
    if (isListEmpty) {
        textTradeList
            .setContent('No pending trade requests found.');
    } else {
        textTradeList
            .setContent(tradeList);
    }

    // * Separator 2.
    const separator2 = new SeparatorBuilder()
        .setDivider(false)
        .setSpacing(SeparatorSpacingSize.Large);

    // * Header 2.
    const header2 = new TextDisplayBuilder()
        .setContent(
            `### ${process.env.EMOJI_TRIANGLE_DOWN}` +
                `${process.env.EMOJI_TRIANGLE_DOWN}` +
                `${process.env.EMOJI_TRIANGLE_DOWN}  Recent Trade History  ` +
                `${process.env.EMOJI_TRIANGLE_DOWN}` +
                `${process.env.EMOJI_TRIANGLE_DOWN}` +
                `${process.env.EMOJI_TRIANGLE_DOWN}`,
        );

    // * Separator 3.
    const separator3 = new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small);

    // * Container.
    const container = new ContainerBuilder()
        .setAccentColor(0x010101)
        .addTextDisplayComponents(header1)
        .addSeparatorComponents(separator1)
        .addTextDisplayComponents(textTradeList)
        .addSeparatorComponents(separator2)
        .addTextDisplayComponents(header2)
        .addSeparatorComponents(separator3);

    // * History of trades.
    const historyTradesValue = await historyTrades(userId);

    // * The component it will only be added if there are trades in the history.
    if (historyTradesValue.length !== 0) {
        const textHistoryTrades = new TextDisplayBuilder()
            .setContent(historyTradesValue);

        container
            .addTextDisplayComponents(textHistoryTrades);
    }

    // * If the trade list is not empty, it adds the navigation buttons.
    if (!isListEmpty) {
        // * Navigation Action Row.
        const previousButton = new ButtonBuilder()
            .setCustomId('btnPrevious')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji(`${process.env.EMOJI_WHITE_ARROW_LEFT}`)
            .setDisabled(currentPage === 0);

        const nextButton = new ButtonBuilder()
            .setCustomId('btnNext')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji(`${process.env.EMOJI_WHITE_ARROW_RIGHT}`)
            .setDisabled(currentPage === totalPages - 1);

        const navigationRow = new ActionRowBuilder()
            .addComponents(previousButton, nextButton);

        container
            .addActionRowComponents(navigationRow);
    }

    return container;
}

async function historyTrades(userId) {
    const issuerCompleteTradeReference = database.collection('trade');
    const issuerCompleteTradeQuery = issuerCompleteTradeReference
        .where('issuer', '==', userId)
        .where('tradeConfirmation', '==', true);
    const issuerCompleteTradeSnapshot = await issuerCompleteTradeQuery.get();

    const recipientCompleteTradeReference = database.collection('trade');
    const recipientCompleteTradeQuery = recipientCompleteTradeReference
        .where('recipient', '==', userId)
        .where('tradeConfirmation', '==', true);
    const recipientCompleteTradeSnapshot = await recipientCompleteTradeQuery
        .get();

    const userCompleteTradeSnapshot = issuerCompleteTradeSnapshot.docs
        .concat(recipientCompleteTradeSnapshot.docs);

    // * This line sorts the trades by date in descending order.
    userCompleteTradeSnapshot
        .sort((a, b) =>
            b.data().tradeDate.toMillis() - a.data().tradeDate.toMillis(),
        );

    let historyLimit = 0;

    const promises = [];

    // * First 'for' structure is used to iterate over the trades using promises
    // * and get the information faster.
    for (const document of userCompleteTradeSnapshot) {
        if (historyLimit === 7) {
            break;
        }
        
        const tradeDocument = document.data();

        const issuerCardReference = tradeDocument.issuerCard;
        const issuerCardSnapshot = issuerCardReference.get();

        const recipientCardReference = tradeDocument.recipientCard;
        const recipientCardSnapshot = recipientCardReference.get();

        const issuerReference = database.collection('user')
            .doc(tradeDocument.issuer);
        const issuerSnapshot = issuerReference.get();

        promises.push(issuerCardSnapshot);
        promises.push(recipientCardSnapshot);
        promises.push(issuerSnapshot);

        historyLimit++;
    }

    const results = await Promise.all(promises);

    let historyTradeList = '';

    // * Second 'for' structure is used to iterate over the results and fill the
    // * container with the trade information.
    for (let i = 0; i < results.length; i += 3) {
        const issuerCardSnapshot = results[i];
        const recipientCardSnapshot = results[i + 1];
        const issuerSnapshot = results[i + 2];

        const tradeDocument = userCompleteTradeSnapshot[i / 3].data();

        const tradeDate = tradeDocument.tradeDate.toDate().toLocaleString();
        const issuerDocument = issuerSnapshot.data();
        const issuerNickname = issuerDocument.nickname;

        const holographicEmojis = {
            'Emerald': `${process.env.EMOJI_EMERALD}`,
            'Golden': `${process.env.EMOJI_GOLDEN}`,
            'Diamond': `${process.env.EMOJI_DIAMOND}`,
        };  

        const issuerCard = tradeDocument.issuerHolographic !== 'Normal'
            ? `${holographicEmojis[tradeDocument.issuerHolographic]} ` +
                `\`${issuerCardSnapshot.id}\` ` +
                `${holographicEmojis[tradeDocument.issuerHolographic]}`
            : `\`${issuerCardSnapshot.id}\``;
        const recipientCard = tradeDocument.recipientHolographic !== 'Normal'
            ? `${holographicEmojis[tradeDocument.recipientHolographic]} ` +
                `\`${recipientCardSnapshot.id}\` ` +
                `${holographicEmojis[tradeDocument.recipientHolographic]}`
            : `\`${recipientCardSnapshot.id}\``;

        historyTradeList +=
            `${process.env.EMOJI_WHITE_DASH} ${issuerCard} for ` +
                `${recipientCard} (${tradeDate}) ` +
                `${process.env.EMOJI_RIGHT_ARROW} **${issuerNickname}**\n`;
    }

    return historyTradeList;
}
