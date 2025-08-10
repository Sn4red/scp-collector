const {
    SlashCommandBuilder,
    AttachmentBuilder,
    MessageFlags,
    MediaGalleryItemBuilder,
    MediaGalleryBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ThumbnailBuilder,
    SectionBuilder,
    ContainerBuilder,
} = require('discord.js');

const {
    defaultAccentColor,
} = require('../../utils/foundationConfig');

const path = require('node:path');
const sharp = require('sharp');

module.exports = {
    cooldown: 60 * 30,
    data: new SlashCommandBuilder()
        .setName('merges')
        .setDescription('Explains about how merge works.'),
    async execute(interaction) {
        // * Notify the Discord API that the interaction was received
        // * successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply();

        // * Banner Image.
        const bannerImagePath = path
            .join(__dirname, '../../images/container/merges-image-1.png');

        const bannerImageBuffer = await sharp(bannerImagePath)
            .resize(570, 70)
            .toBuffer();

        const bannerImage = new AttachmentBuilder(
            bannerImageBuffer,
            { name: 'merges-image-1.png' },
        );

        // * Thumbnail Image.
        const thumbnailImagePath = path
            .join(__dirname, '../../images/container/merges-image-2.gif');

        const thumbnailImage = new AttachmentBuilder(
            thumbnailImagePath,
            { name: 'merges-image-2.gif' },
        );

        // * Banner.
        const BannerMediaGalleryItem = new MediaGalleryItemBuilder()
            .setURL('attachment://merges-image-1.png');

        const bannerMediaGallery = new MediaGalleryBuilder()
            .addItems(BannerMediaGalleryItem);

        // * Header 1.
        const header1 = new TextDisplayBuilder()
            .setContent(`## ${process.env.EMOJI_CHEST}  Merges`);

        // * Separator 1.
        const separator1 = new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Small);

        // * Section.
        const textSection = new TextDisplayBuilder()
            .setContent(
                'A merge consists in transforming 5 cards and converting ' +
                    'them into a single card of a higher class. The cards ' +
                    'used can be from different classes, but the class of ' +
                    'the resulting card will always be higher than the class ' +
                    'of the majority of the cards used. The following are ' +
                    'examples of merges:',
            );

        const thumbnailSection = new ThumbnailBuilder()
            .setURL('attachment://merges-image-2.gif');

        const section1 = new SectionBuilder()
            .addTextDisplayComponents(textSection)
            .setThumbnailAccessory(thumbnailSection);

        // * Separator 2.
        const separator2 = new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Small)
            .setDivider(false);

        // * Text 1.
        const text1 = new TextDisplayBuilder()
            .setContent(
                '- `3 Safe` // `2 Keter` will merge to give and **Euclid** ' +
                    'card.\n' +
                    '- `4 Euclid` // `1 Safe` will merge to give a **Keter** ' +
                    'card.\n' +
                    '- `5 Euclid` will merge to give a **Keter** card.\n\n' +
                    'If there is no a single majority group of cards, for ' +
                    'example, `2 Safe` // `2 Euclid` // `1 Keter`, the ' +
                    'result will be random between an **Euclid** or ' +
                    '**Keter** card.',
            );

        // * Separator 3.
        const separator3 = new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Small)
            .setDivider(false);

        // * Header 2.
        const header2 = new TextDisplayBuilder()
            .setContent(
                `## ${process.env.EMOJI_HOLOGRAPHIC_CARD}  Holographics`,
            );

        // * Separator 4.
        const separator4 = new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Small);

        // * Text 2.
        const text2 = new TextDisplayBuilder()
            .setContent(
                'For the resulting card to have a holograpic feature, the ' +
                    'following probabilities will be considered:\n\n' +
                    `- ${process.env.EMOJI_EMERALD}  Emerald -> 7% ` +
                    'probability\n' +
                    `- ${process.env.EMOJI_GOLDEN}   Golden -> 2% ` +
                    'probability\n' +
                    `- ${process.env.EMOJI_DIAMOND}   Diamond -> 0.7% ` +
                    'probability',
            );

        // * Separator 5.
        const separator5 = new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Small)
            .setDivider(false);

        // * Header 3.
        const header3 = new TextDisplayBuilder()
            .setContent(
                `## ${process.env.EMOJI_DISTORTED_WARNING}  Limitations`,
            );

        // * Separator 6.
        const separator6 = new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Small);

        // * Text 3.
        const text3 = new TextDisplayBuilder()
            .setContent(
                'Note that this function is only limited to Safe, Euclid and ' +
                    'Keter class cards with **no holographic attributes**.',
            );

        // * Separator 7.
        const separator7 = new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Small)
            .setDivider(false);

        // * Footer.
        const footer = new TextDisplayBuilder()
            .setContent(
                '### Use /`commands` to see the full list of available ' +
                    'commands.',
            );

        // * Container.
        const container = new ContainerBuilder()
            .setAccentColor(defaultAccentColor)
            .addMediaGalleryComponents(bannerMediaGallery)
            .addTextDisplayComponents(header1)
            .addSeparatorComponents(separator1)
            .addSectionComponents(section1)
            .addSeparatorComponents(separator2)
            .addTextDisplayComponents(text1)
            .addSeparatorComponents(separator3)
            .addTextDisplayComponents(header2)
            .addSeparatorComponents(separator4)
            .addTextDisplayComponents(text2)
            .addSeparatorComponents(separator5)
            .addTextDisplayComponents(header3)
            .addSeparatorComponents(separator6)
            .addTextDisplayComponents(text3)
            .addSeparatorComponents(separator7)
            .addTextDisplayComponents(footer);

        await interaction.editReply({
            components: [container],
            files: [bannerImage, thumbnailImage],
            flags: [MessageFlags.IsComponentsV2],
        });
    },
};
