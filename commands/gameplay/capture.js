const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const firebase = require('../../utils/firebase');
const path = require('node:path');
const premiumWhitelist = require('../../utils/premiumWhitelist');

const database = firebase.firestore();

const guildId = process.env.GUILD_ID;
const VIPRoleId = process.env.VIP_ROLE_ID;

// * The XP obtained based on the SCP class by a normal user.
const normalXP = {
    'Safe': 5,
    'Euclid': 15,
    'Keter': 30,
    'Thaumiel': 100,
    'Apollyon': 200,
};

// * The XP obtained based on the SCP class by a premium user.
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

// * The crystals obtained based on the SCP class by a normal user.
const normalCrystals = {
    'Safe': 10,
    'Euclid': 20,
    'Keter': 30,
    'Thaumiel': 50,
    'Apollyon': 100,
};

// * The crystals obtained based on the SCP class by a premium user.
const premiumCrystals = {
    'Safe': 20,
    'Euclid': 40,
    'Keter': 60,
    'Thaumiel': 100,
    'Apollyon': 200,
};

module.exports = {
    cooldown: 2,
    data: new SlashCommandBuilder()
        .setName('capture')
        .setDescription('Capture an SCP and add it to your collection.'),
    async execute(interaction) {
        // * Notify the Discord API that the interaction was received successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply();

        const userId = interaction.user.id;

        // * Database query is performed.
        const userReference = database.collection('user').doc(userId);
        let userSnapshot = await userReference.get();

        // ! If the user is not registered, returns an error message.
        if (!userSnapshot.exists) {
            await interaction.editReply('<a:error:1229592805710762128>  You are not registered! Use /`card` to start playing.');
            return;
        }

        /**
          * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
          * * The command passes all validations and the operation is performed. *
          * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
          */

        // * Data is retrieved from here for daily limit validation.
        let userDocument = userSnapshot.data();

        // * Validates if there are still daily captures available.
        if (userDocument.dailyAttemptsRemaining === 0) {                
            await interaction.editReply('<a:red_siren:1229660105692155904>  You have reached the daily limit of SCP captures.');
        } else {
            const isPremium = await checkingUserPremiumStatus(userId, interaction)
            
            // * Class obtained through probability.
            const obtainedClass = classProbability(isPremium);

            let cardId = null;
            let classCard = null;
            let file = null;
            let name = null;

            let holographicValue = 'Normal';

            let cardEmbed = null;

            let promotionSystem = null;
    
            try {
                await database.runTransaction(async (transaction) => {
                    // * Retrieves the user data from the database. This is used below to validate if the user is premium or not.
                    userSnapshot = await transaction.get(userReference);
                    userDocument = userSnapshot.data();

                    // * Retrieves through Aggregation Query the numbers of documents contained in the collection.
                    const cardReference = database.collection('card').doc(obtainedClass).collection(obtainedClass.toLowerCase());
                    const cardSnapshot = await transaction.get(cardReference.count());

                    const classCount = cardSnapshot.data().count;

                    // * Using the Math object, a random number is obtained based on the number of cards,
                    // * and a random card is selected matching the random number with the 'random' field in the document.
                    // * We add 1 to the result in case it returns 0.
                    const randomNumber = Math.floor(Math.random() * classCount) + 1;
                    
                    const selectedCardReference = database.collection('card').doc(obtainedClass).collection(obtainedClass.toLowerCase());
                    const selectedCardQuery = selectedCardReference.where('random', '==', randomNumber);
                    const selectedCardSnapshot = await transaction.get(selectedCardQuery);
                    
                    const cardDocument = selectedCardSnapshot.docs[0];
                    const selectedCardDocument = cardDocument.data();

                    // * Card data.
                    cardId = cardDocument.id;   
                    classCard = obtainedClass;
                    file = selectedCardDocument.file;
                    name = selectedCardDocument.name;
                    
                    // * Only premium users can obtain holographic cards.
                    if (isPremium) {
                        holographicValue = holographicProbability();
                    }

                    // * The entry of obtaining the card is inserted.
                    const obtainingEntry = database.collection('user').doc(userSnapshot.id).collection('obtaining').doc();
    
                    await transaction.set(obtainingEntry, {
                        card: database.collection('card').doc(obtainedClass).collection(obtainedClass.toLowerCase()).doc(cardId),
                        holographic: holographicValue,
                    });

                    const cardName = limitCardName(name);

                    // * To ensure all images have the same size,
                    // * they are resized to 300x200 pixels.
                    // * The definition of the embed is performed here because it is needed
                    // * by the promotionProcess function.
                    cardEmbed = new EmbedBuilder()
                        .setTitle(`<a:dice:1228555582655561810>  Item #: \`${cardId}\` // \`${cardName}\``)
                        .addFields(
                            { name: '<:invader:1228919814555177021>  Class', value: `\`${classCard}\``, inline: true },
                        )
                        .setImage(`attachment://${cardId}.jpg`)
                        .setTimestamp();

                    // * The rank and level promotion is performed here, along with the increase of daily limits.
                    promotionSystem = await promotionProcess(classCard, holographicValue, userDocument, isPremium, userReference, cardEmbed, transaction);
                });

                const imagePath = path.join(__dirname, `../../images/scp/${cardId}.jpg`);
                const image = new AttachmentBuilder(imagePath);

                if (isPremium) {
                    promotionSystem.cardEmbed.setDescription(`|   **+${premiumXP[classCard]} XP** // **+${premiumCrystals[classCard]}** <a:crystal:1273453430190375043>  |`);
    
                    switch (holographicValue) {
                        case 'Diamond':
                            promotionSystem.cardEmbed.setColor(0x00bfff);
    
                            promotionSystem.cardEmbed.addFields(
                                { name: '<a:diamond:1228924014479671439>  Diamond', value: '+100 XP', inline: true },
                            );
    
                            break;
                        case 'Golden':
                            promotionSystem.cardEmbed.setColor(0xffd700);
    
                            promotionSystem.cardEmbed.addFields(
                                { name: '<a:golden:1228925086690443345>  Golden', value: '+70 XP', inline: true },
                            );
    
                            break;
                        case 'Emerald':
                            promotionSystem.cardEmbed.setColor(0x00b65c);
    
                            promotionSystem.cardEmbed.addFields(
                                { name: '<a:emerald:1228923470239367238>  Emerald', value: '+40 XP', inline: true },
                            );
    
                            break;
                        default:
                            promotionSystem.cardEmbed.setColor(0x010101);
                    }
                } else {
                    promotionSystem.cardEmbed.setDescription(`|   **+${normalXP[classCard]} XP** // **+${normalCrystals[classCard]}** <a:crystal:1273453430190375043>  |`);
                    promotionSystem.cardEmbed.setColor(0x010101);
    
                    holographicValue = 'Normal';
                }
    
                promotionSystem.cardEmbed.addFields(
                    { name: '<:files:1228920361723236412>  File', value: `**[View Document](${file})**`, inline: true },
                );
    
                await interaction.editReply({
                    embeds: [promotionSystem.cardEmbed],
                    files: [image],
                });
        
                switch (promotionSystem.promotionType) {
                    case 'level':
                        await interaction.followUp(`<a:mixed_stars:1229605947895189534>  Nice, ${promotionSystem.userDocument.nickname}! You are now level **${promotionSystem.userDocument.level}**. <a:mixed_stars:1229605947895189534>`);
                        break;
                    case 'rank':
                        await interaction.followUp(`<a:mixed_stars:1229605947895189534>  Congrats, ${promotionSystem.userDocument.nickname}. You have been promoted to **${ranks[promotionSystem.indexCurrentElement]}**. <a:mixed_stars:1229605947895189534>`);
                        break;
                }
            } catch (error) {
                console.log(`${new Date()} >>> *** ERROR: capture.js *** by ${userId} (${interaction.user.username})`);
                console.error(error);

                await interaction.editReply('<a:error:1229592805710762128>  An error occurred while capturing the SCP. Please try again.');
            }
        }
    },
};

