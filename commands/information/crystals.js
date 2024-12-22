const path = require('node:path');
const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    cooldown: 60 * 30,
    data: new SlashCommandBuilder()
        .setName('crystals')
        .setDescription('Explains about the crystal system.'),
    async execute(interaction) {
        // * Notify the Discord API that the interaction was received successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply();

        const thumbnailPath = path.join(__dirname, '../../images/embed/crystals-thumbnail.gif');
        const iconFooterPath = path.join(__dirname, '../../images/embed/crystals-iconFooter.gif');

        const thumbnail = new AttachmentBuilder(thumbnailPath);
        const iconFooter = new AttachmentBuilder(iconFooterPath);

        const embed = new EmbedBuilder()
            .setColor(0x010101)
            .setTitle('<:market:1273476892770435174>   Crystal System')
            .setDescription('<a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694>\n' +
                            'Crystals are a type of currency that can only be earned by capturing SCPs and merging them. The amount of crystals you receive depends on the class of the SCP:\n\n' +
                            'Safe -> <a:crystal:1273453430190375043> 10\n' +
                            'Euclid -> <a:crystal:1273453430190375043> 20\n' +
                            'Keter -> <a:crystal:1273453430190375043> 30\n' +
                            'Thaumiel -> <a:crystal:1273453430190375043> 50\n' +
                            'Apollyon -> <a:crystal:1273453430190375043> 100\n\n' +
                            'You can spend your crystals in the **market**. Each week, 5 cards are available for purchase. You can view them by using /`market`. Also the price depends on the type of class:\n\n' +
                            'Safe -> <a:crystal:1273453430190375043> 1000\n' +
                            'Euclid -> <a:crystal:1273453430190375043> 2000\n' +
                            'Keter -> <a:crystal:1273453430190375043> 3000\n' +
                            'Thaumiel -> <a:crystal:1273453430190375043> 5000\n' +
                            'Apollyon -> <a:crystal:1273453430190375043> 10000\n\n' +
                            'Adittionaly, the price is incremented if the card has a holographic feature:\n\n' +
                            '<a:emerald:1228923470239367238>   Emerald -> <a:crystal:1273453430190375043> +200\n' +
                            '<a:golden:1228925086690443345>    Golden -> <a:crystal:1273453430190375043> +300\n' +
                            '<a:diamond:1228924014479671439>   Diamond -> <a:crystal:1273453430190375043> +500\n')
            .setThumbnail('attachment://crystals-thumbnail.gif')
            .setTimestamp()
            .setFooter({ text: 'Use /commands to see the full list of available commands.', iconURL: 'attachment://crystals-iconFooter.gif' });

        await interaction.editReply({ embeds: [embed], files: [thumbnail, iconFooter] });
    },
};
