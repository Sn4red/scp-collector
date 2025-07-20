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
        .setName('vip')
        .setDescription(
            'VIP details. Get additional features by becoming a donor!',
        ),
    async execute(interaction) {
        // * Notify the Discord API that the interaction was received
        // * successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply();

        // * Banner Image.
        const bannerImagePath = path
            .join(__dirname, '../../images/container/vip-image-1.jpg');

        const bannerImageBuffer = await sharp(bannerImagePath)
            .resize(570, 70)
            .toBuffer();

        const bannerImage = new AttachmentBuilder(
            bannerImageBuffer,
            { name: 'vip-image-1.jpg' },
        );

        // * Thumbnail Image.
        const thumbnailImagePath = path
            .join(__dirname, '../../images/container/vip-image-2.gif');

        const thumbnailImage = new AttachmentBuilder(
            thumbnailImagePath,
            { name: 'vip-image-2.gif' },
        );

        // * Banner.
        const bannerMediaGalleryItem = new MediaGalleryItemBuilder()
            .setURL('attachment://vip-image-1.jpg');

        const bannerMediaGallery = new MediaGalleryBuilder()
            .addItems(bannerMediaGalleryItem);

        // * Header.
        const header = new TextDisplayBuilder()
            .setContent(`## ${process.env.EMOJI_THUNDER}  VIP Features`);

        // * Separator 1.
        const separator1 = new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Small);

        // * Section.
        const textSection = new TextDisplayBuilder()
            .setContent(
                'You can get extra features by subscribing to the Patreon ' +
                    'page. In the following link, you can find the details, ' +
                    'and make sure to link your Patreon account with Discord ' +
                    'so you can enjoy all the benefits: [patreon.com/Sn4red]' +
                    '(https://www.patreon.com/Sn4red/)\n\n' +
                    'Below are the exclusive benefits:',
            );

        const thumbnailSection = new ThumbnailBuilder()
            .setURL('attachment://vip-image-2.gif');

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
                '- 10 shots daily instead of 5.\n' +
                    '- Double XP when capturing SCP cards.\n' +
                    '- Double crystals when capturing and merging SCP ' +
                    'cards.\n' +
                    '- 1000 crystals at the end of each month.\n' +
                    '- Better chances of obtaining rare class cards.\n' +
                    '- Opportunity to obtain holographic cards (Use ' +
                    '/`classes` for more information).\n' +
                    '- A golden seal on your ID card.\n\n' +
                    'Note that as more features are added with future ' +
                    'updates, the benefits may change.',
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
