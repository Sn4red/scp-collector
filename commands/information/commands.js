const path = require('node:path');
const sharp = require('sharp');
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
    ContainerBuilder } = require('discord.js');

module.exports = {
    cooldown: 60 * 30,
    data: new SlashCommandBuilder()
        .setName('commands')
        .setDescription('Lists all usable commands.'),
    async execute(interaction) {
        // * Notify the Discord API that the interaction was received
        // * successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply({
            flags: [MessageFlags.Ephemeral],
        });

        // * Banner Image.
        const bannerImagePath = path
            .join(__dirname, '../../images/container/commands-image-1.jpg');

        const bannerImageBuffer = await sharp(bannerImagePath)
            .resize(570, 70)
            .toBuffer();

        const bannerImage = new AttachmentBuilder(
            bannerImageBuffer,
            { name: 'commands-image-1.jpg' },
        );

        // * Thumbnail Image.
        const thumbnailImagePath = path
            .join(__dirname, '../../images/container/commands-image-2.gif');

        const thumbnailImage = new AttachmentBuilder(
            thumbnailImagePath,
            { name: 'commands-image-2.gif' },
        );

        // * Text for the different pages.
        const initialText = 'Use the buttons above to navigate through ' +
            'the different command sections.';

        const informationText = '/`commands` - Lists all usable commands.\n' +
            '/`system` - Explains how ranks, levels, and XP work.\n' +
            '/`classes` - Details the different classes of SCPs.\n' +
            '/`history` - Provides details on the theme of the bot for more ' +
            'context and a brief history of what the SCP Foundation is.\n' +
            '/`faq` - Frequently Asked Questions about bot functionality.\n' +
            '/`merges` - Explains about how merge works.\n' +
            '/`crystals` - Explains about the crystal system.\n' +
            '**/`vip` - VIP details. Get additional features by becoming a ' +
            `donor!** ${process.env.EMOJI_THUNDER}` +
            `${process.env.EMOJI_THUNDER}${process.env.EMOJI_THUNDER}`;

        const gameplayText = '/`card` - Displays your personal card and ' +
            'progress details. This is the first command you should use to ' +
            'start playing.\n' +
            '/`capture` - Capture an SCP and add it to your collection. You ' +
            'may obtain duplicates that can be used for trading with someone ' +
            'else. The rarity (class) of the SCP will influence the ' +
            'probabilities of obtaining it. You can only capture **5 SCPs** ' +
            'per day.\n' +
            '/`showcard` `<SCP ID>` - Shows one of your cards to the ' +
            'public.\n' +
            '/`viewcard` `<SCP ID>` - Privately displays one of your owned ' +
            'cards.\n' +
            '/`scp` - Lists the SCPs you currently have, including ' +
            'duplicates.\n' +
            '/`merge` - Merges 5 cards to turn it into a higher class card.\n' +
            '/`market` - A weekly market where you can purchase up to 5 ' +
            'cards using your crystals.\n' +
            '/`buy` `<SCP ID>` - Buys a card that is currently in the ' +
            'market, using your crystals.';

        const tradingSystemText = '/`trade` - Creates a trade request to a ' +
            'user, specifying the user, the SCP they have, and the one you ' +
            'are willing to trade. When the other user accepts your request, ' +
            'the trade will be executed automatically. **Before accepting, ' +
            'there is a 1-minute cooldown in case a request was sent by ' +
            'mistake.**\n' +
            '/`accepttrade` `<Trade ID>` - Accepts the request, and the ' +
            'trade is done.\n' +
            '/`declinetrade` `<Trade ID>` - Declines a trade offer.\n' +
            '/`canceltrade` `<Trade ID>` - Cancels a specific trade you have ' +
            'sent.\n' +
            '/`viewtrade` `<Trade ID>` - Displays the details of a trade.\n' +
            '/`senttrades` - Lists pending trades along with a history of ' +
            'trades you have done.\n' +
            '/`receivedtrades` - Lists the trade requests you have pending ' +
            'to accept or decline.\n' +
            '/`disabletrades` - Use it if you don\'t want to receive trade ' +
            'offers.\n' +
            '/`enabletrades` - Use it if you want to receive trade offers ' +
            '**(enabled by default)**.';

        // * The initial page for the container is created with the initial
        // * text withouth a thumbnail.
        const pageContainer = createPageContainer(initialText, null, false);

        // * Although the reply is ephemeral and only the command executor can
        // * interact with it, this filter is kept for security purposes and
        // * code clarity.
        const collectorFilter = (x) => x.user.id === interaction.user.id;
        const time = 1000 * 60 * 5;

        const reply = await interaction.editReply({
            components: [pageContainer],
            files: [bannerImage, thumbnailImage],
            flags: MessageFlags.IsComponentsV2,
        });

        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: collectorFilter,
            time,
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
            button.deferUpdate();

            // * Validates that the button clicked is one of the navigation
            // * buttons (there is just 3 buttons, but it clarifies the
            // * intention).
            if (button.customId !== 'btnInformationButton' &&
                button.customId !== 'btnGameplayButton' &&
                button.customId !== 'btnTradingSystemButton') {
                return;
            }

            let text = null;

            // * Depending on the button clicked, the text is set to the
            // * corresponding text.
            switch (button.customId) {
                case 'btnInformationButton':
                    text = informationText;
                    break;
                case 'btnGameplayButton':
                    text = gameplayText;
                    break;
                case 'btnTradingSystemButton':
                    text = tradingSystemText;
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
        .setURL('attachment://commands-image-1.jpg');

    const bannerMediaGallery = new MediaGalleryBuilder()
        .addItems(bannerMediaGalleryItem);

    // * Header.
    const header = new TextDisplayBuilder()
        .setContent(`## ${process.env.EMOJI_COMMANDS}  Command List`);

    // * Navigation Buttons.
    const informationButton = new ButtonBuilder()
        .setCustomId('btnInformationButton')
        .setLabel('Information')
        .setEmoji(process.env.EMOJI_PAPER_SCROLL)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(buttonId === 'btnInformationButton');

    const gameplayButton = new ButtonBuilder()
        .setCustomId('btnGameplayButton')
        .setLabel('Gameplay')
        .setEmoji(process.env.EMOJI_DICE)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(buttonId === 'btnGameplayButton');

    const tradingSystemButton = new ButtonBuilder()
        .setCustomId('btnTradingSystemButton')
        .setLabel('Trading System')
        .setEmoji(process.env.EMOJI_BOX)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(buttonId === 'btnTradingSystemButton');

    const navigationRow = new ActionRowBuilder()
        .addComponents(
            informationButton,
            gameplayButton,
            tradingSystemButton,
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
            '### To submit suggestions or errors, please fill out this ' +
                '[Google form](https://bit.ly/SCPCollector).',
        );

    // * Container.
    const container = new ContainerBuilder()
        .setAccentColor(0x010101)
        .addMediaGalleryComponents(bannerMediaGallery)
        .addTextDisplayComponents(header)
        .addActionRowComponents(navigationRow)
        .addSeparatorComponents(separator1);

    if (includeThumbnail) {
        // * Section.
        const textSection = new TextDisplayBuilder()
            .setContent(text);

        const thumbnailSection = new ThumbnailBuilder()
            .setURL('attachment://commands-image-2.gif');

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
