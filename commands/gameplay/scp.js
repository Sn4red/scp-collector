const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const firebase = require('../../utils/firebase');

const database = firebase.firestore();

module.exports = {
    cooldown: 60 * 5,
    data: new SlashCommandBuilder()
        .setName('scp')
        .setDescription('List your collection of SCPs.'),
    async execute(interaction) {
        const userId = interaction.user.id;

        // * Notify the Discord API that the interaction was received successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply({ ephemeral: true });

        const userReference = database.collection('user').doc(userId);
        const userSnapshot = await userReference.get();

        // ! If the user is not registered, returns an error message.
        if (!userSnapshot.exists) {
            await interaction.editReply(`${process.env.EMOJI_ERROR}  You are not registered! Use /\`card\` to start playing.`);
            return;
        }
            
        const user = userSnapshot.data();

        // * Aggregation query to the database counting the number of obtained SCPs.
        const obtainingReference = database.collection('user').doc(userId).collection('obtaining');
        let obtainingSnapshot = await obtainingReference.count().get();
        const SCPCount = obtainingSnapshot.data().count;

        // ! If the user has no SCPs, returns an error message.
        if (SCPCount === 0) {
            await interaction.editReply(`${process.env.EMOJI_ERROR}  You don't have any SCPs captured!`);
            return;
        }

        /**
         * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
         * * The command passes all validations and the operation is performed. *
         * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
         */

        // * The variable is being reutilized to store all the user's SCPs.
        obtainingSnapshot = await obtainingReference.get();
                
        const sortedCards = await cardsSorting(obtainingSnapshot);

        // * The list is numerically sorted considering the ID after 'SCP-'
        // * (from the fifh character onward), and converts the collection's ID list into an array.
        const cardsOrder = Array.from(sortedCards.cardsCount.keys()).sort((a, b) => parseInt(a.slice(4), 10) - parseInt(b.slice(4), 10));

        // * The cards are listed by iterating in a single string to display it in the embed.
        let cardsList = '';

        const embeds = [];
        const pages = {};
        let entriesPerPageLimit = 0;

        cardsOrder.forEach((element, index, array) => {
            const card = sortedCards.cards.get(element).data();
            const quantity = sortedCards.cardsCount.get(element);
            const classCard = sortedCards.cardsClass.get(element);

            const emeraldQuantity = sortedCards.emeraldCards.get(element) || 0;
            const goldenQuantity = sortedCards.goldenCards.get(element) || 0;
            const diamondQuantity = sortedCards.diamondCards.get(element) || 0;

            const cardName = limitCardName(card.name);

            cardsList += `${process.env.EMOJI_WHITE_DASH}**\`(${quantity})\`** \`${element}\` // \`${cardName}\` - **\`${classCard}\`**    ${process.env.EMOJI_GREEN_DOT}**${emeraldQuantity}** ${process.env.EMOJI_YELLOW_DOT}**${goldenQuantity}** ${process.env.EMOJI_BLUE_DOT}**${diamondQuantity}** \n`;

            entriesPerPageLimit++;
                    
            // * When 10 card entries are accumulated, they are stored on a single page and the variable is reset.
            if (entriesPerPageLimit == 10) {
                embeds.push(new EmbedBuilder()
                                .setColor(0x010101)
                                .setTitle(`${process.env.EMOJI_PAGE}  __**Collection of ${user.nickname}**__`)
                                .setDescription(cardsList));

                cardsList = '';
                entriesPerPageLimit = 0;
            }

            // * The validation is performed here for the last page in case 10 entries are not accumulated.
            if (index == array.length - 1) {
                // * If there are only 10 entries, the execution will still enter here, which will result in an error because 'cardsList'
                // * no longer contains text and it will attempt to add this in a new embed. So, this validation is performed to prevent this.
                if (cardsList.length == 0) {
                    // * 'return' is used for 'forEach'.
                    return;
                }

                embeds.push(new EmbedBuilder()
                                .setColor(0x010101)
                                .setTitle(`${process.env.EMOJI_PAGE}  __**Collection of ${user.nickname}**__`)
                                .setDescription(cardsList));
            }
        });

        // * A new ActionRow is created containing 2 buttons.
        const userRow = (id) => {
            const row = new ActionRowBuilder();

            const previousButton = new ButtonBuilder()
                .setCustomId('previousButton')
                .setStyle('Secondary')
                .setEmoji(`${process.env.EMOJI_WHITE_ARROW_LEFT}`)
                .setDisabled(pages[id] === 0);

            const nextButton = new ButtonBuilder()
                .setCustomId('nextButton')
                .setStyle('Secondary')
                .setEmoji(`${process.env.EMOJI_WHITE_ARROW_RIGHT}`)
                .setDisabled(pages[id] === embeds.length - 1);

            row.addComponents(previousButton, nextButton);

            return row;
        };

        pages[userId] = pages[userId] || 0;

        const embed = embeds[pages[userId]];
        const collectorFilter = (x) => x.user.id === userId;
        const time = 1000 * 60 * 5;

        const reply = await interaction.editReply({
            embeds: [embed],
            components: [userRow(userId)],
        });

        const collector = reply.createMessageComponentCollector({ filter: collectorFilter, time: time });

        collector.on('collect', async (button) => {
            if (!button) {
                return;
            }
        
            button.deferUpdate();
        
            if (button.customId !== 'previousButton' && button.customId !== 'nextButton') {
                return;
            }
        
            if (button.customId === 'previousButton' && pages[userId] > 0) {
                --pages[userId];
            } else if (button.customId === 'nextButton' && pages[userId] < embeds.length - 1) {
                ++pages[userId];
            }
        
            await interaction.editReply({
                embeds: [embeds[pages[userId]]],
                components: [userRow(userId)],
            });
        });
    },
};


// * This function sorts the cards by quantity and stores the data in maps.
async function cardsSorting(obtainingSnapshot) {
    // * 'cardsCount' will store the quantity repeated per card.
    // * 'cards' will store the complete data of the card.
    // * 'cardsClass' will store the classes of the cards (they are not a field of the card but of its collection's name in Firebase).
    const cardsCount = new Map();
    const cards = new Map();
    const cardsClass = new Map();

    // * These maps will store the quantity of holographic cards per type.
    const emeraldCards = new Map();
    const goldenCards = new Map();
    const diamondCards = new Map();

    const promises = [];

    // * Retrieves cards by the field that references them and stores the document in an array.
    // * This is to obtain the card data (the name is needed for the listing).
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

    return { cardsCount, cards, cardsClass, emeraldCards, goldenCards, diamondCards };
}

// * This function ensures that the name of the cards all together don't exceed the maximum character limit of the embed description, which is 4096.
// * To make sure that no errors occur, and for a better visual, the function will limit the card name by 80 characters as maximum.
function limitCardName(cardName) {
    let fixedCardName = cardName;

    if (fixedCardName.length <= 80) {
        return fixedCardName;
    }

    fixedCardName = fixedCardName.slice(0, 81);

    // * If the last character is not a space, it will be removed until it finds one,
    // * to avoid cutting a word in half.
    while (fixedCardName[fixedCardName.length - 1] !== ' ') {
        fixedCardName = fixedCardName.slice(0, -1);
    }

    // * The original card name is replaced by the new one with an ellipsis.
    fixedCardName = fixedCardName.slice(0, -1) + '...';

    return fixedCardName;
}
