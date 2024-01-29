const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const firebase = require('../../utils/firebase');
const path = require('node:path');
const cron = require('node-cron');

const database = firebase.firestore();

// The XP obtained based on the SCP class.
const xp = {
    'Safe': 5,
    'Euclid': 15,
    'Keter': 30,
    'Thaumiel': 100,
    'Apollyon': 200,
};

// The maximum XP per level (20 levels per rank) based on the user's rank.
const userXP = {
    'Class D': 50,
    'Security Officer': 100,
    'Investigator': 250,
    'Containment Specialist': 500,
    'Field Agent': 1500,
    'Site Director': 5000,
    'O5 Council Member': 10000,
};

// User ranks.
const ranks = [
    'Class D',
    'Security Officer',
    'Investigator',
    'Containment Specialist',
    'Field Agent',
    'Site Director',
    'O5 Council Member',
];

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('capture')
        .setDescription('Capture an SCP and add it to your collection.'),
    async execute(interaction) {
        // Notify the Discord API that the interaction was received successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply();

        // Database query is performed.
        const userReference = database.collection('user').doc(interaction.user.id);
        const userSnapshot = await userReference.get();

        if (userSnapshot.exists) {
            // Data is retrieved from here for daily limit validation.
            const userDocument = userSnapshot.data();

            // Validates if the daily capture limit (5) has been reached.
            if (userDocument.dailyCaptures >= 5) {
                await interaction.editReply('💥  You have reached the daily limit of SCP captures.');
            } else {
                // Class obtained through probability.
                const obtainedClass = classProbability();

                // The subcollection has the same name as the document containing it, but is entirely in lowercase.
                const subCollection = obtainedClass.charAt(0).toLowerCase() + obtainedClass.slice(1);
    
                // Retrieves all SCP cards of the class obtained through probability.
                const cardReference = database.collection('card').doc(obtainedClass).collection(subCollection);
                const cardSnapshot = await cardReference.get();
    
                if (!cardSnapshot.empty) {
                    // Transforms the documents from the QuerySnapshot object into an array.
                    const cardsArray = cardSnapshot.docs.map((x) => ({ id: x.id, data: x.data() }));
    
                    // Using the Math object, a random index is obtained based on the number of cards in the array,
                    // and a random card is selected.
                    const randomIndex = Math.floor(Math.random() * cardsArray.length);
                    const randomCard = cardsArray[randomIndex];
    
                    // Card data.
                    const cardId = randomCard.id;
                    const classCard = obtainedClass;
                    const file = randomCard.data.file;
                    const name = randomCard.data.name;
    
                    const imagePath = path.join(__dirname, `../../images/scp/${cardId}.jpg`);
    
                    // To ensure all images have the same size,
                    // they are resized to 300x200 pixels.
                    const cardEmbed = new EmbedBuilder()
                        .setColor(0x000000)
                        .setTitle(`🎲  Item #: \`${cardId}\` // \`${name}\``)
                        .setDescription(`**+${xp[classCard]} XP**`)
                        .addFields(
                            { name: '👾  Class', value: `\`${classCard}\``, inline: true },
                            { name: '📄  File', value: `**[View Document](${file})**`, inline: true },
                        )
                        .setImage(`attachment://${cardId}.jpg`)
                        .setTimestamp();
                    
                    // The entry of obtaining the card is inserted.
                    const obtainingEntry = database.collection('obtaining').doc();
    
                    await obtainingEntry.set({
                        card: database.collection('card').doc(obtainedClass).collection(subCollection).doc(cardId),
                        user: userReference,
                        locked: false,
                    });

                    // The rank and level promotion is performed here (if applicable), along with the increase of daily limits.
                    const promotionSystem = await promotionProcess(classCard, userDocument, userReference, cardEmbed);

                    await interaction.editReply({
                        embeds: [promotionSystem.cardEmbed],
                        files: [imagePath],
                    });

                    switch (promotionSystem.promotionType) {
                        case 'level':
                            await interaction.followUp(`✨  Nice, ${promotionSystem.userDocument.nickname}! You are now level ${promotionSystem.userDocument.level}.  ✨`);
                            break;
                        case 'rank':
                            await interaction.followUp(`✨  Congrats, ${promotionSystem.userDocument.nickname}. You have been promoted to **${ranks[promotionSystem.indexCurrentElement]}**.  ✨`);
                            break;
                    }
                } else {
                    await interaction.editReply('❌  Error while attempting to capture an SCP. Please try again later.');
                }
            }
        } else {
            await interaction.editReply('❌  You are not registered! Use /card to save your information.');
        }
    },
};

// This function defines the probability per class (rarity) in an array,
// and determines the class to choose based on cumulative probability.
function classProbability() {
    const classes = [
        { name: 'Safe', probability: 40 },
        { name: 'Euclid', probability: 30 },
        { name: 'Keter', probability: 21 },
        { name: 'Thaumiel', probability: 7 },
        { name: 'Apollyon', probability: 2 },
    ];

    const random = Math.random() * 100;
    let cumulative = 0;

    for (const classCard of classes) {
        cumulative += classCard.probability;

        if (random < cumulative) {
            return classCard.name;
        }
    }

    return classes[0].name;
}

async function promotionProcess(classCard, userDocument, userReference, cardEmbed) {
    const earnedXP = xp[classCard];
    const maxXP = userXP[userDocument.rank];

    // The variable determines what type of promotion will be performed (rank or level),
    // so that a different type of message is displayed.
    let promotionType = 'no';

    // This section retrieves the next rank based on the user's current rank. If the current rank is
    // 'Council O5 Member', there is no promotion.
    let indexCurrentElement = ranks.indexOf(userDocument.rank);
    indexCurrentElement++;

    if (indexCurrentElement == 6) {
        indexCurrentElement--;
    }

    if ((userDocument.xp + earnedXP) >= maxXP) {
        if (userDocument.level < 20) {
            promotionType = 'level';

            await userReference.update({
                level: ++userDocument.level,
                xp: (userDocument.xp + earnedXP) - maxXP,
                dailyCaptures: ++userDocument.dailyCaptures,
            });
        } else {
            promotionType = 'rank';

            await userReference.update({
                rank: ranks[indexCurrentElement],
                level: 1,
                xp: (userDocument.xp + earnedXP) - maxXP,
                dailyCaptures: ++userDocument.dailyCaptures,
            });
        }
    } else {
        await userReference.update({
            xp: firebase.firestore.FieldValue.increment(earnedXP),
            dailyCaptures: ++userDocument.dailyCaptures,
        });
    }
    
    if (userDocument.dailyCaptures == 4) {
        cardEmbed.setFooter({ text: `${5 - userDocument.dailyCaptures} shot remaining` });
    } else {
        cardEmbed.setFooter({ text: `${5 - userDocument.dailyCaptures} shots remaining` });
    }

    return { cardEmbed, promotionType, userDocument, indexCurrentElement };
}

// This function resets the daily limit for card captures.
async function resetDailyLimit() {
    const userReference = database.collection('user');
    const userSnapshot = await userReference.get();

    userSnapshot.forEach(async (user) => {
        if (user.exists) {
            await user.ref.update({
                dailyCaptures: 0,
            });
        }
    });
}

// The cron task executes the reset function at midnight.
cron.schedule('0 0 * * *', async () => {
    console.log('*** Resetting daily attempts limit ***');
    await resetDailyLimit();
});
