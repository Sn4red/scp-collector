const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const firebase = require('../../utils/firebase');

const database = firebase.firestore();

module.exports = {
    cooldown: 300,
    data: new SlashCommandBuilder()
        .setName('scp')
        .setDescription('Lista tu colección de SCPs.'),
    async execute(interaction) {
        const userId = interaction.user.id;

        // Notify the Discord API that the interaction was received successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply({ ephemeral: true });

        const userReference = database.collection('user').doc(userId);
        const userSnapshot = await userReference.get();

        if (userSnapshot.exists) {
            const user = userSnapshot.data();

            const obtainingReference = database.collection('obtaining').where('user', '==', userReference);
            const obtainingSnapshot = await obtainingReference.get();

            if (!obtainingSnapshot.empty) {
                const sortedCards = await cardsSorting(obtainingSnapshot);

                // The list is numerically sorted considering the ID after 'SCP-'
                // (from the fifh character onward), and converts the collection's ID list into an array.
                const cardsOrder = Array.from(sortedCards.cardsCount.keys()).sort((a, b) => parseInt(a.slice(4), 10) - parseInt(b.slice(4), 10));

                // The cards are listed by iterating in a single string to display it in the embed.
                let cardsList = '';

                const embeds = [];
                const pages = {};
                let entriesPerPageLimit = 0;

                cardsOrder.forEach((element, index, array) => {
                    const card = sortedCards.cards.get(element).data();
                    const quantity = sortedCards.cardsCount.get(element);
                    const classCard = sortedCards.cardsClass.get(element);

                    cardsList += `▫️**\`(${quantity})\`** \`${element}\` // \`${card.name}\` - **\`${classCard}\`**\n`;

                    entriesPerPageLimit++;
                    
                    // When 10 card entries are accumulated, they are stored on a single page and the variable is reset.
                    if (entriesPerPageLimit == 10) {
                        embeds.push(new EmbedBuilder().setColor(0x000000).setTitle(`📃  __**Colección de ${user.nickname} **__`).setDescription(cardsList));

                        cardsList = '';
                        entriesPerPageLimit = 0;
                    }

                    // The validation is performed here for the last page in case 10 entries are not accumulated.
                    if (index == array.length - 1) {
                        // If there are only 10 entries, the execution will still enter here, which will result in an error because 'cardsList'
                        // no longer contains text and it will attempt to add this in a new embed. So, this validation is performed to prevent this.
                        if (cardsList.length == 0) {
                            return;
                        }

                        embeds.push(new EmbedBuilder().setColor(0x000000).setTitle(`📃  __**Colección de ${user.nickname} **__`).setDescription(cardsList));
                    }
                });

                // A new ActionRow is created containing 2 buttons.
                const userRow = (id) => {
                    const row = new ActionRowBuilder();

                    const previousButton = new ButtonBuilder()
                        .setCustomId('previousButton')
                        .setStyle('Secondary')
                        .setEmoji('⬅️')
                        .setDisabled(pages[id] === 0);

                    const nextButton = new ButtonBuilder()
                        .setCustomId('nextButton')
                        .setStyle('Secondary')
                        .setEmoji('➡️')
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
            } else {
                await interaction.editReply('❌  No tienes SCPs capturados!');
            }
        } else {
            await interaction.editReply('❌  ¡No estás registrado(a)! Usa /tarjeta para guardar tus datos.');
        }
    },
};

async function cardsSorting(obtainingSnapshot) {
    // 'cardsCount' will store the quantity repeated per card.
    // 'cards' will store the complete data of the card.
    // 'cardsClass' will store the classes of the cards (they are not a field of the card but of its collection's name in Firebase).
    const cardsCount = new Map();
    const cards = new Map();
    const cardsClass = new Map();

    const promises = [];

    // Retrieves cards by the field that references them and stores the document in an array.
    // This is to obtain the card data (the name is needed for the listing).
    for (const obtaining of obtainingSnapshot.docs) {
        const obtainingDocument = obtaining.data();
        const cardReference = obtainingDocument.card;
        const cardSnapshot = cardReference.get();

        promises.push(cardSnapshot);
    }

    const cardsArray = await Promise.all(promises);

    // The required data is saved in the maps.
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

    return { cardsCount, cards, cardsClass };
}
