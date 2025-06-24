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
        .setName('commands')
        .setDescription('Lists all usable commands.'),
    async execute(interaction) {
        // * Notify the Discord API that the interaction was received
        // * successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply();

        // * Image 1.
        const image1Path = path
            .join(__dirname, '../../images/container/commands-image-1.jpg');

        const buffer1 = await sharp(image1Path)
            .resize(570, 70)
            .toBuffer();

        const image1 = new AttachmentBuilder(
            buffer1,
            { name: 'commands-image-1.jpg' },
        );

        const mediaGalleryItem1Component1 = new MediaGalleryItemBuilder()
            .setURL('attachment://commands-image-1.jpg');

        const mediaGallery1 = new MediaGalleryBuilder()
            .addItems(mediaGalleryItem1Component1);

        // * Header 1.
        const header1 = new TextDisplayBuilder()
            .setContent(`## ${process.env.EMOJI_COMMANDS}  Command List`);

        // * Separator 1.
        const separator1 = new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Small);

        // * Section 1.
        const textSection1 = new TextDisplayBuilder()
            .setContent(
                `### ${process.env.EMOJI_PAPER_SCROLL}  Information\n` +
                    '/`commands` - Lists all usable commands.\n' +
                    '/`system` - Explains how ranks, levels, and XP work.\n' +
                    '/`classes` - Details the different classes of SCPs.\n' +
                    '/`history` - Provides details on the theme of the bot ' +
                    'for more context and a brief history of what the SCP ' +
                    'Foundation is.\n' +
                    '/`faq` - Frequently Asked Questions about bot ' +
                    'functionality.\n' +
                    '/`merges` - Explains about how merge works.\n' +
                    '/`crystals` - Explains about the crystal system.\n' +
                    '**/`vip` - VIP details. Get additional ' +
                    'features by becoming a donor!** ' +
                    `${process.env.EMOJI_THUNDER}${process.env.EMOJI_THUNDER}` +
                    `${process.env.EMOJI_THUNDER}`,
            );

        const image2Path = path
            .join(__dirname, '../../images/container/commands-image-2.gif');

        const image2 = new AttachmentBuilder(
            image2Path,
            { name: 'commands-image-2.gif' },
        );
        
        const thumbnailSection1 = new ThumbnailBuilder()
            .setURL('attachment://commands-image-2.gif');

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
                `### ${process.env.EMOJI_DICE}  Gameplay\n` +
                    '/`card` - Displays your personal card and progress ' +
                    'details. This is the first command you should use to ' +
                    'start playing.\n' +
                    '/`capture` - Capture an SCP and add it to your ' +
                    'collection. You may obtain duplicates that can be used ' +
                    'for trading with someone else. The rarity (class) of ' +
                    'the SCP will influence the probabilities of obtaining ' +
                    'it. You can only capture **5 SCPs** per day.\n' +
                    '/`showcard` `<SCP ID>` - Shows one of your cards to the ' +
                    'public.\n' +
                    '/`viewcard` `<SCP ID>` - Privately displays one of your ' +
                    'owned cards.\n' +
                    '/`scp` - Lists the SCPs you currently have, including ' +
                    'duplicates.\n' +
                    '/`merge` - Merges 5 cards to turn it into a higher ' +
                    'class card.\n' +
                    '/`market` - A weekly market where you can purchase up ' +
                    'to 5 cards using your crystals.\n' +
                    '/`buy` `<SCP ID>` - Buys a card that is currently in ' +
                    'the market, using your crystals.',
            );

        // * Separator 3.
        const separator3 = new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Small)
            .setDivider(false);

        // * Text 2.
        const text2 = new TextDisplayBuilder()
            .setContent(
                `### ${process.env.EMOJI_BOX}  Trading System\n` +
                    '/`trade` - Creates a trade request to a user, ' +
                    'specifying the user, the SCP they have, and the one you ' +
                    'are willing to trade. When the other user accepts your ' +
                    'request, the trade will be executed automatically. ' +
                    '**Before accepting, there is a 1-minute cooldown in ' +
                    'case a request was sent by mistake.**\n' +
                    '/`accepttrade` `<Trade ID>` - Accepts the request, and ' +
                    'the trade is done.\n' +
                    '/`declinetrade` `<Trade ID>` - Declines a trade offer.\n' +
                    '/`canceltrade` `<Trade ID>` - Cancels a specific trade ' +
                    'you have sent.\n' +
                    '/`viewtrade` `<Trade ID>` - Displays the details of a ' +
                    'trade.\n' +
                    '/`senttrades` - Lists pending trades along with a ' +
                    'history of trades you have done.\n' +
                    '/`receivedtrades` - Lists the trade requests you have ' +
                    'pending to accept or decline.\n' +
                    '/`disabletrades` - Use it if you don\'t want to receive ' +
                    'trade offers.\n' +
                    '/`enabletrades` - Use it if you want to receive trade ' +
                    'offers (**enabled by default**).',
            );

        // * Separator 4.
        const separator4 = new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Small)
            .setDivider(false);

        // * Text 3.
        const text3 = new TextDisplayBuilder()
            .setContent(
                '### To submit suggestions or errors, please fill out this ' +
                    '[Google form](https://bit.ly/SCPCollector).',
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
            .addTextDisplayComponents(text2)
            .addSeparatorComponents(separator4)
            .addTextDisplayComponents(text3);

        await interaction.editReply({
            components: [container],
            files: [image1, image2],
            flags: MessageFlags.IsComponentsV2,
        });
    },
};
