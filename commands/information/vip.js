const path = require('node:path');
const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    cooldown: 60 * 30,
    data: new SlashCommandBuilder()
        .setName('vip')
        .setDescription('VIP Benefits Details. Get additional features by becoming a donor!'),
    async execute(interaction) {
        // * Notify the Discord API that the interaction was received successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply();

        const thumbnailPath = path.join(__dirname, '../../images/embed/vip-thumbnail.gif');
        const iconFooterPath = path.join(__dirname, '../../images/embed/vip-iconFooter.gif');

        const thumbnail = new AttachmentBuilder(thumbnailPath);
        const iconFooter = new AttachmentBuilder(iconFooterPath);

        const embed = new EmbedBuilder()
            .setColor(0x010101)
            .setTitle(`${process.env.EMOJI_THUNDER}   VIP Features`)
            .setDescription(`${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}\n` +
                            'You can get extra features by subscribing to the Patreon page. In the following link, you can find the details,' +
                            'and make sure to link your Patreon account with Discord so you can enjoy all the benefits: [patreon.com/Sn4red](https://www.patreon.com/Sn4red/)\n\n' +
                            'Below are the exclusive benefits:\n\n' +
                            '- 10 shots daily instead of 5.\n' +
                            '- Double XP when capturing SCP cards.\n' +
                            '- Double crystals when capturing and merging SCP cards.\n' +
                            '- 1000 crystals at the end of each month.\n' +
                            '- Better chances of obtaining rare class cards.\n' +
                            '- Opportunity to obtain holographic cards (Use /`classes` for more information).\n' +
                            '- A golden seal on your ID card.\n\n' +
                            'Note that as more features are added with future updates, the benefits may change.')
            .setThumbnail('attachment://vip-thumbnail.gif')
            .setTimestamp()
            .setFooter({ text: 'Use /commands to see the full list of available commands.', iconURL: 'attachment://vip-iconFooter.gif' });

        await interaction.editReply({ embeds: [embed], files: [thumbnail, iconFooter] });
    },
};