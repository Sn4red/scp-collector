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
    cooldown: 60 * 5,
    data: new SlashCommandBuilder()
        .setName('scp')
        .setDescription('List your collection of SCPs.'),
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
            
        const user = userSnapshot.data();

        // * Aggregation query to the database counting the number of obtained
        // * SCPs.
        const obtainingReference = database.collection('user')
            .doc(userId).collection('obtaining');
        let obtainingSnapshot = await obtainingReference.count().get();
        const SCPCount = obtainingSnapshot.data().count;

        // ! If the user has no SCPs, returns an error message.
        if (SCPCount === 0) {
            const errorMessage = new TextDisplayBuilder()
                .setContent(
                    `${process.env.EMOJI_ERROR}  You don't have any SCPs ` +
                        'captured!',
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

        // * The variable is being reutilized to store all the user's SCPs.
        obtainingSnapshot = await obtainingReference.get();
                
        const sortedCards = await cardsSorting(obtainingSnapshot);

        // * The list is numerically sorted considering the ID after 'SCP-'
        // * (from the fifth character onward), and converts the collection's ID
        // * list into an array.
        const cardsOrder = Array.from(sortedCards.cardsCount.keys())
            .sort((a, b) => parseInt(
                a.slice(4), 10) - parseInt(b.slice(4), 10),
            );

        // * The cards are listed by iterating in a single string to display it
        // * in the container.
        let cardList = '';
        // * 'cardLists' will store the accumulated text of 'cardList' and it
        // * will be used when creating the container.
        const cardLists = [];
        // * 'pages' will store the current page number of the user.
        const pages = {};
        // * 'totalContainers' will store the total number of containers.
        let totalContainers = 0;
        // * 'entriesPerPageLimit' will store the number of entries per page
        // * (10 entries per page).
        let entriesPerPageLimit = 0;

        cardsOrder.forEach((element, index, array) => {
            const card = sortedCards.cards.get(element).data();
            const quantity = sortedCards.cardsCount.get(element);
            const classCard = sortedCards.cardsClass.get(element);

            const emeraldQuantity = sortedCards.emeraldCards.get(element) || 0;
            const goldenQuantity = sortedCards.goldenCards.get(element) || 0;
            const diamondQuantity = sortedCards.diamondCards.get(element) || 0;

            const cardName = limitCardName(card.name);

            cardList +=
                `**\`[${quantity}]\`** \`${element}\` -> \`${cardName}\` - ` +
                    `**\`${classCard}\`**    ` +
                    `${process.env.EMOJI_GREEN_DOT}**${emeraldQuantity}** ` +
                    `${process.env.EMOJI_YELLOW_DOT}**${goldenQuantity}** ` +
                    `${process.env.EMOJI_BLUE_DOT}**${diamondQuantity}** \n`;

            entriesPerPageLimit++;
                    
            // * When 10 card entries are accumulated, they are stored on a
            // * single page and the variable is reset.
            if (entriesPerPageLimit == 10) {
                cardLists.push(cardList);

                totalContainers++;
                cardList = '';
                entriesPerPageLimit = 0;
            }

            // * The validation is performed here for the last page in case 10
            // * entries are not accumulated.
            if (index == array.length - 1) {
                // * If there are only 10 entries, the execution will still
                // * enter here, which will result in an error because
                // * 'cardList' no longer contains text and it will attempt to
                // * add this in a new container. So, this validation is
                // * performed to prevent this.
                if (cardList.length == 0) {
                    // * 'return' is used for 'forEach'.
                    return;
                }

                cardLists.push(cardList);

                totalContainers++;
            }
        });

        // * Initializes the pagination to 0, which this is the first page when
        // * the command is executed.
        pages[userId] = 0;

        // * The initial container is created.
        const container = createContainer(
            user.nickname,
            SCPCount,
            cardLists[pages[userId]],
            pages[userId],
            totalContainers,
        );

        // * Although the reply is ephemeral and only the command executor can
        // * interact with it, this filter is kept for security purposes and
        // * code clarity.
        const collectorFilter = (x) => x.user.id === userId;
        const timeLeft = 1000 * 60 * 5;

        const reply = await interaction.editReply({
            components: [container],
            flags: [MessageFlags.IsComponentsV2],
        });

        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: collectorFilter,
            time: timeLeft,
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
        
            // * If the user is going backwards but the page is not the first
            // * one, the pagination is decremented.
            // * If the user is going forwards but the page is not the last
            // * one, the pagination is incremented.
            if (button.customId === 'btnPrevious' && pages[userId] > 0) {
                --pages[userId];
            } else if (button.customId === 'btnNext' &&
                pages[userId] < totalContainers - 1) {
                ++pages[userId];
            }

            // * The container is recreated to update the page with the new
            // * information.
            const updatedContainer = createContainer(
                user.nickname,
                SCPCount,
                cardLists[pages[userId]],
                pages[userId],
                totalContainers,
            );
        
            await interaction.editReply({
                components: [updatedContainer],
            });
        });
    },
};

