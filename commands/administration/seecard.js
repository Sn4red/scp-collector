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
    ContainerBuilder,
} = require('discord.js');

const path = require('node:path');
const wrap = require('word-wrap');
const firebase = require('../../utils/firebase');

const database = firebase.firestore();

module.exports = {
    cooldown: 1,
    data: new SlashCommandBuilder()
        .setName('seecard')
        .setDescription('Shows the card from the database.')
        .addStringOption(option =>
            option.setName('card')
                .setDescription('Card ID to inquire about.')
                .setRequired(true),
        )
        .addStringOption(option =>
            option.setName('holographic')
                .setDescription('Specify the holopraphic type if needed.')
                .setRequired(false)
                .addChoices(
                    { name: 'Emerald', value: 'Emerald' },
                    { name: 'Golden', value: 'Golden' },
                    { name: 'Diamond', value: 'Diamond' },
                ),
        )
        .setContexts(['Guild']),
    async execute(interaction) {
        const userId = interaction.user.id;
        const adminId = process.env.DISCORD_ADMINISTRATOR_ID;

        // * Notify the Discord API that the interaction was received
        // * successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply();

        // ! If the user is not the administrator, returns an error message.
        if (userId !== adminId) {
            const errorMessage = new TextDisplayBuilder()
                .setContent(
                    `${process.env.EMOJI_ERROR}  You are not the ` +
                        'administrator!',
                );

            await interaction.editReply({
                components: [errorMessage],
                flags: [MessageFlags.IsComponentsV2],
            });

            return;
        }

        const cardId = interaction.options.getString('card');
        const holographic = interaction.options.getString('holographic');

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
        
        const foundCard = await findCard(fixedCardId);

        // ! If the card is not found, returns an error message.
        if (!foundCard.wasFound) {
            const errorMessage = new TextDisplayBuilder()
                .setContent(
                    `${process.env.EMOJI_MAGNIFYING}  Card ` +
                        `\`${fixedCardId}\` not found!`,
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
        
        const cardData = foundCard.cardData;

        // * Through the word-wrap library, the card name is wrapped to a
        // * maximum of 46 characters per line, with no indentation. This
        // * is to ensure that the container size doesn't get longer.
        const cardName = wrap(cardData.name, {
            indent: '',
            width: 46,
        });

        // * The holographic emoji and container color are obtained
        // * based on the holographic type of the card.
        const holographicFeature = getHolographicFeature(holographic);
        const holographicEmoji = holographicFeature.holographicEmoji;
        const containerColor = holographicFeature.containerColor;

        // * Card ID.
        const textCardId = new TextDisplayBuilder()
            .setContent(
                `## ${holographicEmoji}  Item #: \`${fixedCardId}\``,
            );

        // * Separator.
        const separator = new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Small);

        // * Section.
        // * Class.
        const textClass = new TextDisplayBuilder()
            .setContent(
                `${process.env.EMOJI_INVADER}  Class\n` +
                    `\`${foundCard.class}\``,
            );

        // * File.
        const buttonFile = new ButtonBuilder()
            .setURL(cardData.file)
            .setLabel('File')
            .setEmoji(process.env.EMOJI_FILES)
            .setStyle(ButtonStyle.Link);

        const section = new SectionBuilder()
            .addTextDisplayComponents(textClass)
            .setButtonAccessory(buttonFile);
        
        // * Image.
        const imagePath = path
            .join(__dirname, `../../images/scp/${fixedCardId}.jpg`);
        const image = new AttachmentBuilder(imagePath);

        const mediaGalleryItemComponent = new MediaGalleryItemBuilder()
            .setURL(`attachment://${fixedCardId}.jpg`);

        const mediaGallery = new MediaGalleryBuilder()
            .addItems(mediaGalleryItemComponent);

        // * Name.
        const textName = new TextDisplayBuilder()
            .setContent(`*${cardName}*`);

        // * Container.
        const container = new ContainerBuilder()
            .setAccentColor(containerColor)
            .addTextDisplayComponents(textCardId)
            .addSeparatorComponents(separator)
            .addSectionComponents(section)
            .addMediaGalleryComponents(mediaGallery)
            .addTextDisplayComponents(textName);

        await interaction.editReply({
            components: [container],
            files: [image],
            flags: [MessageFlags.IsComponentsV2],
        });
    },
};

// * This function searches for the card data through all the card collections.
async function findCard(cardId) {
    const cardReferences = [
        database.collection('card')
            .doc('Safe').collection('safe').doc(cardId),
        database.collection('card')
            .doc('Euclid').collection('euclid').doc(cardId),
        database.collection('card')
            .doc('Keter').collection('keter').doc(cardId),
        database.collection('card')
            .doc('Thaumiel').collection('thaumiel').doc(cardId),
        database.collection('card')
            .doc('Apollyon').collection('apollyon').doc(cardId),
    ];

    const cardPromises = cardReferences.map(reference => reference.get());

    const snapshots = await Promise.all(cardPromises);

    for (const snapshot of snapshots) {
        if (snapshot.exists) {
            const cardData = snapshot.data();

            // * It splits the reference path in an array to get the class name
            // * of the card.
            const pathSegments = snapshot.ref.path.split('/');
            const className = pathSegments[1];

            // * If the card exist, it returns the card data and the class name.
            return {
                wasFound: true,
                cardData: cardData,
                class: className,
            };
        }
    }

    // * If the card is not found in any collection, in other words, the card
    // * does not exist, it returns false.
    return {
        wasFound: false,
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
