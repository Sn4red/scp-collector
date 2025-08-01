const {
    SlashCommandBuilder,
    TextDisplayBuilder,
    MessageFlags,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ContainerBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
} = require('discord.js');

const firebase = require('../../utils/firebase');

const database = firebase.firestore();

module.exports = {
    cooldown: 20,
    data: new SlashCommandBuilder()
        .setName('receivedtrades')
        .setDescription(
            'Lists the trade requests you have pending to accept or decline.',
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
            .where('recipient', '==', userId)
            .where('tradeConfirmation', '==', false)
            .orderBy('securityCooldown', 'desc');
        const pendingTradeSnapshot = await pendingTradeQuery.get();

        // ! If the user has no pending trade requests, returns an error
        // ! message.
        if (pendingTradeSnapshot.empty) {
            const errorMessage = new TextDisplayBuilder()
                .setContent(
                    `${process.env.EMOJI_ERROR}  No pending trade requests ` +
                        'found.',
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

        const promises = [];

        // * First 'for' structure is used to iterate over the trades using
        // * promises and get the information faster.
        for (const trade of pendingTradeSnapshot.docs) {
            const tradeDocument = trade.data();

            const tradeDate = tradeDocument.securityCooldown.toDate()
                .toLocaleString();

            const issuerReference = database.collection('user')
                .doc(tradeDocument.issuer);
            const issuerSnapshot = issuerReference.get();

            promises.push(issuerSnapshot);
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
            const issuerSnapshot = results[i];
            const tradeDate = results[i + 1];

            const issuerDocument = issuerSnapshot.data();
            const issuerNickname = issuerDocument.nickname;

            tradeList +=
                `[**\`${pendingTradeSnapshot.docs[i / 2].id}\`**] ` +
                    `\`${tradeDate}\` from \`${issuerNickname}\`\n`;

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

        // * The initial container is created.
        const container = createContainer(
            pendingTradeSnapshot.size,
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
            const updatedContainer = createContainer(
                pendingTradeSnapshot.size,
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
function createContainer(
    tradeCount,
    tradeList,
    currentPage,
    totalPages,
) {
    // * Header.
    const header = new TextDisplayBuilder()
        .setContent(
            `## ${process.env.EMOJI_PAGE}  List of Pending Received Trades - ` +
                `${tradeCount}`,
        );

    // * Separator.
    const separator = new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small);

    // * Trade List.
    const textTradeList = new TextDisplayBuilder()
        .setContent(tradeList);

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

    // * Container.
    const container = new ContainerBuilder()
        .setAccentColor(0x010101)
        .addTextDisplayComponents(header)
        .addSeparatorComponents(separator)
        .addTextDisplayComponents(textTradeList)
        .addActionRowComponents(navigationRow);

    return container;
}
