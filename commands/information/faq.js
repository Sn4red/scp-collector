const {
    SlashCommandBuilder,
    AttachmentBuilder,
    MessageFlags,
    ComponentType,
    MediaGalleryItemBuilder,
    MediaGalleryBuilder,
    TextDisplayBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
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
        .setName('faq')
        .setDescription('Frequently Asked Questions about bot functionality.'),
    async execute(interaction) {
        // * Notify the Discord API that the interaction was received
        // * successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply({
            flags: [MessageFlags.Ephemeral],
        });

        // * Banner Image.
        const bannerImagePath = path
            .join(__dirname, '../../images/container/faq-image-1.png');

        const bannerImageBuffer = await sharp(bannerImagePath)
            .resize(570, 70)
            .toBuffer();

        const bannerImage = new AttachmentBuilder(
            bannerImageBuffer,
            { name: 'faq-image-1.png' },
        );

        // * Thumbnail Image.
        const thumbnailImagePath = path
                .join(__dirname, '../../images/container/faq-image-2.jpg');

        const thumbnailImage = new AttachmentBuilder(
            thumbnailImagePath,
            { name: 'faq-image-2.jpg' },
        );

        // * Text or the different pages.
        const initialText =
            'Use the buttons above to navigate through the different ' +
                'sections.';

        const schedulesText =
            `### ${process.env.EMOJI_SMALL_WHITE_DASH}What is the schedule ` +
                'for the shots reset?\n' +
                'Every day at 12:00 a.m (EST/EDT).\n' +
                `### ${process.env.EMOJI_SMALL_WHITE_DASH}When do premium ` +
                'users receive their monthly crystals?\n' +
                'At the beginning of each month at 12:20 a.m (EST/EDT).\n' +
                `### ${process.env.EMOJI_SMALL_WHITE_DASH}When does the ` +
                'market reset?\n' +
                'It resets every Monday at 12:05 a.m (EST/EDT).\n' +
                `### ${process.env.EMOJI_SMALL_WHITE_DASH}I had a pending ` +
                'trade request, but I don\'t see it anymore.\n' +
                'There are four reasons why this might have happened: the ' +
                'request was declined, cancelled, over a month old, or you ' +
                'no longer have the card needed to complete the trade.\n\n' +
                'All pending trade requests that have been in the same state ' +
                'for at least a month will be deleted (this is checked every ' +
                'day at 11:00 p.m EST/EDT), so you can send a new one ' +
                'without any issues.\n\n' +
                'When a trade is accepted, the command also checks whether ' +
                'the card you traded was involved in any other pending ' +
                'trades and if those trades are still possible. If you only ' +
                'had one copy of the card and already traded it, this means ' +
                'that any other trades involving that card can\'t be ' +
                'completed and are therefore deleted.';

        const progressText =
            `### ${process.env.EMOJI_SMALL_WHITE_DASH}Is my progress local ` +
                'to each server?\n' +
                'Your progress with the bot is global. Actions you take in ' +
                'one server may be reflected in another. For example, if you ' +
                'obtain cards from one server, you should be able to view ' +
                'them from a different one.\n' +
                `### ${process.env.EMOJI_SMALL_WHITE_DASH}Are the cards in ` +
                'the market the same for everyone, or does each user get ' +
                'different ones?\n' +
                'The cards in the market are the same for everyone.\n' +
                `### ${process.env.EMOJI_SMALL_WHITE_DASH}How many SCP cards ` +
                'are there at the moment?\n' +
                'The **Series I** (002-999) is currently being covered. ' +
                'However, Apollyon-class cards come from later series, as ' +
                'there are no Apollyon-class SCPs in Series I. More cards ' +
                'from later series will be added over time and replaced (in ' +
                'case there is some changes in the official SCP Foundation ' +
                'website).';

        const membershipText =
            `### ${process.env.EMOJI_SMALL_WHITE_DASH}Can extra benefits be ` +
                'obtained?\n' +
                'You can donate at the following link to see the details of ' +
                'benefits: [patreon.com/Sn4red]' +
                '(https://www.patreon.com/Sn4red/)\n' +
                `### ${process.env.EMOJI_SMALL_WHITE_DASH}I'm already paying ` +
                'for the membership but I\'m not receiving my benefits.\n' +
                'Make sure to link your Patreon account with Discord **and ' +
                'also** be in the [Official Server]' +
                '(https://discord.gg/PrfWkJchZg), so the Patreon bot can ' +
                'give you the proper VIP role.\n' +
                `### ${process.env.EMOJI_SMALL_WHITE_DASH}I paid for the ` +
                'membership and joined the server, but after that I left. I ' +
                'don\'t have my benefits anymore.\n' +
                'You must always be in the server to receive the benefits. ' +
                'If you leave, you can join again so the Patreon bot can ' +
                'give you the proper VIP role.\n' +
                `### ${process.env.EMOJI_SMALL_WHITE_DASH}I paid for the ` +
                'membership but I\'m banned from the server or I can\'t ' +
                'acccess.\n' +
                'You can keep using the bot without being in the official ' +
                'server, but you won\'t be able to use your benefits. The ' +
                'only way to reverse this is to link your Patreon account to ' +
                'a different Discord account to gain access to the server. ' +
                'This will allow you to receive ' +
                'your benefits, but unfortunately, you will lose your entire ' +
                'card collection, because the bot recognizes the accounts by ' +
                'the **Discord user ID**. For any appeal please contact me ' +
                'through the [form](https://bit.ly/SCPCollector).';

        // * The initial page for the container is created with the initial
        // * text withouth a thumbnail.
        const pageContainer = createPageContainer(initialText, null, false);

        // * Although the reply is ephemeral and only the command executor can
        // * interact with it, this filter is kept for security purposes and
        // * code clarity.
        const collectorFilter = (x) => x.user.id === interaction.user.id;
        const timeLeft = 1000 * 60 * 5;

        const reply = await interaction.editReply({
            components: [pageContainer],
            files: [bannerImage, thumbnailImage],
            flags: [MessageFlags.IsComponentsV2],
        });

        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: collectorFilter,
            time: timeLeft,
        });

        // * Collector listener for the navigation buttons.
        collector.on('collect', async (button) => {
            // * Validates the button interaction so it prevents unexpected
            // * errors (it basically makes sure that the buttons was actually
            // * clicked).
            if (!button) {
                return;
            }

            // * Interaction is acknowledged to prevent the interaction timeout.
            await button.deferUpdate();

            // * Validates that the button clicked is one of the navigation
            // * buttons (there is just 3 buttons, but it clarifies the
            // * intention).
            if (button.customId !== 'btnSchedules' &&
                button.customId !== 'btnProgress' &&
                button.customId !== 'btnMembership') {

                return;
            }

            let text = null;

            // * Depending on the button clicked, the text is set to the
            // * corresponding text.
            switch (button.customId) {
                case 'btnSchedules':
                    text = schedulesText;
                    break;
                case 'btnProgress':
                    text = progressText;
                    break;
                case 'btnMembership':
                    text = membershipText;
                    break;
            }

            // * The container is recreated with the new text along with the
            // * thumbnail.
            const updatedPageContainer = createPageContainer(
                text,
                button.customId,
                true,
            );

            await interaction.editReply({
                components: [updatedPageContainer],
                files: [bannerImage, thumbnailImage],
            });
        });
    },
};

