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
        .setName('vip')
        .setDescription(
            'VIP details. Get additional features by becoming a donor!',
        ),
    async execute(interaction) {
        // * Notify the Discord API that the interaction was received
        // * successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply();

        // * Image 1.
        const image1Path = path
            .join(__dirname, '../../images/container/vip-image-1.jpg');

        const buffer1 = await sharp(image1Path)
            .resize(570, 70)
            .toBuffer();

        const image1 = new AttachmentBuilder(
            buffer1,
            { name: 'vip-image-1.jpg' },
        );

        const mediaGalleryItem1Component1 = new MediaGalleryItemBuilder()
            .setURL('attachment://vip-image-1.jpg');

        const mediaGallery1 = new MediaGalleryBuilder()
            .addItems(mediaGalleryItem1Component1);

        // * Header 1.
        const header1 = new TextDisplayBuilder()
            .setContent(`## ${process.env.EMOJI_THUNDER}  VIP Features`);

        // * Separator 1.
        const separator1 = new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Small);

        // * Section 1.
        const textSection1 = new TextDisplayBuilder()
            .setContent(
                'You can get extra features by subscribing to the Patreon ' +
                    'page. In the following link, you can find the details, ' +
                    'and make sure to link your Patreon account with Discord ' +
                    'so you can enjoy all the benefits: [patreon.com/Sn4red]' +
                    '(https://www.patreon.com/Sn4red/)\n\n' +
                    'Below are the exclusive benefits:',
            );

        const image2Path = path
            .join(__dirname, '../../images/container/vip-image-2.gif');

        const image2 = new AttachmentBuilder(
            image2Path,
            { name: 'vip-image-2.gif' },
        );

        const thumbnailSection1 = new ThumbnailBuilder()
            .setURL('attachment://vip-image-2.gif');

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
