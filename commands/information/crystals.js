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
            .setTitle(`${process.env.EMOJI_MARKET}   Crystal System`)
            .setDescription(`${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}\n` +
                            'Crystals are a type of currency that can only be earned by capturing SCPs and merging them. The amount of crystals you receive depends on the class of the SCP:\n\n' +
                            `Safe -> ${process.env.EMOJI_CRYSTAL} 10\n` +
                            `Euclid -> ${process.env.EMOJI_CRYSTAL} 20\n` +
                            `Keter -> ${process.env.EMOJI_CRYSTAL} 30\n` +
                            `Thaumiel -> ${process.env.EMOJI_CRYSTAL} 50\n` +
                            `Apollyon -> ${process.env.EMOJI_CRYSTAL} 100\n\n` +
                            'You can spend your crystals in the **market**. Each week, 5 cards are available for purchase. You can view them by using /`market`. Also the price depends on the type of class:\n\n' +
                            `Safe -> ${process.env.EMOJI_CRYSTAL} 1000\n` +
                            `Euclid -> ${process.env.EMOJI_CRYSTAL} 2000\n` +
                            `Keter -> ${process.env.EMOJI_CRYSTAL} 3000\n` +
                            `Thaumiel -> ${process.env.EMOJI_CRYSTAL} 5000\n` +
                            `Apollyon -> ${process.env.EMOJI_CRYSTAL} 10000\n\n` +
                            'Adittionaly, the price is incremented if the card has a holographic feature:\n\n' +
                            `${process.env.EMOJI_EMERALD}   Emerald -> ${process.env.EMOJI_CRYSTAL} +200\n` +
                            `${process.env.EMOJI_GOLDEN}    Golden -> ${process.env.EMOJI_CRYSTAL} +300\n` +
                            `${process.env.EMOJI_DIAMOND}   Diamond -> ${process.env.EMOJI_CRYSTAL} +500\n`)
            .setThumbnail('attachment://crystals-thumbnail.gif')
            .setTimestamp()
            .setFooter({ text: 'Use /commands to see the full list of available commands.', iconURL: 'attachment://crystals-iconFooter.gif' });

        await interaction.editReply({ embeds: [embed], files: [thumbnail, iconFooter] });
    },
};
