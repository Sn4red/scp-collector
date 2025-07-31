const {
    SlashCommandBuilder,
    MessageFlags,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    SectionBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    ContainerBuilder,
    ComponentType,
    AttachmentBuilder,
} = require('discord.js');
const path = require('node:path');
const firebase = require('../../utils/firebase');
const wrap = require('word-wrap');
const { Filter } = require('firebase-admin/firestore');

const database = firebase.firestore();

module.exports = {
    cooldown: 20,
    data: new SlashCommandBuilder()
        .setName('buy')
        .setDescription(
            'Buys a card that is currently in the market, using your crystals.',
        )
        .addStringOption(option =>
            option.setName('card')
                .setDescription('Card ID to buy.')
                .setRequired(true)),
    async execute(interaction) {
        // * Notify the Discord API that the interaction was received
        // * successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply({
            flags: [MessageFlags.Ephemeral],
        });

        const userId = interaction.user.id;

        const userReference = database.collection('user').doc(userId);
        let userSnapshot = await userReference.get();
        let userDocument = userSnapshot.data();

        // ! If the user is not registered, returns an error message.
        if (!userSnapshot.exists) {
            const errorMessage = new TextDisplayBuilder()
                .setContent(
                    `${process.env.EMOJI_ERROR}  You are not registered! Use ` +
                        '/`card` to start playing.',
                );

            await interaction.editReply({
                components: [errorMessage],
                flags: [MessageFlags.IsComponentsV2],
            });
            return;
        }

        const cardId = interaction.options.getString('card');

        const fixedCardId = cardId.toUpperCase();
        const cardIdValidation = /^scp-\d{3,4}$/i.test(fixedCardId);

        // ! If the field has wrong data, returns an error message.
        if (!cardIdValidation) {
            const errorMessage = new TextDisplayBuilder()
                .setContent(
                    `${process.env.EMOJI_ERROR}  Invalid card ID format. ` +
                        'Please use the following format: `SCP-XXXX`.',
                );

            await interaction.editReply({
                components: [errorMessage],
                flags: [MessageFlags.IsComponentsV2],
            });
            return;
        }

        const foundCardInMarket = await findCardInMarket(fixedCardId);

        // ! If the card is not found in the market, returns an error message.
        if (!foundCardInMarket.wasFound) {
            const errorMessage = new TextDisplayBuilder()
                .setContent(
                    `${process.env.EMOJI_ERROR}  Card \`${fixedCardId}\` is ` +
                        'not on the market!',
                );

            await interaction.editReply({
                components: [errorMessage],
                flags: [MessageFlags.IsComponentsV2],
            });
            return;
        }

        const foundCardInformation = await findCardInformation(
            fixedCardId,
            foundCardInMarket.marketDocument,
            userDocument,
        );

        // ! If the card has already been purchased, returns an error message.
        if (foundCardInformation.isAlreadyPurchased) {
            const errorMessage = new TextDisplayBuilder()
                .setContent(
                    `${process.env.EMOJI_ERROR}  You already bought this card!`,
                );

            await interaction.editReply({
                components: [errorMessage],
                flags: [MessageFlags.IsComponentsV2],
            });
            return;
        }

        const cardReference = foundCardInformation.cardReference;
        const cardData = foundCardInformation.cardData;
        const cardClass = foundCardInformation.cardClass;
        const cardFile = cardData.file;
        const cardName = cardData.name;
        const cardHolographic = foundCardInformation.cardHolographic;
        const crystals = getCardCrystals(cardClass, cardHolographic);
        
        // * The holographic emoji and container color are obtained
        // * based on the holographic type of the card.
        const holographicFeature = getHolographicFeature(cardHolographic);
        const holographicEmoji = holographicFeature.holographicEmoji;
        const containerColor = holographicFeature.containerColor;

        const confirmationContainer = createConfirmationContainer(
            holographicEmoji,
            fixedCardId,
            cardClass,
            crystals,
        );

        const reply = await interaction.editReply({
            components: [confirmationContainer],
            flags: [MessageFlags.IsComponentsV2],
        });

        // * Although the reply is ephemeral and only the command executor can
        // * interact with it, this filter is kept for security purposes and
        // * code clarity.
        const collectorFilter = (userInteraction) =>
            userInteraction.user.id === userId;
        // * The time is set to 10 seconds. Less time than the command cooldown,
        // * so the user can't spawn more than 1 collector at the same time,
        // * which could cause glitches, like buying the card multiple times.
        const time = 1000 * 10;

        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: collectorFilter,
            time: time,
        });

        let deletedMessage = false;

        // * Collector listener for the confirmation buttons.
        // * The return statements are used to get out of the collector event.
        collector.on('collect', async (button) => {
            if (button.customId === 'btnConfirm') {
                deletedMessage = true;

                try {
                    await database.runTransaction(async (transaction) => {
                        userSnapshot = await transaction.get(userReference);
                        userDocument = userSnapshot.data();

                        // ! If the user doesn't have enough crystals, returns
                        // ! an error message.
                        if (userDocument.crystals < crystals) {
                            const errorMessage =
                                `${process.env.EMOJI_ERROR}  You don't have ` +
                                    'enough crystals to buy this card! ' +
                                    '(you\'re short ' +
                                    `${process.env.EMOJI_CRYSTAL} ` +
                                    `**${crystals - userDocument.crystals}**)`;

                            throw new Error(errorMessage);
                        }

                        /**
                         * * * * * * * * * * * * * * * * * * * * * * * * * * * *
                         * * The command passes all validations and the * * * *
                         * * operation is performed. * * * * * * * * * * * * * *
                         * * * * * * * * * * * * * * * * * * * * * * * * * * * *
                         */

                        const obtainingEntry = database.collection('user')
                            .doc(userSnapshot.id).collection('obtaining').doc();

                        await transaction.set(obtainingEntry, {
                            card: cardReference,
                            holographic: cardHolographic,
                        });

                        await updateUser(
                            userReference,
                            crystals,
                            fixedCardId,
                            foundCardInMarket.marketDocument,
                            transaction,
                        );
                    });

                    const cardContainer = new createCardContainer(
                        holographicEmoji,
                        containerColor,
                        fixedCardId,
                        cardClass,
                        cardFile,
                        cardName,
                    );

                    const imagePath = path
                        .join(__dirname, `../../images/scp/${fixedCardId}.jpg`);
                    const image = new AttachmentBuilder(imagePath);

                    await interaction.followUp({
                        components: [cardContainer],
                        files: [image],
                        flags: [
                            MessageFlags.IsComponentsV2,
                            MessageFlags.Ephemeral,
                        ],
                    });

                    await interaction.deleteReply();
                } catch (error) {
                    if (error.message.includes('You don\'t have enough ' +
                            'crystals to buy this card!')) {

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
                            `${new Date()} >>> *** ERROR: buy.js *** by ` +
                                `${userId} (${interaction.user.username})`,
                        );
                        console.error(error);

                        const errorMessage = new TextDisplayBuilder()
                            .setContent(
                                `${process.env.EMOJI_ERROR}  An error has ` +
                                    'occurred while trying to buy a card. ' +
                                    'Please try again.',
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

            if (button.customId === 'btnCancel') {
                deletedMessage = true;

                await interaction.deleteReply();
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

// * This function validates if the card in question is in the market.
async function findCardInMarket(cardId) {
    const marketReference = database.collection('market');
    const marketQuery = marketReference.where(
        Filter.or(
            Filter.where('card1Id', '==', cardId),
            Filter.where('card2Id', '==', cardId),
            Filter.where('card3Id', '==', cardId),
            Filter.where('card4Id', '==', cardId),
            Filter.where('card5Id', '==', cardId),
        ),
    );
    const marketSnapshot = await marketQuery.get();

    if (marketSnapshot.empty) {
        return { wasFound: false };
    } else {
        return {
            wasFound: true,
            marketDocument: marketSnapshot.docs[0].data(),
        };
    }
}

// * This function retrieves the card information from the database, based on
// * the card ID. It also checks if the user has already purchased the card,
// * taking advantage of the operation of the same switch.
async function findCardInformation(cardId, marketDocument, userDocument) {
    let cardSnapshot = null;
    let cardData = null;
    let cardHolographic = null;
    let isAlreadyPurchased = false;

    switch (cardId) {
        case marketDocument.card1Id:
            cardSnapshot = await marketDocument.card1.get();
            cardData = cardSnapshot.data();
            cardHolographic = marketDocument.holographic1;

            if (userDocument.card1Purchased) {
                isAlreadyPurchased = true;
            }

            break;
        case marketDocument.card2Id:
            cardSnapshot = await marketDocument.card2.get();
            cardData = cardSnapshot.data();
            cardHolographic = marketDocument.holographic2;

            if (userDocument.card2Purchased) {
                isAlreadyPurchased = true;
            }

            break;
        case marketDocument.card3Id:
            cardSnapshot = await marketDocument.card3.get();
            cardData = cardSnapshot.data();
            cardHolographic = marketDocument.holographic3;

            if (userDocument.card3Purchased) {
                isAlreadyPurchased = true;
            }
            
            break;
        case marketDocument.card4Id:
            cardSnapshot = await marketDocument.card4.get();
            cardData = cardSnapshot.data();
            cardHolographic = marketDocument.holographic4;

            if (userDocument.card4Purchased) {
                isAlreadyPurchased = true;
            }
            
            break;
        case marketDocument.card5Id:
            cardSnapshot = await marketDocument.card5.get();
            cardData = cardSnapshot.data();
            cardHolographic = marketDocument.holographic5;

            if (userDocument.card5Purchased) {
                isAlreadyPurchased = true;
            }
            
            break;
    }

    // * It splits the reference path in an array to get the class name of the
    // * card.
    const pathSegments = cardSnapshot.ref.path.split('/');
    const cardClass = pathSegments[1];

    return {
        cardReference: cardSnapshot.ref,
        cardData: cardData,
        cardClass: cardClass,
        cardHolographic: cardHolographic,
        isAlreadyPurchased: isAlreadyPurchased,
    };
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

// * This function calculates the cost of the card based on the class and
// * holographic (if any).
function getCardCrystals(cardClass, cardHolographic) {
    let crystals = 0;

    switch (cardClass) {
        case 'Safe':
            crystals = 1000;
            break;
        case 'Euclid':
            crystals = 2000;
            break;
        case 'Keter':
            crystals = 3000;
            break;
        case 'Thaumiel':
            crystals = 5000;
            break;
        case 'Apollyon':
            crystals = 10000;
            break;
    }

    switch (cardHolographic) {
        case 'Emerald':
            crystals += 200;
            break;
        case 'Golden':
            crystals += 300;
            break;
        case 'Diamond':
            crystals += 500;
            break;
    }

    return crystals;
}

// * Creates the confirmation container with the card details and price.
function createConfirmationContainer(
    holographicEmoji,
    cardId,
    cardClass,
    crystals,
) {
    // * Header.
    const confirmHeader = new TextDisplayBuilder()
        .setContent(
            `### ${process.env.EMOJI_STOP}  Are you sure you want to buy ` +
                'this card?',
        );

    // * Separator.
    const separator = new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small);

    // * Details.
    const detailsText = new TextDisplayBuilder()
        .setContent(
            `Card:  ${holographicEmoji.trim()} \`${cardId}\`\n` +
                `Class:  \`${cardClass}\`\n` +
                `Price: ${process.env.EMOJI_CRYSTAL} \`${crystals}\``,
        );

    // * Confirmation buttons.
    const confirmButton = new ButtonBuilder()
        .setCustomId('btnConfirm')
        .setLabel('Confirm')
        .setStyle(ButtonStyle.Danger);
    
    const cancelButton = new ButtonBuilder()
        .setCustomId('btnCancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary);

    const confirmationRow = new ActionRowBuilder()
        .addComponents(confirmButton, cancelButton);

    // * Container.
    const confirmationContainer = new ContainerBuilder()
        .setAccentColor(0x010101)
        .addTextDisplayComponents(confirmHeader)
        .addSeparatorComponents(separator)
        .addTextDisplayComponents(detailsText)
        .addActionRowComponents(confirmationRow);

    return confirmationContainer;
}

async function updateUser(
    userReference,
    crystals,
    cardId,
    marketDocument,
    transaction,
) {
    const changeObject = {};

    switch (cardId) {
        case marketDocument.card1Id:
            changeObject.crystals = firebase.firestore.FieldValue
                .increment(-crystals);
            changeObject.card1Purchased = true;

            break;
        case marketDocument.card2Id:
            changeObject.crystals = firebase.firestore.FieldValue
                .increment(-crystals);
            changeObject.card2Purchased = true;

            break;
        case marketDocument.card3Id:
            changeObject.crystals = firebase.firestore.FieldValue
                .increment(-crystals);
            changeObject.card3Purchased = true;

            break;
        case marketDocument.card4Id:
            changeObject.crystals = firebase.firestore.FieldValue
                .increment(-crystals);
            changeObject.card4Purchased = true;
                    
            break;
        case marketDocument.card5Id:
            changeObject.crystals = firebase.firestore.FieldValue
                .increment(-crystals);
            changeObject.card5Purchased = true;
                        
            break;
    }

    await transaction.update(userReference, changeObject);
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