// * This function validates through fetching if the user has the Patreon role. That means is Premium.
// * Also, if the user is not in the server, it will return false.
async function checkingUserPremiumStatus(userId, interaction) {
    let isPremium = false;

    try {
        const guild = interaction.client.guilds.cache.get(guildId);
        const member = await guild.members.fetch(userId);

        const hasRole = member.roles.cache.has(VIPRoleId);

        isPremium = hasRole ? true : false;
    } catch (error) {
        isPremium = false;
    }

    // * If the user it's in the premium whitelist, it will be considered as premium.
    if (premiumWhitelist.includes(userId)) {
        isPremium = true;
    }

    return isPremium;
}

// * This function defines the probability per class (rarity) in an array,
// * and determines the class to choose based on cumulative probability.
function classProbability(isPremium) {
    const normalClasses = [
        { name: 'Safe', probability: 45 },
        { name: 'Euclid', probability: 30 },
        { name: 'Keter', probability: 21 },
        { name: 'Thaumiel', probability: 3 },
        { name: 'Apollyon', probability: 1 },
    ];

    const premiumClasses = [
        { name: 'Safe', probability: 40 },
        { name: 'Euclid', probability: 31 },
        { name: 'Keter', probability: 22 },
        { name: 'Thaumiel', probability: 4 },
        { name: 'Apollyon', probability: 3 },
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

// * This function defines the probability of getting holographic cards.
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

// * This function ensures that the card name with the title does not exceed the maximum character limit, which is 256.
// * To make sure that no errors occur, the function will limit the card name by 179 characters as maximum.
function limitCardName(cardName) {
    let fixedCardName = cardName;

    if (fixedCardName.length <= 179) {
        return fixedCardName;
    }

    fixedCardName = fixedCardName.slice(0, 180);

    // * If the last character is not a space, it will be removed until it finds one,
    // * to avoid cutting a word in half.
    while (fixedCardName[fixedCardName.length - 1] !== ' ') {
        fixedCardName = fixedCardName.slice(0, -1);
    }

    // * The original card name is replaced by the new one with an ellipsis.
    fixedCardName = fixedCardName.slice(0, -1) + '...';

    return fixedCardName;
}

// * This function performs the promotion process based on the user's type, level and rank.
// * Also, it adds the amount of crystals based on the SCP class and user type.
async function promotionProcess(classCard, holographicValue, userDocument, isPremium, userReference, cardEmbed, transaction) {
    let earnedXP = null;
    let crystals = null;

    if (isPremium) {
        earnedXP = premiumXP[classCard];
        crystals = premiumCrystals[classCard]; 
    } else {
        earnedXP = normalXP[classCard];
        crystals = normalCrystals[classCard];
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
            crystals: firebase.firestore.FieldValue.increment(crystals),
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
            crystals: firebase.firestore.FieldValue.increment(crystals),
        });
    }

    if (promotionType === 'rank') {
        await transaction.update(userReference, {
            rank: userDocument.rank,
            level: userDocument.level,
            xp: fullXP,
            dailyAttemptsRemaining: firebase.firestore.FieldValue.increment(-1),
            crystals: firebase.firestore.FieldValue.increment(crystals),
        });
    }

    userDocument.dailyAttemptsRemaining--;

    cardEmbed.setFooter({ text: `${userDocument.dailyAttemptsRemaining} ${userDocument.dailyAttemptsRemaining === 1 ? 'shot' : 'shots'} remaining` });

    return { cardEmbed, promotionType, userDocument, indexCurrentElement };
}
