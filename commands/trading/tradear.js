const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    cooldown: 1800,
    data: new SlashCommandBuilder()
        .setName('tradear')
        .setDescription('Envía una petición de tradeo directa a un usuario.'),
    async execute(interaction) {
        await interaction.reply('Aea');
    },
};
