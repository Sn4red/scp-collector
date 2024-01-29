const path = require('node:path');
const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    cooldown: 1800,
    data: new SlashCommandBuilder()
        .setName('system')
        .setDescription('Explains how ranks, levels, and experience work.'),
    async execute(interaction) {
        const thumbnailPath = path.join(__dirname, '../../images/embed/system-thumbnail.jpg');
        const iconFooterPath = path.join(__dirname, '../../images/embed/system-iconFooter.gif');

        const thumbnail = new AttachmentBuilder(thumbnailPath);
        const iconFooter = new AttachmentBuilder(iconFooterPath);

        const embed = new EmbedBuilder()
            .setColor(0x000000)
            .setTitle('📈   Progress System')
            .setDescription('Each user has a rank, level, and experience. The ranks are as follows:\n\n' +
                            '- Class D\n' +
                            '- Security Officer\n' +
                            '- Investigator\n' +
                            '- Containment Specialist\n' +
                            '- Field Agent\n' +
                            '- Site Director\n' +
                            '- O5 Council Member\n\n' +
                            'When you start playing, you begin with the rank of Class D at level 1. Each rank consists of 20 levels to ascend to the next. XP is what makes you ' +
                            'level up, and consequently, rank up. This is obtained by capturing SCPs. The rarity (class) of the SCP influences the amount of XP you will receive. ' +
                            'You can use /card to see your progress in the game, such as your rank, level, XP, the number of SCPs captured, and more.')
            .setThumbnail('attachment://system-thumbnail.jpg')
            .setTimestamp()
            .setFooter({ text: 'Use /commands to see the full list of available commands.', iconURL: 'attachment://system-iconFooter.gif' });

        await interaction.reply({ embeds: [embed], files: [thumbnail, iconFooter] });
    },
};
