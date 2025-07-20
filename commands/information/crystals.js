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
    ContainerBuilder,
} = require('discord.js');

module.exports = {
    cooldown: 60 * 30,
    data: new SlashCommandBuilder()
        .setName('crystals')
        .setDescription('Explains about the crystal system.'),
    async execute(interaction) {
        // * Notify the Discord API that the interaction was received
        // * successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply();

        // * Banner Image.
        const bannerImagePath = path
            .join(__dirname, '../../images/container/crystals-image-1.png');

        const bannerImageBuffer = await sharp(bannerImagePath)
            .resize(570, 70)
            .toBuffer();

        const bannerImage = new AttachmentBuilder(
            bannerImageBuffer,
            { name: 'crystals-image-1.png' },
        );

        // * Thumbnail Image.
        const thumbnailImagePath = path
            .join(__dirname, '../../images/container/crystals-image-2.gif');

        const thumbnailImage = new AttachmentBuilder(
            thumbnailImagePath,
            { name: 'crystals-image-2.gif' },
        );

        // * Banner.
        const bannerMediaGalleryItem = new MediaGalleryItemBuilder()
            .setURL('attachment://crystals-image-1.png');

        const bannerMediaGallery = new MediaGalleryBuilder()
            .addItems(bannerMediaGalleryItem);

        // * Header.
        const header = new TextDisplayBuilder()
            .setContent(`## ${process.env.EMOJI_MARKET}  Crystal System`);

        // * Separator 1.
        const separator1 = new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Small);

        // * Section.
        const textSection = new TextDisplayBuilder()
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

        const thumbnailSection = new ThumbnailBuilder()
            .setURL('attachment://crystals-image-2.gif');

        const section = new SectionBuilder()
            .addTextDisplayComponents(textSection)
            .setThumbnailAccessory(thumbnailSection);

        // * Separator 2.
        const separator2 = new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Small)
            .setDivider(false);

        // * Text.
        const text = new TextDisplayBuilder()
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

        // * Footer.
        const footer = new TextDisplayBuilder()
            .setContent(
                '### Use /`commands` to see the full list of available ' +
                    'commands.',
            );

        // * Container.
        const container = new ContainerBuilder()
            .setAccentColor(0x010101)
            .addMediaGalleryComponents(bannerMediaGallery)
            .addTextDisplayComponents(header)
            .addSeparatorComponents(separator1)
            .addSectionComponents(section)
            .addSeparatorComponents(separator2)
            .addTextDisplayComponents(text)
            .addSeparatorComponents(separator3)
            .addTextDisplayComponents(footer);

        await interaction.editReply({
            components: [container],
            files: [bannerImage, thumbnailImage],
            flags: MessageFlags.IsComponentsV2,
        });
    },
};
