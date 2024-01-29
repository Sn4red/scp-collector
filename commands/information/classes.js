const path = require('node:path');
const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    cooldown: 1800,
    data: new SlashCommandBuilder()
        .setName('classes')
        .setDescription('Details the different classes of SCPs.'),
    async execute(interaction) {
        const thumbnailPath = path.join(__dirname, '../../images/embed/classes-thumbnail.jpg');
        const iconFooterPath = path.join(__dirname, '../../images/embed/classes-iconFooter.gif');

        const thumbnail = new AttachmentBuilder(thumbnailPath);
        const iconFooter = new AttachmentBuilder(iconFooterPath);

        const embed = new EmbedBuilder()
            .setColor(0x000000)
            .setTitle('⚠️   Object Classes')
            .setDescription('All objects, entities, and anomalous phenomena requiring Special Containment Procedures are assigned an **Object Class**. ' +
                            'They serve as an approximate indicator of how difficult an object is to contain. The following are covered here:\n\n' +
                            '- Safe -> +5XP -> 40% probability\n' +
                            '- Euclid -> +15XP -> 30% probability\n' +
                            '- Keter -> +30XP -> 21% probability\n' +
                            '- Thaumiel -> +100XP -> 7% probability\n' +
                            '- Apollyon -> +200XP -> 2% probability\n')
            .setThumbnail('attachment://classes-thumbnail.jpg')
            .setTimestamp()
            .setFooter({ text: 'Use /commands to see the full list of available commands.', iconURL: 'attachment://classes-iconFooter.gif' });

        await interaction.reply({ embeds: [embed], files: [thumbnail, iconFooter] });
    },
};
