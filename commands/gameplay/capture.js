const {
    SlashCommandBuilder,
    AttachmentBuilder,
    MessageFlags,
    MediaGalleryItemBuilder,
    MediaGalleryBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ButtonBuilder,
    ButtonStyle,
    SectionBuilder,
    ContainerBuilder } = require('discord.js');
const firebase = require('../../utils/firebase');
const path = require('node:path');
const wrap = require('word-wrap');
const premiumWhitelist = require('../../utils/premiumWhitelist');

const database = firebase.firestore();

const guildId = process.env.DISCORD_SERVER_ID;
const VIPRoleId = process.env.DISCORD_VIP_ROLE_ID;

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

// * The additional XP obtained based on the holographic type.
const holographicXP = {
    'Normal': 0,
    'Emerald': 40,
    'Golden': 70,
    'Diamond': 100,
};

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
        // * Notify the Discord API that the interaction was received
        // * successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply();

        const userId = interaction.user.id;

        const userReference = database.collection('user').doc(userId);
        let userSnapshot = await userReference.get();

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

        /**
         * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
         * * The command passes all validations and the operation is performed.*
         * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
         */

        // * Data is retrieved from here for daily limit validation.
        let userDocument = userSnapshot.data();

        // * Validates if there are still daily captures available.
        if (userDocument.dailyAttemptsRemaining === 0) {
            const errorMessage = new TextDisplayBuilder()
                .setContent(
                    `${process.env.EMOJI_RED_SIREN}  You have reached the ` +
                        'daily limit of SCP captures.',
                );

            await interaction.editReply({
                components: [errorMessage],
                flags: [MessageFlags.IsComponentsV2],
            });
        } else {
            const isPremium = await checkingUserPremiumStatus(
                userId,
                interaction,
            );
            
            // * Class obtained through probability.
            const obtainedClass = classProbability(isPremium);

            let cardId = null;
            let cardClass = null;
            let cardFile = null;
            let cardName = null;

            let holographicValue = 'Normal';

            // * Only premium users can obtain holographic cards.
            if (isPremium) {
                holographicValue = holographicProbability();
            }

            // * The holographic emoji and container color are obtained
            // * based on the holographic value.
            const holographicFeature = getHolographicFeature(
                holographicValue,
            );
            const holographicEmoji = holographicFeature
                .holographicEmoji;
            const containerColor = holographicFeature.containerColor;

            let cardContainer = null;
            let promotionResults = null;
    
            try {
                await database.runTransaction(async (transaction) => {
                    // * Retrieves the user data from the database. This is
                    // * used below to check the user's stats.
                    userSnapshot = await transaction.get(userReference);
                    userDocument = userSnapshot.data();

                    // * Retrieves through Aggregation Query the numbers of
                    // * documents contained in the collection.
                    const cardReference = database.collection('card')
                        .doc(obtainedClass)
                        .collection(obtainedClass.toLowerCase());
                    const cardSnapshot = await transaction
                        .get(cardReference.count());

                    const classCount = cardSnapshot.data().count;

                    // * Using the Math object, a random number is obtained
                    // * based on the number of cards, and a random card is
                    // * selected matching the random number with the 'random'
                    // * field in the document. We add 1 to the result in case
                    // * it returns 0.
                    const randomNumber = Math
                        .floor(Math.random() * classCount) + 1;
                    
                    const selectedCardReference = database.collection('card')
                        .doc(obtainedClass)
                        .collection(obtainedClass.toLowerCase());
                    const selectedCardQuery = selectedCardReference
                        .where('random', '==', randomNumber);
                    const selectedCardSnapshot = await transaction
                        .get(selectedCardQuery);
                    
                    const cardDocument = selectedCardSnapshot.docs[0];
                    const selectedCardDocument = cardDocument.data();

                    // * Card data.
                    cardId = cardDocument.id;
                    cardClass = obtainedClass;
                    cardFile = selectedCardDocument.file;
                    cardName = selectedCardDocument.name;

                    // * The entry of obtaining the card is inserted.
                    const obtainingEntry = database.collection('user')
                        .doc(userSnapshot.id).collection('obtaining').doc();
    
                    await transaction.set(obtainingEntry, {
                        card: database.collection('card')
                            .doc(obtainedClass)
                            .collection(obtainedClass.toLowerCase())
                            .doc(cardId),
                        holographic: holographicValue,
                    });

                    // * To ensure all images have the same size, they are
                    // * resized to 300x200 pixels. The definition of the
                    // * container is performed here because it is needed by the
                    // * promotionProcess function.
                    cardContainer = createCardContainer(
                        holographicEmoji,
                        containerColor,
                        cardId,
                        cardClass,
                        cardFile,
                        cardName,
                    );

                    // * The rank and level promotion is performed here, along
                    // * with the increase of daily limits.
                    promotionResults = await promotionProcess(
                        cardClass,
                        holographicValue,
                        userDocument,
                        isPremium,
                        userReference,
                        transaction,
                    );
                });

                const imagePath = path
                    .join(__dirname, `../../images/scp/${cardId}.jpg`);
                const image = new AttachmentBuilder(imagePath);

                const resultsContainer = createResultsContainer(
                    holographicValue,
                    holographicEmoji,
                    cardClass,
                    isPremium,
                    promotionResults,
                );
    
                await interaction.editReply({
                    components: [cardContainer, resultsContainer],
                    files: [image],
                    flags: [MessageFlags.IsComponentsV2],
                });
            } catch (error) {
                console.log(
                    `${new Date()} >>> *** ERROR: capture.js *** by ` +
                        `${userId} (${interaction.user.username})`,
                );
                console.error(error);

                const errorMessage = new TextDisplayBuilder()
                    .setContent(
                        `${process.env.EMOJI_ERROR}  An error occurred while ` +
                            'capturing the SCP. Please try again.',
                    );

                await interaction.editReply({
                    components: [errorMessage],
                    flags: [MessageFlags.IsComponentsV2],
                });
            }
        }
    },
};

