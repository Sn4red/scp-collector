const path = require('node:path');
const sharp = require('sharp');
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
    ContainerBuilder } = require('discord.js');

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

        // * Image 1.
        const image1Path = path
            .join(__dirname, '../../images/container/history-image-1.png');

        const buffer1 = await sharp(image1Path)
            .resize(570, 70, { position: 'top' })
            .toBuffer();

        const image1 = new AttachmentBuilder(
            buffer1,
            { name: 'history-image-1.png' },
        );

        const mediaGalleryItem1Component1 = new MediaGalleryItemBuilder()
            .setURL('attachment://history-image-1.png');

        const mediaGallery1 = new MediaGalleryBuilder()
            .addItems(mediaGalleryItem1Component1);

       // * Header 1.
        const header1 = new TextDisplayBuilder()
            .setContent(
                `## ${process.env.EMOJI_BUILDING}  SCP Foundation`,
            );

        // * Separator 1.
        const separator1 = new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Small);

        // * Section 1.
        const textSection1 = new TextDisplayBuilder()
            .setContent(
                'Operating clandestinely and globally, The Foundation ' +
                    'operates beyond any jurisdiction, reinforced by major ' +
                    'national governments that have tasked it with ' +
                    'containing anomalous objects, entities, and phenomena. ' +
                    'These anomalies pose a significant threat to global ' +
                    'security, as they are capable of causing physical or ' +
                    'psychological harm.',
            );

        const image2Path = path
            .join(__dirname, '../../images/container/history-image-2.gif');

        const image2 = new AttachmentBuilder(
            image2Path,
            { name: 'history-image-2.gif' },
        );

        const thumbnailSection1 = new ThumbnailBuilder()
            .setURL('attachment://history-image-2.gif');

        const section1 = new SectionBuilder()
            .addTextDisplayComponents(textSection1)
            .setThumbnailAccessory(thumbnailSection1);

        // * Text 1.
        const text1 = new TextDisplayBuilder()
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

        // * Image 3.
        const image3Path = path
            .join(__dirname, '../../images/container/history-image-3.jpg');

        const image3 = new AttachmentBuilder(
            image3Path,
            { name: 'history-image-3.jpg' },
        );

        const mediaGalleryItem1Component2 = new MediaGalleryItemBuilder()
            .setURL('attachment://history-image-3.jpg');

        // * Image 4.
        const image4Path = path
            .join(__dirname, '../../images/container/history-image-4.gif');

        const image4 = new AttachmentBuilder(
            image4Path,
            { name: 'history-image-4.gif' },
        );

        const mediaGalleryItem2Component2 = new MediaGalleryItemBuilder()
            .setURL('attachment://history-image-4.gif');

        const mediaGallery2 = new MediaGalleryBuilder()
            .addItems(mediaGalleryItem1Component2, mediaGalleryItem2Component2);

        // * Text 2.
        const text2 = new TextDisplayBuilder()
            .setContent(
                '### Use /`commands` to see the full list of available ' +
                    'commands.',
            );

        // * Container.
        const container = new ContainerBuilder()
            .setAccentColor(0x010101)
            .addMediaGalleryComponents(mediaGallery1)
            .addTextDisplayComponents(header1)
            .addSeparatorComponents(separator1)
            .addSectionComponents(section1)
            .addTextDisplayComponents(text1)
            .addSeparatorComponents(separator2)
            .addMediaGalleryComponents(mediaGallery2)
            .addTextDisplayComponents(text2);

        await interaction.editReply({
            components: [container],
            files: [image1, image2, image3, image4],
            flags: MessageFlags.IsComponentsV2,
        });
    },
};
