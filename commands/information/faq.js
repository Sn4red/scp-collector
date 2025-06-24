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
        .setName('faq')
        .setDescription('Frequently Asked Questions about bot functionality.'),
    async execute(interaction) {
        // * Notify the Discord API that the interaction was received
        // * successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply();

        // * Image 1.
        const image1Path = path
            .join(__dirname, '../../images/container/faq-image-1.png');

        const buffer1 = await sharp(image1Path)
            .resize(570, 70)
            .toBuffer();

        const image1 = new AttachmentBuilder(
            buffer1,
            { name: 'faq-image-1.png' },
        );

        const mediaGalleryItem1Component1 = new MediaGalleryItemBuilder()
            .setURL('attachment://faq-image-1.png');

        const mediaGallery1 = new MediaGalleryBuilder()
            .addItems(mediaGalleryItem1Component1);

        // * Header 1.
        const header1 = new TextDisplayBuilder()
            .setContent(
                `## ${process.env.EMOJI_PIN}  FAQ - Frequently Asked Questions`,
            );

        // * Separator 1.
        const separator1 = new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Small);

        // * Section 1.
        const textSection1 = new TextDisplayBuilder()
            .setContent(
                'Here are some questions that may be common and could arise ' +
                    'during the use of this bot.\n\n' +
                    `### ${process.env.EMOJI_SMALL_WHITE_DASH}What is the ` +
                    'schedule for the shots reset?\n' +
                    'Every day at 12:00 a.m (EST/EDT).',
            );

        const image2Path = path
                .join(__dirname, '../../images/container/faq-image-2.jpg');

        const image2 = new AttachmentBuilder(
                image2Path,
                { name: 'faq-image-2.jpg' },
        );

        const thumbnailSection1 = new ThumbnailBuilder()
                .setURL('attachment://faq-image-2.jpg');

        const section1 = new SectionBuilder()
                .addTextDisplayComponents(textSection1)
                .setThumbnailAccessory(thumbnailSection1);

        // * Question 2.
        const question2 = new TextDisplayBuilder()
            .setContent(
                `### ${process.env.EMOJI_SMALL_WHITE_DASH}When do premium ` +
                    'users receive their monthly crystals?\n' +
                    'At the end of each month at 12:20 (EST/EDT).',
            );

        // * Question 3.
        const question3 = new TextDisplayBuilder()
            .setContent(
                `### ${process.env.EMOJI_SMALL_WHITE_DASH}When does the ` +
                    'market reset?\n' +
                    'It resets every Sunday at 12:05 (EST/EDT).',
            );

        // * Question 4.
        const question4 = new TextDisplayBuilder()
            .setContent(
                `### ${process.env.EMOJI_SMALL_WHITE_DASH}Is my progress ` +
                    'local to each server?\n' +
                    'Your progress with the bot is global. Actions you take ' +
                    'in one server may be reflected in another. For example, ' +
                    'if you obtain cards from one server, you should be able ' +
                    'to view them from a different one.',
            );

        // * Question 5.
        const question5 = new TextDisplayBuilder()
            .setContent(
                `### ${process.env.EMOJI_SMALL_WHITE_DASH}How many SCP cards ` +
                    'are there at the moment?\n' +
                    'The **Series I** (002-999) is currently being covered. ' +
                    'However, Apollyon-class cards come from later series, ' +
                    'as there are no Apollyon-class SCPs in Series I. More ' +
                    'cards from later series will be added over time and ' +
                    'replaced (in case there is some changes in the ' +
                    'official SCP Foundation website).',
            );

        // * Question 6.
        const question6 = new TextDisplayBuilder()
            .setContent(
                `### ${process.env.EMOJI_SMALL_WHITE_DASH}Can extra benefits ` +
                    'be obtained?\n' +
                    'You can donate at the following link to see the details ' +
                    'of benefits: [patreon.com/Sn4red]' +
                    '(https://www.patreon.com/Sn4red/)',
            );
        
        // * Question 7.
        const question7 = new TextDisplayBuilder()
            .setContent(
                `### ${process.env.EMOJI_SMALL_WHITE_DASH}I'm already paying ` +
                    'for the membership but I\'m not receiving my benefits.\n' +
                    'Make sure to link your Patreon account with Discord ' +
                    '**and also** be in the [Official Server]' +
                    '(https://discord.gg/PrfWkJchZg), so the Patreon bot can ' +
                    'give you the proper VIP role.',
            );

        // * Question 8.
        const question8 = new TextDisplayBuilder()
            .setContent(
                `### ${process.env.EMOJI_SMALL_WHITE_DASH}I paid for the ` +
                    'membership and joined the server, but later I left. I ' +
                    'don\'t have my benefits anymore.\n' +
                    'You must always be in the server to receive the ' +
                    'benefits. If you leave, you can join again so the ' +
                    'Patreon bot can give you the proper VIP role.',
            );

        // * Question 9.
        const question9 = new TextDisplayBuilder()
            .setContent(
                `### ${process.env.EMOJI_SMALL_WHITE_DASH}I paid for the ` +
                    'membership but I\'m banned from the server or I can\'t ' +
                    'acccess.\n' +
                    'You can keep using the bot without being in the ' +
                    'official server, but you won\'t be able to use your ' +
                    'benefits. The only way to reverse this is to link your ' +
                    'Patreon account to a different Discord account to gain ' +
                    'access to the server. This will allow you to receive ' +
                    'your benefits, but unfortunately, you will lose your ' +
                    'entire card collection, because the bot recognizes the ' +
                    'accounts by the **Discord user ID**. For any appeal ' +
                    'please contact me through the form.',
            );

        // * Question 10.
        const question10 = new TextDisplayBuilder()
            .setContent(
                `### ${process.env.EMOJI_SMALL_WHITE_DASH}I had a pending ` +
                    'trade request, but I don\'t see it anymore.\n' +
                    'There are four reasons why this might have happened: ' +
                    'the request was declined, cancelled, over a month old, ' +
                    'or you no longer have the card needed to complete the ' +
                    'trade.\n\n' +
                    'All pending trade requests that have been in the same ' +
                    'state for at least a month will be deleted (this is ' +
                    'checked every day at 11:00 p.m EST/EDT), so you can ' +
                    'send a new one without any issues.\n\n' +
                    'When a trade is accepted, the command also checks ' +
                    'whether the card you traded was involved in any other ' +
                    'pending trades and if those trades are still possible. ' +
                    'If you only had one copy of the card and already traded ' +
                    'it, this means that any other trades involving that ' +
                    'card can\'t be completed and are therefore deleted.',
            );

        // * Question 11.
        const question11 = new TextDisplayBuilder()
            .setContent(
                `### ${process.env.EMOJI_SMALL_WHITE_DASH}Are the cards in ` +
                    'the market the same for everyone, or does each user get ' +
                    'different ones?\n' +
                    'The cards in the market are the same for everyone.',
            );

        // * Separator 2.
        const separator2 = new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Small)
            .setDivider(false);

        // * Text 1.
        const text1 = new TextDisplayBuilder()
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
            .addTextDisplayComponents(question2)
            .addTextDisplayComponents(question3)
            .addTextDisplayComponents(question4)
            .addTextDisplayComponents(question5)
            .addTextDisplayComponents(question6)
            .addTextDisplayComponents(question7)
            .addTextDisplayComponents(question8)
            .addTextDisplayComponents(question9)
            .addTextDisplayComponents(question10)
            .addTextDisplayComponents(question11)
            .addSeparatorComponents(separator2)
            .addTextDisplayComponents(text1);

        await interaction.editReply({
            components: [container],
            files: [image1, image2],
            flags: MessageFlags.IsComponentsV2,
        });
    },
};
