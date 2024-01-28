const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    cooldown: 1800,
    data: new SlashCommandBuilder()
        .setName('clases')
        .setDescription('Detalla las diferentes clases de SCPs.'),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(0x000000)
            .setTitle('⚠️   Clases de Objetos')
            .setDescription('Todos los objetos, entidades y fenómenos anómalos que requieran Procedimientos Especiales de Contención se les asigna una **Clase de Objeto**. ' +
                            'Sirven como un indicador aproximado de qué tan difícil es contener un objeto. Aquí se abarcan las siguientes:\n\n' +
                            '- Seguro -> +5XP -> 40% probabilidad\n' +
                            '- Euclid -> +15XP -> 30% probabilidad\n' +
                            '- Keter -> +30XP -> 21% probabilidad\n' +
                            '- Taumiel -> +100XP -> 7% probabilidad\n' +
                            '- Apollyon -> +200XP -> 2% probabilidad\n')
            .setThumbnail('https://static.wikia.nocookie.net/scp/images/e/ea/Scp1471.jpg/revision/latest/scale-to-width-down/270?cb=20200804162123&path-prefix=es')
            .setTimestamp()
            .setFooter({ text: 'Usa /comandos para ver toda la lista de comandos disponibles.', iconURL: 'https://media.tenor.com/qVlSOwUINxcAAAAC/scp-logo.gif' });

        await interaction.reply({ embeds: [embed] });
    },
};
