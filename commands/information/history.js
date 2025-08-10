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
        .setName('history')
        .setDescription(
            'Offers bot theme details and a brief history of the SCP ' +
                'Foundation for context.',
        ),
    async execute(interaction) {
        // * Notify the Discord API that the interaction was received 
        // * successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply();

        // * Banner Image.
        const bannerImagePath = path
            .join(__dirname, '../../images/container/history-image-1.png');

        const bannerImageBuffer = await sharp(bannerImagePath)
            .resize(570, 70, { position: 'top' })
            .toBuffer();

        const bannerImage = new AttachmentBuilder(
            bannerImageBuffer,
            { name: 'history-image-1.png' },
        );

        // * Thumbnail Image.
        const thumbnailImagePath = path
            .join(__dirname, '../../images/container/history-image-2.gif');

        const thumbnailImage = new AttachmentBuilder(
            thumbnailImagePath,
            { name: 'history-image-2.gif' },
        );

        // * Image Gallery 1.
        const imageGallery1Path = path
            .join(__dirname, '../../images/container/history-image-3.jpg');

        const imageGallery1 = new AttachmentBuilder(
            imageGallery1Path,
            { name: 'history-image-3.jpg' },
        );

        // * Image Gallery 2.
        const imageGallery2Path = path
            .join(__dirname, '../../images/container/history-image-4.gif');

        const imageGallery2 = new AttachmentBuilder(
            imageGallery2Path,
            { name: 'history-image-4.gif' },
        );

        // * Banner.
        const bannerMediaGalleryItem = new MediaGalleryItemBuilder()
            .setURL('attachment://history-image-1.png');

        const bannerMediaGallery = new MediaGalleryBuilder()
            .addItems(bannerMediaGalleryItem);

       // * Header.
        const header = new TextDisplayBuilder()
            .setContent(
                `## ${process.env.EMOJI_BUILDING}  SCP Foundation`,
            );

        // * Separator 1.
        const separator1 = new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Small);

        // * Section.
        const textSection = new TextDisplayBuilder()
            .setContent(
                'Operating clandestinely and globally, The Foundation ' +
                    'operates beyond any jurisdiction, reinforced by major ' +
                    'national governments that have tasked it with ' +
                    'containing anomalous objects, entities, and phenomena. ' +
                    'These anomalies pose a significant threat to global ' +
                    'security, as they are capable of causing physical or ' +
                    'psychological harm.',
            );

        const thumbnailSection = new ThumbnailBuilder()
            .setURL('attachment://history-image-2.gif');

        const section = new SectionBuilder()
            .addTextDisplayComponents(textSection)
            .setThumbnailAccessory(thumbnailSection);

        // * Text.
        const text = new TextDisplayBuilder()
            .setContent(
                'The Foundation operates to maintain normalcy, ensuring that ' +
                    'the civilian population worldwide can live and carry on ' +
                    'their daily lives without fear, mistrust, or doubts ' +
                    'about their personal beliefs. It also works to maintain ' +
                    'human independence from extraterrestrial, ' +
                    'extradimensional, and generally extranormal influences.',
            );

        // * Separator 2.
        const separator2 = new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Small)
            .setDivider(false);

        // * Media Gallery.
        const mediaGalleryItem1 = new MediaGalleryItemBuilder()
            .setURL('attachment://history-image-3.jpg');

        const mediaGalleryItem2 = new MediaGalleryItemBuilder()
            .setURL('attachment://history-image-4.gif');

        const mediaGallery = new MediaGalleryBuilder()
            .addItems(mediaGalleryItem1, mediaGalleryItem2);

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
            .addTextDisplayComponents(header)
            .addSeparatorComponents(separator1)
            .addSectionComponents(section)
            .addTextDisplayComponents(text)
            .addSeparatorComponents(separator2)
            .addMediaGalleryComponents(mediaGallery)
            .addTextDisplayComponents(footer);

        await interaction.editReply({
            components: [container],
            files: [bannerImage, thumbnailImage, imageGallery1, imageGallery2],
            flags: [MessageFlags.IsComponentsV2],
        });
    },
};
