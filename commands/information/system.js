const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    cooldown: 1800,
    data: new SlashCommandBuilder()
        .setName('system')
        .setDescription('Explains how ranks, levels, and experience work.'),
    async execute(interaction) {
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
            .setThumbnail('https://bbts1.azureedge.net/images/p/full/2022/09/b909846f-def6-4522-bbf5-dbf18eac5e29.jpg')
            .setTimestamp()
            .setFooter({ text: 'Use /commands to see the full list of available commands.', iconURL: 'https://media.tenor.com/qVlSOwUINxcAAAAC/scp-logo.gif' });

        await interaction.reply({ embeds: [embed] });
    },
};
