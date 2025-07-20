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
        .setName('system')
        .setDescription('Explains how ranks, levels, and XP work.'),
    async execute(interaction) {
        // * Notify the Discord API that the interaction was received
        // * successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply();

        // * Banner Image.
        const bannerImagePath = path
            .join(__dirname, '../../images/container/system-image-1.jpg');

        const bannerImageBuffer = await sharp(bannerImagePath)
            .resize(570, 70)
            .toBuffer();

        const bannerImage = new AttachmentBuilder(
            bannerImageBuffer,
            { name: 'system-image-1.jpg' },
        );

        // * Thumbnail Image.
        const thumbnailImagePath = path
            .join(__dirname, '../../images/container/system-image-2.jpg');

        const thumbnailImage = new AttachmentBuilder(
            thumbnailImagePath,
            { name: 'system-image-2.jpg' },
        );

        // * Banner.
        const bannerMediaGalleryItem = new MediaGalleryItemBuilder()
            .setURL('attachment://system-image-1.jpg');

        const bannerMediaGallery = new MediaGalleryBuilder()
            .addItems(bannerMediaGalleryItem);

        // * Header.
        const header = new TextDisplayBuilder()
            .setContent(`## ${process.env.EMOJI_WHITE_CHART}  Progress System`);

        // * Separator 1.
        const separator1 = new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Small);

        // * Section.
        const textSection = new TextDisplayBuilder()
            .setContent(
                'Each user has a rank, level, and XP. The ranks are as ' +
                    'follows:\n\n' +
                    `- Class D  ${process.env.EMOJI_CLASS_D}  (50 XP per ` +
                    'level)\n' +
                    '- Security Officer  ' +
                    `${process.env.EMOJI_SECURITY_OFFICER}  ` +
                    '(100 XP per level)\n' +
                    `- Investigator  ${process.env.EMOJI_INVESTIGATOR}  ` +
                    '(250 XP per level)\n' +
                    '- Containment Specialist  ' +
                    `${process.env.EMOJI_CONTAINMENT_SPECIALIST}  ` +
                    '(500 XP per level)\n' +
                    `- Field Agent  ${process.env.EMOJI_FIELD_AGENT}  ` +
                    '(1500 XP per level)\n' +
                    `- Site Director  ${process.env.EMOJI_SITE_DIRECTOR}  ` +
                    '(5000 XP per level)\n' +
                    '- O5 Council Member  ' +
                    `${process.env.EMOJI_O5_COUNCIL_MEMBER}  ` +
                    '(10000 XP per level / Unlimited levels)',
            );

        const thumbnailSection = new ThumbnailBuilder()
            .setURL('attachment://system-image-2.jpg');

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
                'When you start playing, you begin with the rank of Class D ' +
                    'at level 1. Each rank consists of 500 levels to ascend ' +
                    'to the next. XP is what makes you level up, and ' +
                    'consequently, rank up. This is obtained by capturing ' +
                    'SCPs. The rarity (class) and texture (holographic) of ' +
                    'the SCP influences the amount of XP you will receive. ' +
                    'You can use /`card` to see your progress in the game, ' +
                    'such as your rank, level, XP, the number of SCPs ' +
                    'captured, and more. Note that once you reach the rank ' +
                    'of O5 Council Member, the levels are unlimited.',
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
