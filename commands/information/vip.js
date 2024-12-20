const path = require('node:path');
const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    cooldown: 60 * 30,
    data: new SlashCommandBuilder()
        .setName('vip')
        .setDescription('VIP Benefits Details. Get additional features by becoming a donor!'),
    async execute(interaction) {
        const thumbnailPath = path.join(__dirname, '../../images/embed/vip-thumbnail.gif');
        const iconFooterPath = path.join(__dirname, '../../images/embed/vip-iconFooter.gif');

        const thumbnail = new AttachmentBuilder(thumbnailPath);
        const iconFooter = new AttachmentBuilder(iconFooterPath);

        const embed = new EmbedBuilder()
            .setColor(0x010101)
            .setTitle('<a:thunder:1230360956056375317>   VIP Features')
            .setDescription('<a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694>\n' +
                            'You can get extra features by subscribing to the Patreon page. In the following link, you can find the details,' +
                            'and make sure to link your Patreon account with Discord so you can enjoy all the benefits: [patreon.com/Sn4red](https://www.patreon.com/Sn4red/)\n\n' +
                            'Below are the exclusive benefits:\n\n' +
                            '- 10 shots daily instead of 5.\n' +
                            '- Double XP for capturing SCP cards.\n' +
                            '- Better chances of obtaining rare class cards.\n' +
                            '- Opportunity to obtain holographic cards (Use /`classes` for more information).\n' +
                            '- A golden seal on your ID card.')
            .setThumbnail('attachment://vip-thumbnail.gif')
            .setTimestamp()
            .setFooter({ text: 'Use /commands to see the full list of available commands.', iconURL: 'attachment://vip-iconFooter.gif' });

        await interaction.reply({ embeds: [embed], files: [thumbnail, iconFooter] });
    },
};