// * This function sorts the cards by quantity and stores the data in maps.
async function cardsSorting(obtainingSnapshot) {
    // * 'cardsCount' will store the quantity repeated per card.
    // * 'cards' will store the complete data of the card.
    // * 'cardsClass' will store the classes of the cards (they are not a field
    // * of the card but of its collection's name in Firebase).
    const cardsCount = new Map();
    const cards = new Map();
    const cardsClass = new Map();

    // * These maps will store the quantity of holographic cards per type.
    const emeraldCards = new Map();
    const goldenCards = new Map();
    const diamondCards = new Map();

    const promises = [];

    // * Retrieves cards by the field that references them and stores the
    // * document in an array. This is to obtain the card data (the name is
    // * needed for the listing).
    for (const obtaining of obtainingSnapshot.docs) {
        const obtainingDocument = obtaining.data();

        const cardId = obtainingDocument.card.id;
        const holographic = obtainingDocument.holographic;

        switch (holographic) {
            case 'Emerald':
                if (emeraldCards.has(cardId)) {
                    emeraldCards.set(cardId, emeraldCards.get(cardId) + 1);
                } else {
                    emeraldCards.set(cardId, 1);
                }

                break;
            case 'Golden':
                if (goldenCards.has(cardId)) {
                    goldenCards.set(cardId, goldenCards.get(cardId) + 1);
                } else {
                    goldenCards.set(cardId, 1);
                }

                break;
            case 'Diamond':
                if (diamondCards.has(cardId)) {
                    diamondCards.set(cardId, diamondCards.get(cardId) + 1);
                } else {
                    diamondCards.set(cardId, 1);
                }

                break;
        }

        const cardReference = obtainingDocument.card;
        const cardSnapshot = cardReference.get();

        promises.push(cardSnapshot);
    }

    const cardsArray = await Promise.all(promises);

    // * The required data is saved in the maps.
    cardsArray.forEach((x) => {
        const cardId = x.id;

        if (cardsCount.has(cardId)) {
            cardsCount.set(cardId, cardsCount.get(cardId) + 1);
        } else {
            cardsCount.set(cardId, 1);
            cards.set(cardId, x);
        }

        cardsClass.set(cardId, x.ref.parent.parent.id);
    });

    return {
        cardsCount,
        cards,
        cardsClass,
        emeraldCards,
        goldenCards,
        diamondCards,
    };
}

// * This function ensures that the name of the cards all together don't exceed
// * the maximum character limit of the Text Display. To make sure that no
// * errors occur, and for a better visual, the function will limit the card
// * name by 80 characters as maximum.
function limitCardName(cardName) {
    let fixedCardName = cardName;

    if (fixedCardName.length <= 80) {
        return fixedCardName;
    }

    fixedCardName = fixedCardName.slice(0, 81);

    // * If the last character is not a space, it will be removed until it finds
    // * one, to avoid cutting a word in half.
    while (fixedCardName[fixedCardName.length - 1] !== ' ') {
        fixedCardName = fixedCardName.slice(0, -1);
    }

    // * The original card name is replaced by the new one with an ellipsis.
    fixedCardName = fixedCardName.slice(0, -1) + '...';

    return fixedCardName;
}

// * Creates a container simulating a single page of the collection.
function createContainer(
    nickname,
    SCPCount,
    cardList,
    currentPage,
    totalPages,
) {
    // * Header.
    const header = new TextDisplayBuilder()
        .setContent(
            `## ${process.env.EMOJI_PAGE}  ${nickname}'s Collection - ` +
                `${SCPCount}`,
        );

    // * Separator.
    const separator = new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small);

    // * Card list.
    const textCardList = new TextDisplayBuilder()
        .setContent(cardList);

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
        .addTextDisplayComponents(textCardList)
        .addActionRowComponents(navigationRow);

    return container;
}