// * This function validates through fetching if the user has the Patreon
// * role. That means is Premium. Also, if the user is not in the server, it
// * will return false.
async function checkingUserPremiumStatus(userId, interaction) {
    let isPremium = false;

    try {
        const guild = interaction.client.guilds.cache.get(guildId);
        const member = await guild.members.fetch(userId);

        const hasRole = member.roles.cache.has(VIPRoleId);

        isPremium = hasRole ? true : false;
    } catch {
        isPremium = false;
    }

    // * If the user it's in the premium whitelist, it will be considered as
    // * premium.
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
     * * This algorithm sets the probability of drawing holographic cards as
     * * follows:
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

// * This function returns the holographic emoji and container color for the
// * card, based on the holographic type.
function getHolographicFeature(cardHolographic) {
    let holographicEmoji = null;
    let containerColor = null;

    switch (cardHolographic) {
        case 'Emerald':
            holographicEmoji = `${process.env.EMOJI_EMERALD}`;
            containerColor = 0x00b65c;

            break;
        case 'Golden':
            holographicEmoji = `${process.env.EMOJI_GOLDEN}`;
            containerColor = 0xffd700;

            break;
        case 'Diamond':
            holographicEmoji = `${process.env.EMOJI_DIAMOND}`;
            containerColor = 0x00bfff;

            break;
        default:
            holographicEmoji = ' ';
            containerColor = 0x010101;

            break;
    }

    return {
        holographicEmoji: holographicEmoji,
        containerColor: containerColor,
    };
}

// * Creates the container for the card.
function createCardContainer(
    holographicEmoji,
    containerColor,
    cardId,
    cardClass,
    cardFile,
    cardName,
) {
    // * Through the word-wrap library, the card name is wrapped to a
    // * maximum of 46 characters per line, with no indentation. This
    // * is to ensure that the container size doesn't get longer.
    const fixedCardName = wrap(cardName, {
        indent: '',
        width: 46,
    });

    // * Card ID.
    const textCardId = new TextDisplayBuilder()
        .setContent(`## ${holographicEmoji}  Item #: \`${cardId}\``);

    // * Separator.
    const separator = new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small);

    // * Section.
    // * Class.
    const textClass = new TextDisplayBuilder()
        .setContent(
            `${process.env.EMOJI_INVADER}  Class\n` +
                `\`${cardClass}\``,
        );

    // * File.
    const buttonFile = new ButtonBuilder()
        .setURL(cardFile)
        .setLabel('File')
        .setEmoji(process.env.EMOJI_FILES)
        .setStyle(ButtonStyle.Link);

    const section = new SectionBuilder()
        .addTextDisplayComponents(textClass)
        .setButtonAccessory(buttonFile);

    // * Image.
    const mediaGalleryItemComponent = new MediaGalleryItemBuilder()
        .setURL(`attachment://${cardId}.jpg`);

    const mediaGallery = new MediaGalleryBuilder()
        .addItems(mediaGalleryItemComponent);

    // * Name.
    const textName = new TextDisplayBuilder()
        .setContent(
            `*${fixedCardName}*`,
        );

    // * Container.
    const container = new ContainerBuilder()
        .setAccentColor(containerColor)
        .addTextDisplayComponents(textCardId)
        .addSeparatorComponents(separator)
        .addSectionComponents(section)
        .addMediaGalleryComponents(mediaGallery)
        .addTextDisplayComponents(textName);

    return container;
}

