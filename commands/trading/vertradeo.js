const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    cooldown: 1800,
    data: new SlashCommandBuilder()
        .setName('vertradeo')
        .setDescription('Muestra el detalle de un tradeo.'),
    async execute(interaction) {
        // Notify the Discord API that the interaction was received successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply();

        await interaction.editReply('Aeaaaa');
    },
};
