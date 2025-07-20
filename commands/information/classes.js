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
        .setName('classes')
        .setDescription('Details the different classes of SCPs.'),
    async execute(interaction) {
        // * Notify the Discord API that the interaction was received
        // * successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply();

        // * Banner Image.
        const bannerImagePath = path
            .join(__dirname, '../../images/container/classes-image-1.jpg');

        const bannerImageBuffer = await sharp(bannerImagePath)
            .resize(570, 70)
            .toBuffer();

        const bannerImage = new AttachmentBuilder(
            bannerImageBuffer,
            { name: 'classes-image-1.jpg' },
        );

        // * Thumbnail Image.
        const thumbnailImagePath = path
            .join(__dirname, '../../images/container/classes-image-2.jpg');

        const thumbnailImage = new AttachmentBuilder(
            thumbnailImagePath,
            { name: 'classes-image-2.jpg' },
        );

        // * Banner.
        const bannerMediaGalleryItem = new MediaGalleryItemBuilder()
            .setURL('attachment://classes-image-1.jpg');

        const bannerMediaGallery = new MediaGalleryBuilder()
            .addItems(bannerMediaGalleryItem);

        // * Header.
        const header = new TextDisplayBuilder()
            .setContent(
                `## ${process.env.EMOJI_DISTORTED_WARNING}  Object Classes`,
            );

        // * Separator 1.
        const separator1 = new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Small);

        // * Section.
        const textSection = new TextDisplayBuilder()
            .setContent(
                'All objects, entities, and anomalous phenomena requiring ' +
                    'Special Containment Procedures are assigned an **Object ' +
                    'Class**. They serve as an approximate indicator of how ' +
                    'difficult an object is to contain. The following are ' +
                    'covered here:\n\n' +
                    '- Safe -> +5XP -> 43% probability\n' +
                    '- Euclid -> +15XP -> 30% probability\n' +
                    '- Keter -> +30XP -> 21% probability\n' +
                    '- Thaumiel -> +100XP -> 4% probability\n' +
                    '- Apollyon -> +200XP -> 2% probability',
            );
                
        const thumbnailSection = new ThumbnailBuilder()
            .setURL('attachment://classes-image-2.jpg');

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
                `### ${process.env.EMOJI_HOLOGRAPHIC_CARD}  Holographics  ` +
                    `${process.env.EMOJI_THUNDER} VIP FEATURE ` +
                    `${process.env.EMOJI_THUNDER}\n` +
                    'Also, there are chances of obtaining holographic cards. ' +
                    'These are rares to collect and provide additional XP ' +
                    'too!\n\n' +
                    `- ${process.env.EMOJI_EMERALD}  Emerald -> +40XP -> 7% ` +
                    'probability\n' +
                    `- ${process.env.EMOJI_GOLDEN}  Golden -> +70XP -> 2% ` +
                    'probability\n' +
                    `- ${process.env.EMOJI_DIAMOND}  Diamond -> +100XP -> ` +
                    '0.7% probability',
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