// * Creates the container simulating a page.
function createPageContainer(text, buttonId, includeThumbnail) {
    // * Banner.
    const bannerMediaGalleryItem = new MediaGalleryItemBuilder()
        .setURL('attachment://faq-image-1.png');

    const bannerMediaGallery = new MediaGalleryBuilder()
        .addItems(bannerMediaGalleryItem);

    // * Header.
    const header = new TextDisplayBuilder()
        .setContent(
            `## ${process.env.EMOJI_PIN}  FAQ - Frequently Asked Questions`,
        );

    // * Navigation Buttons.
    const schedulesButton = new ButtonBuilder()
        .setCustomId('btnSchedules')
        .setLabel('Schedules & Resets')
        .setEmoji(process.env.EMOJI_BIT_CLOCK)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(buttonId === 'btnSchedules');

    const progressButton = new ButtonBuilder()
        .setCustomId('btnProgress')
        .setLabel('Progress')
        .setEmoji(process.env.EMOJI_PIXEL_CHART)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(buttonId === 'btnProgress');

    const membershipButton = new ButtonBuilder()
        .setCustomId('btnMembership')
        .setLabel('Membership & Benefits')
        .setEmoji(process.env.EMOJI_MIXED_STARS)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(buttonId === 'btnMembership');

    const navigationRow = new ActionRowBuilder()
        .addComponents(
            schedulesButton,
            progressButton,
            membershipButton,
        );

    // * Separator 1.
    const separator1 = new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small);

    // * Separator 2.
    const separator2 = new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small)
        .setDivider(false);

    // * Footer.
    const footer = new TextDisplayBuilder()
        .setContent(
            '### Use /`commands` to see the full list of available commands.',
        );

    // * Container.
    const container = new ContainerBuilder()
        .setAccentColor(defaultAccentColor)
        .addMediaGalleryComponents(bannerMediaGallery)
        .addTextDisplayComponents(header)
        .addActionRowComponents(navigationRow)
        .addSeparatorComponents(separator1);

    if (includeThumbnail) {
        // * Section.
        const textSection = new TextDisplayBuilder()
            .setContent(text);

        const thumbnailSection = new ThumbnailBuilder()
            .setURL('attachment://faq-image-2.jpg');

        const section = new SectionBuilder()
            .addTextDisplayComponents(textSection)
            .setThumbnailAccessory(thumbnailSection);

        container.addSectionComponents(section);
    } else {
        // * Text.
        const textSection = new TextDisplayBuilder()
            .setContent(text);

        container.addTextDisplayComponents(textSection);
    }

    container
        .addSeparatorComponents(separator2)
        .addTextDisplayComponents(footer);

    return container;
}
