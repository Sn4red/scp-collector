const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    cooldown: 1800,
    data: new SlashCommandBuilder()
        .setName('clases')
        .setDescription('Detalla las diferentes clases de SCP\'s.'),
    async execute(interaction) {
        const exampleEmbed = new EmbedBuilder()
            .setColor(0x000000)
            .setTitle('Clases de Objetos')
            .setDescription('Todos los objetos, entidades y fenómenos anómalos que requieran Procedimientos Especiales de Contención se les asigna una **Clase de Objeto**. ' +
                            'Sirven como un indicador aproximado de qué tan difícil es contener un objeto. Acá se abarcan las siguientes:\n\n' +
                            '- Seguro\n' +
                            '- Euclid\n' +
                            '- Keter\n' +
                            '- Taumiel\n' +
                            '- Apollyon\n')
            .setThumbnail('https://static.wikia.nocookie.net/scp/images/e/ea/Scp1471.jpg/revision/latest/scale-to-width-down/270?cb=20200804162123&path-prefix=es')
            .setTimestamp()
            .setFooter({ text: 'Usa /comandos para ver toda la lista de comandos disponibles.', iconURL: 'https://media.tenor.com/qVlSOwUINxcAAAAC/scp-logo.gif' });

        await interaction.reply({ embeds: [exampleEmbed] });
    },
};
