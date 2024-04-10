const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const firebase = require('../../utils/firebase');
const path = require('node:path');
const cron = require('node-cron');

const database = firebase.firestore();

// * The XP obtained based on the SCP class.
const normalXP = {
    'Safe': 5,
    'Euclid': 15,
    'Keter': 30,
    'Thaumiel': 100,
    'Apollyon': 200,
};

const premiumXP = {
    'Safe': 10,
    'Euclid': 30,
    'Keter': 60,
    'Thaumiel': 200,
    'Apollyon': 400,
};

// * The maximum XP per level (500 levels per rank) based on the user's rank.
const userXP = {
    'Class D': 50,
    'Security Officer': 100,
    'Investigator': 250,
    'Containment Specialist': 500,
    'Field Agent': 1500,
    'Site Director': 5000,
    'O5 Council Member': 10000,
};

// * User ranks.
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
    cooldown: 2,
    data: new SlashCommandBuilder()
        .setName('capture')
        .setDescription('Capture an SCP and add it to your collection.'),
    async execute(interaction) {
        // * Notify the Discord API that the interaction was received successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply();

        // * Database query is performed.
        const userReference = database.collection('user').doc(interaction.user.id);
        let userSnapshot = await userReference.get();

        if (userSnapshot.exists) {
            // * Data is retrieved from here for daily limit validation.
            let userDocument = userSnapshot.data();

            // * Validates if there are still daily captures available.
            if (userDocument.dailyAttemptsRemaining === 0) {
                await interaction.editReply('💥  You have reached the daily limit of SCP captures.');
            } else {
                // * Class obtained through probability.
                const obtainedClass = classProbability(userDocument.premium);

                // * The subcollection has the same name as the document containing it, but is entirely in lowercase.
                const subCollection = obtainedClass.charAt(0).toLowerCase() + obtainedClass.slice(1);

                let transactionCardState = true;

                let cardId = null;
                let classCard = null;
                let file = null;
                let name = null;

                let holographicValue = null;

                let cardEmbed = null;

                let promotionSystem = null;
    
                try {
                    // * First transaction is performed, related to getting the card and registering it
                    // * in the user's obtaining subcollection.
                    // * The following are covered:
                    // * - Number of documents in the collection randomly selected.
                    // * - Card selection based on the randon number.
                    // * - Inserting the obtaining into the user's subcollection.
                    await database.runTransaction(async (transaction) => {
                        // * Retrieves through Aggregation Query the numbers of documents contained in the collection.
                        const cardReference = database.collection('card').doc(obtainedClass).collection(subCollection);
                        const cardSnapshot = await transaction.get(cardReference.count());

                        const classCount = cardSnapshot.data().count;

                        // * Using the Math object, a random number is obtained based on the number of cards,
                        // * and a random card is selected matching the random number with the 'random' field in the document.
                        // * We add 1 to the result in case it returns 0.
                        const randomNumber = Math.floor(Math.random() * classCount) + 1;
                    
                        const selectedCardReference = database.collection('card').doc(obtainedClass).collection(subCollection);
                        const selectedCardQuery = selectedCardReference.where('random', '==', randomNumber);
                        const selectedCardSnapshot = await selectedCardQuery.get();

                        const document = selectedCardSnapshot.docs[0];
                        const selectedCardDocument = document.data();

                        // * Card data.
                        cardId = document.id;   
                        classCard = obtainedClass;
                        file = selectedCardDocument.file;
                        name = selectedCardDocument.name;

                        holographicValue = holographicProbability();

                        // * The entry of obtaining the card is inserted.
                        const obtainingEntry = database.collection('user').doc(userSnapshot.id).collection('obtaining').doc();
    
                        await transaction.set(obtainingEntry, {
                            card: database.collection('card').doc(obtainedClass).collection(subCollection).doc(cardId),
                            holographic: holographicValue,
                        });
                    });
                } catch (error) {
                    transactionCardState = false;
                }

                if (transactionCardState === true) {
                    let transactionUserState = true;

                    try {
                        // * Second transaction is performed, related to the user's rank and level promotion.
                        await database.runTransaction(async (transaction) => {
                            // * To ensure all images have the same size,
                            // * they are resized to 300x200 pixels.
                            // * The definition of the embed is performed here because the it is needed
                            // * by the promotionProcess function.
                            cardEmbed = new EmbedBuilder()
                                .setTitle(`🎲  Item #: \`${cardId}\` // \`${name}\``)
                                .addFields(
                                    { name: '👾  Class', value: `\`${classCard}\``, inline: true },
                                )
                                .setImage(`attachment://${cardId}.jpg`)
                                .setTimestamp();

                            userSnapshot = await transaction.get(userReference);
                            userDocument = userSnapshot.data();

                            // * The rank and level promotion is performed here, along with the increase of daily limits.
                            promotionSystem = await promotionProcess(classCard, holographicValue, userDocument, userReference, cardEmbed, transaction);
                        });
                    } catch (error) {
                        transactionUserState = false;
                    }

                    if (transactionUserState === true) {
                        const imagePath = path.join(__dirname, `../../images/scp/${cardId}.jpg`);
                        const image = new AttachmentBuilder(imagePath);
                    
                        if (userDocument.premium) {
                            promotionSystem.cardEmbed.setDescription(`**+${premiumXP[classCard]} XP**`);

                            switch (holographicValue) {
                                case 'Diamond':
                                    promotionSystem.cardEmbed.setColor(0x00bfff);

                                    promotionSystem.cardEmbed.addFields(
                                        { name: '🟦  Diamond', value: '+100 XP', inline: true },
                                    );

                                    break;
                                case 'Golden':
                                    promotionSystem.cardEmbed.setColor(0xffd700);

                                    promotionSystem.cardEmbed.addFields(
                                        { name: '🟨  Golden', value: '+70 XP', inline: true },
                                    );

                                    break;
                                case 'Emerald':
                                    promotionSystem.cardEmbed.setColor(0x00b65c);

                                    promotionSystem.cardEmbed.addFields(
                                        { name: '🟩  Emerald', value: '+40 XP', inline: true },
                                    );

                                    break;
                                default:
                                    promotionSystem.cardEmbed.setColor(0x010101);
                            }
                        } else {
                            promotionSystem.cardEmbed.setDescription(`**+${normalXP[classCard]} XP**`);
                            promotionSystem.cardEmbed.setColor(0x000000);

                            holographicValue = 'Normal';
                        }

                        promotionSystem.cardEmbed.addFields(
                            { name: '📄  File', value: `**[View Document](${file})**`, inline: true },
                        );

                        await interaction.editReply({
                            embeds: [promotionSystem.cardEmbed],
                            files: [image],
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
                        await interaction.editReply('❌  An error occurred while capturing the SCP. Please try again.');
                    }
                } else {
                    await interaction.editReply('❌  An error occurred while capturing the SCP. Please try again.');
                }
            }
        } else {
            await interaction.editReply('❌  You are not registered! Use /card to save your information.');
        }
    },
};

// * This function defines the probability per class (rarity) in an array,
// * and determines the class to choose based on cumulative probability.
function classProbability(isPremium) {
    const normalClasses = [
        { name: 'Safe', probability: 43 },
        { name: 'Euclid', probability: 30 },
        { name: 'Keter', probability: 21 },
        { name: 'Thaumiel', probability: 4 },
        { name: 'Apollyon', probability: 2 },
    ];

    const premiumClasses = [
        { name: 'Safe', probability: 32 },
        { name: 'Euclid', probability: 28 },
        { name: 'Keter', probability: 27 },
        { name: 'Thaumiel', probability: 8 },
        { name: 'Apollyon', probability: 5 },
    ];

    const random = Math.random() * 100;
    let cumulative = 0;
    let preferredClasses = null;

    if (isPremium) {
        preferredClasses = premiumClasses;
    } else {
        preferredClasses = normalClasses;
    }

    for (const classCard of preferredClasses) {
        cumulative += classCard.probability;

        if (random < cumulative) {
            return classCard.name;
        }
    }

    return preferredClasses[0].name;
}

function holographicProbability() {
    const randomNumber = Math.random();

    /**
     * * This algorithm sets the probability of drawing holographic cards as follows:
     * * - Diamond 0.7%
     * * - Golden 2%
     * * - Emerald 7%
     */
    
    if (randomNumber < 0.007) {
        return 'Diamond';
    } else if (randomNumber < 0.02) {
        return 'Golden';
    } else if (randomNumber < 0.07) {
        return 'Emerald';
    } else {
        return 'Normal';
    }
}

async function promotionProcess(classCard, holographicValue, userDocument, userReference, cardEmbed, transaction) {
    let earnedXP = null;

    if (userDocument.premium) {
        earnedXP = premiumXP[classCard];     
    } else {
        earnedXP = normalXP[classCard];
    }

    let maxXP = userXP[userDocument.rank];

    // * The variable determines what type of promotion will be performed (rank or level),
    // * so that a different type of message is displayed.
    let promotionType = 'none';

    // * This section retrieves the next rank based on the user's current rank. If the current rank is
    // * 'Council O5 Member', there is no promotion.
    let indexCurrentElement = ranks.indexOf(userDocument.rank);
    indexCurrentElement++;

    if (indexCurrentElement === 7) {
        indexCurrentElement--;
    }

    let holographicXP = null;

    switch (holographicValue) {
        case 'Diamond':
            holographicXP = 100;
            break;
        case 'Golden':
            holographicXP = 70;
            break;
        case 'Emerald':
            holographicXP = 40;
            break;
        default:
            holographicXP = 0;
    }

    let fullXP = userDocument.xp + earnedXP + holographicXP;

    let rankPromotion = false;

    if (fullXP >= maxXP) {
        while (fullXP >= maxXP) {
            if (userDocument.level < 500) {
                fullXP -= maxXP;
                userDocument.level++;
    
                promotionType = 'level';
            } else {
                // * If the rank is O5 Council Member, after level 500 keeps leveling up.
                if (userDocument.rank === 'O5 Council Member') {
                    fullXP -= maxXP;
                    userDocument.level++;

                    promotionType = 'level';
                } else {
                    fullXP -= maxXP;
                    userDocument.level = 1;
                    userDocument.rank = ranks[indexCurrentElement];
    
                    rankPromotion = true;
                    maxXP = userXP[userDocument.rank];
                }
            }
        }
    } else {
        await transaction.update(userReference, {
            level: userDocument.level,
            xp: fullXP,
            dailyAttemptsRemaining: firebase.firestore.FieldValue.increment(-1),
        });
    }

    if (rankPromotion) {
        promotionType = 'rank';
    }

    if (promotionType === 'level') {
        await transaction.update(userReference, {
            level: userDocument.level,
            xp: fullXP,
            dailyAttemptsRemaining: firebase.firestore.FieldValue.increment(-1),
        });
    }

    if (promotionType === 'rank') {
        await transaction.update(userReference, {
            rank: userDocument.rank,
            level: userDocument.level,
            xp: fullXP,
            dailyAttemptsRemaining: firebase.firestore.FieldValue.increment(-1),
        });
    }

    userDocument.dailyAttemptsRemaining--;

    cardEmbed.setFooter({ text: `${userDocument.dailyAttemptsRemaining} ${userDocument.dailyAttemptsRemaining === 1 ? 'shot' : 'shots'} remaining` });

    return { cardEmbed, promotionType, userDocument, indexCurrentElement };
}

// * This function resets the daily limit for card captures.
// * Sets to five for non Premium users, and 10 for premium.
async function resetDailyLimit() {
    const userReference = database.collection('user');
    const userSnapshot = await userReference.get();

    userSnapshot.forEach(async (user) => {
        if (user.exists) {
            const userDocument = user.data();
            const isPremium = userDocument.premium;

            if (isPremium) {
                await user.ref.update({
                    dailyAttemptsRemaining: 10, 
                });
            } else {
                await user.ref.update({
                    dailyAttemptsRemaining: 5, 
                });
            }
        }
    });
}

// * The cron task executes the reset function at midnight.
cron.schedule('0 0 * * *', async () => {
    console.log('*** Resetting daily attempts limit ***');
    await resetDailyLimit();
});