// * This function performs the promotion process based on the user's type,
// * level and rank. Also, it adds the amount of crystals based on the SCP class
// * and user type.
async function promotionProcess(
    cardClass,
    holographicValue,
    userDocument,
    isPremium,
    userReference,
    transaction,
) {
    let earnedXP = null;
    let crystals = null;

    if (isPremium) {
        earnedXP = premiumXP[cardClass];
        crystals = premiumCrystals[cardClass];
    } else {
        earnedXP = normalXP[cardClass];
        crystals = normalCrystals[cardClass];
    }

    let maxXP = userXP[userDocument.rank];

    // * The variable determines what type of promotion will be performed (rank
    // * or level), so that a different type of message is displayed.
    let promotionType = 'none';

    // * This section retrieves the next rank based on the user's current rank.
    // * If the current rank is 'Council O5 Member', there is no promotion.
    let indexCurrentElement = ranks.indexOf(userDocument.rank);
    indexCurrentElement++;

    if (indexCurrentElement === 7) {
        indexCurrentElement--;
    }

    let fullXP = userDocument.xp + earnedXP + holographicXP[holographicValue];

    let rankPromotion = false;

    if (fullXP >= maxXP) {
        while (fullXP >= maxXP) {
            if (userDocument.level < 500) {
                fullXP -= maxXP;
                userDocument.level++;
    
                promotionType = 'level';
            } else {
                // * If the rank is O5 Council Member, after level 500 keeps
                // * leveling up.
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

    return { promotionType, userDocument, indexCurrentElement };
}

// * Creates the results container that will display the results of the capture
// * operation, such as the holographic type, class, XP, crystals, and
// * promotion messages.
function createResultsContainer(
    holographicValue,
    holographicEmoji,
    cardClass,
    isPremium,
    promotionResults,
) {
    let totalXP = null;
    let crystals = null;

    if (isPremium) {
        totalXP = premiumXP[cardClass] + holographicXP[holographicValue];
        crystals = premiumCrystals[cardClass];
    } else {
        totalXP = normalXP[cardClass] + holographicXP[holographicValue];
        crystals = normalCrystals[cardClass];
    }

    // * Header.
    const header = new TextDisplayBuilder()
        .setContent(`### ${process.env.EMOJI_DICE}  Results`);

    // * Separator.
    const separator = new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small);

    // * Stats.
    const textStats = new TextDisplayBuilder()
        .setContent(
            `${holographicEmoji}  ${cardClass} +\`${totalXP}\` XP\n` +
                `Crystals: +\`${crystals}\`${process.env.EMOJI_CRYSTAL}`,
        );

    // * Container.
    const container = new ContainerBuilder()
        .setAccentColor(0x010101)
        .addTextDisplayComponents(header)
        .addSeparatorComponents(separator)
        .addTextDisplayComponents(textStats);

    switch (promotionResults.promotionType) {
        case 'level': {
            const textLevelUpMessage = new TextDisplayBuilder()
                .setContent(
                    `${process.env.EMOJI_MIXED_STARS}  Nice, ` +
                        `\`${promotionResults.userDocument.nickname}\`! You ` +
                        'are now level ' +
                        `**${promotionResults.userDocument.level}**. ` +
                        `${process.env.EMOJI_MIXED_STARS}`,
                );

            container.addTextDisplayComponents(textLevelUpMessage);

            break;
        }
        case 'rank': {
            const textRankUpMessage = new TextDisplayBuilder()
                .setContent(
                    `${process.env.EMOJI_MIXED_STARS}  Congrats, ` +
                        `\`${promotionResults.userDocument.nickname}\`. You ` +
                        'have been promoted to ' +
                        `**${ranks[promotionResults.indexCurrentElement]}**. ` +
                        `${process.env.EMOJI_MIXED_STARS}`,
                );

            container.addTextDisplayComponents(textRankUpMessage);

            break;
        }
    }

    const shotsRemaining = promotionResults.userDocument.dailyAttemptsRemaining;

    // * Shots remaining.
    const textShotsRemaining = new TextDisplayBuilder()
        .setContent(
            `You have \`${shotsRemaining}\` ` +
                `${shotsRemaining === 1 ? 'shot' : 'shots'} remaining.`,
        );

    container.addTextDisplayComponents(textShotsRemaining);

    return container;
}
