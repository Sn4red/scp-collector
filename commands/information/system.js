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
        .setName('system')
        .setDescription('Explains how ranks, levels, and XP work.'),
    async execute(interaction) {
        // * Notify the Discord API that the interaction was received
        // * successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply();

        // * Image 1.
        const image1Path = path
            .join(__dirname, '../../images/container/system-image-1.jpg');

        const buffer1 = await sharp(image1Path)
            .resize(570, 70)
            .toBuffer();

        const image1 = new AttachmentBuilder(
            buffer1,
            { name: 'system-image-1.jpg' },
        );

        const mediaGalleryItem1Component1 = new MediaGalleryItemBuilder()
            .setURL('attachment://system-image-1.jpg');

        const mediaGallery1 = new MediaGalleryBuilder()
            .addItems(mediaGalleryItem1Component1);

        // * Header 1.
        const header1 = new TextDisplayBuilder()
            .setContent(`## ${process.env.EMOJI_WHITE_CHART}  Progress System`);

        // * Separator 1.
        const separator1 = new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Small);

        // * Section 1.
        const textSection1 = new TextDisplayBuilder()
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

        const image2Path = path
            .join(__dirname, '../../images/container/system-image-2.jpg');

        const image2 = new AttachmentBuilder(
            image2Path,
            { name: 'system-image-2.jpg' },
        );

        const thumbnailSection1 = new ThumbnailBuilder()
            .setURL('attachment://system-image-2.jpg');

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
