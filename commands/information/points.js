const path = require('node:path');
const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    cooldown: 60 * 30,
    data: new SlashCommandBuilder()
        .setName('points')
        .setDescription('Explains about points system.'),
    async execute(interaction) {
        const thumbnailPath = path.join(__dirname, '../../images/embed/points-thumbnail.gif');
        const iconFooterPath = path.join(__dirname, '../../images/embed/points-iconFooter.gif');

        const thumbnail = new AttachmentBuilder(thumbnailPath);
        const iconFooter = new AttachmentBuilder(iconFooterPath);

        const embed = new EmbedBuilder()
            .setColor(0x010101)
            .setTitle('<:market:1273476892770435174>   Points System')
            .setDescription('<a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694>\n' +
                            'Points are a type of currency that can only be earned by capturing SCPs and merging them. The amount of points you receive depends on the class of the SCP:\n\n' +
                            'Safe -> <a:point:1273453430190375043> 10\n' +
                            'Euclid -> <a:point:1273453430190375043> 20\n' +
                            'Keter -> <a:point:1273453430190375043> 30\n' +
                            'Thaumiel -> <a:point:1273453430190375043> 50\n' +
                            'Apollyon -> <a:point:1273453430190375043> 100\n\n' +
                            'You can spend your points in the **market**. Each week, 5 cards are available for purchase. You can view them by using /`market`.')
            .setThumbnail('attachment://points-thumbnail.gif')
            .setTimestamp()
            .setFooter({ text: 'Use /commands to see the full list of available commands.', iconURL: 'attachment://points-iconFooter.gif' });

        await interaction.reply({ embeds: [embed], files: [thumbnail, iconFooter] });
    },
};
