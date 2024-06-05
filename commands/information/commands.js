const path = require('node:path');
const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    cooldown: 60 * 30,
    data: new SlashCommandBuilder()
        .setName('commands')
        .setDescription('Lists all usable commands.'),
    async execute(interaction) {
        const thumbnailPath = path.join(__dirname, '../../images/embed/commands-thumbnail.gif');
        const iconFooterPath = path.join(__dirname, '../../images/embed/commands-iconFooter.jpg');

        const thumbnail = new AttachmentBuilder(thumbnailPath);
        const iconFooter = new AttachmentBuilder(iconFooterPath);

        const embed = new EmbedBuilder()
            .setColor(0x010101)
            .setTitle('<a:commands:1230371551849877515>   Command List')
            .setThumbnail('attachment://commands-thumbnail.gif')
            .setDescription('<a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694>\n')
            .addFields(
                { name: '<a:paper_scroll:1230373637744496650>   Information', value: '/`commands` - Lists all usable commands.\n' +
                                            '/`system` - Explains how ranks, levels, and XP work.\n' +
                                            '/`classes` - Details the different classes of SCPs.\n' +
                                            '/`history` - Provides details on the theme of the bot for more context and a brief history of what the SCP Foundation is.\n' +
                                            '/`faq` - Frequently Asked Questions about bot functionality.\n' +
                                            '**/`vip` - VIP Benefits Details. Get additional features by becoming a donor!** <a:thunder:1230360956056375317><a:thunder:1230360956056375317><a:thunder:1230360956056375317>' },
                { name: '<a:dice:1228555582655561810>   Gameplay', value: '`/card` - Displays your personal card and progress details. This is the first command you should use to start playing.\n' +
                                            '/`capture` - Capture an SCP and add it to your collection. You may obtain duplicates that can be used for trading with someone else. ' +
                                            'The rarity (class) of the SCP will influence the probabilities of obtaining it. You can only capture **5 SCPs** per day.\n' +
                                            '/`showcard` `<SCP ID>` - Shows one of your cards to the public.\n' +
                                            '/`viewcard` `<SCP ID>` - Privately displays one of your owned cards.\n' +
                                            '/`scp` - Lists the SCPs you currently have, including duplicates.' },
                { name: '<a:box:1230371194302234644>   Trading System', value: '/`trade` - Creates a trade request to a user, specifying the user, the SCP they have, and the one you are willing to trade. ' +
                                                    'When the other user accepts your request, the trade will be executed automatically. **Before accepting, there is a 1-minute cooldown ' +
                                                    'in case a request was sent by mistake.**\n' +
                                                    '/`accepttrade` `<Trade ID>` - Accepts the request, and the trade is done.\n' +
                                                    '/`declinetrade` `<Trade ID>` - Declines a trade offer.\n' +
                                                    '/`canceltrade` `<Trade ID>` - Cancels a specific trade you have sent.\n' +
                                                    '/`viewtrade` `<Trade ID>` - Displays the details of a trade.\n' +
                                                    '/`senttrades` - Lists pending trades along with a history of trades you have done.\n' +
                                                    '/`receivedtrades` - Lists the trade requests you have pending to accept or decline.' },
            )
            .setTimestamp()
            .setFooter({ text: 'To submit suggestions or report errors: <Google Form> (reward given for finding errors)', iconURL: 'attachment://commands-iconFooter.jpg' });

        await interaction.reply({ embeds: [embed], files: [thumbnail, iconFooter] });
    },
};
