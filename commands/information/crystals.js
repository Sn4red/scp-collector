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
        .setName('crystals')
        .setDescription('Explains about the crystal system.'),
    async execute(interaction) {
        // * Notify the Discord API that the interaction was received
        // * successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply();

        // * Image 1.
        const image1Path = path
            .join(__dirname, '../../images/container/crystals-image-1.png');

        const buffer1 = await sharp(image1Path)
            .resize(570, 70)
            .toBuffer();

        const image1 = new AttachmentBuilder(
            buffer1,
            { name: 'crystals-image-1.png' },
        );

        const mediaGalleryItem1Component1 = new MediaGalleryItemBuilder()
            .setURL('attachment://crystals-image-1.png');

        const mediaGallery1 = new MediaGalleryBuilder()
            .addItems(mediaGalleryItem1Component1);

        // * Header 1.
        const header1 = new TextDisplayBuilder()
            .setContent(`## ${process.env.EMOJI_MARKET}  Crystal System`);

        // * Separator 1.
        const separator1 = new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Small);

        // * Section 1.
        const textSection1 = new TextDisplayBuilder()
            .setContent(
                'Crystals are a type of currency that can only be earned by ' +
                    'capturing SCPs and merging them. The amount of ' +
                    'crystals you receive depends on the class of the ' +
                    'SCP:\n\n' +
                    `Safe -> ${process.env.EMOJI_CRYSTAL} 10\n` +
                    `Euclid -> ${process.env.EMOJI_CRYSTAL} 20\n` +
                    `Keter -> ${process.env.EMOJI_CRYSTAL} 30\n` +
                    `Thaumiel -> ${process.env.EMOJI_CRYSTAL} 50\n` +
                    `Apollyon -> ${process.env.EMOJI_CRYSTAL} 100`,
            );

        const image2Path = path
            .join(__dirname, '../../images/container/crystals-image-2.gif');

        const image2 = new AttachmentBuilder(
            image2Path,
            { name: 'crystals-image-2.gif' },
        );

        const thumbnailSection1 = new ThumbnailBuilder()
            .setURL('attachment://crystals-image-2.gif');

        const section1 = new SectionBuilder()
            .addTextDisplayComponents(textSection1)
            .setThumbnailAccessory(thumbnailSection1);

        // * Separator 2.
        const separator2 = new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Small)
            .setDivider(false);

        // * Text 1.
        const text1 = new TextDisplayBuilder()
            .setContent(
                'You can spend your crystals in the **market**. Each ' +
                    'week, 5 cards are available for purchase. You can view ' +
                    'them by using /`market`. Also the price depends on the ' +
                    'type of class:\n\n' +
                    `Safe -> ${process.env.EMOJI_CRYSTAL} 1000\n` +
                    `Euclid -> ${process.env.EMOJI_CRYSTAL} 2000\n` +
                    `Keter -> ${process.env.EMOJI_CRYSTAL} 3000\n` +
                    `Thaumiel -> ${process.env.EMOJI_CRYSTAL} 5000\n` +
                    `Apollyon -> ${process.env.EMOJI_CRYSTAL} 10000\n\n` +
                    'Adittionaly, the price is incremented if the card has a ' +
                    'holographic feature:\n\n' +
                    `${process.env.EMOJI_EMERALD}  Emerald -> ` +
                    `${process.env.EMOJI_CRYSTAL} +200\n` +
                    `${process.env.EMOJI_GOLDEN}  Golden -> ` +
                    `${process.env.EMOJI_CRYSTAL} +300\n` +
                    `${process.env.EMOJI_DIAMOND} Diamond -> ` +
                    `${process.env.EMOJI_CRYSTAL} +500\n`,
            );

        // * Separator 3.
        const separator3 = new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Small)
            .setDivider(false);

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
            .addSeparatorComponents(separator2)
            .addTextDisplayComponents(text1)
            .addSeparatorComponents(separator3)
            .addTextDisplayComponents(text2);

        await interaction.editReply({
            components: [container],
            files: [image1, image2],
            flags: MessageFlags.IsComponentsV2,
        });
    },
};
