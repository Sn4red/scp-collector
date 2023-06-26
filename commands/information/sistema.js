const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    cooldown: 1800,
    data: new SlashCommandBuilder()
        .setName('sistema')
        .setDescription('Explica cómo funcionan los rangos, niveles y experiencia.'),
    async execute(interaction) {
        const exampleEmbed = new EmbedBuilder()
            .setColor(0x000000)
            .setTitle('Sistema de Progreso')
            .setDescription('Cada usuario consta de rango, nivel y experiencia. Los rangos son los siguientes:\n\n' +
                            '- Clase D\n' +
                            '- Oficial de Seguridad\n' +
                            '- Investigador\n' +
                            '- Especialista de Contención\n' +
                            '- Agente de Campo\n' +
                            '- Director de Sede\n' +
                            '- Miembro del Consejo O5\n\n' +
                            'Al empezar a jugar, comienzas con el rango de Clase D en nivel 1. Cada rango consta de 20 niveles para ascender al siguiente. ' +
                            'El XP es lo que hace que subas de nivel, y por lo tanto, de rango. Esto se obtiene coleccionando más SCP\'s, ya sea capturándolos o tradeándolos. ' +
                            'La rareza (clase) del SCP influye en la cantidad de XP que recibirás. Puedes usar **/tarjeta** donde se detalla tu progreso en el juego, como tu rango, ' +
                            'nivel, XP, cantidad de SCP\'s capturados y más.')
            .setThumbnail('https://bbts1.azureedge.net/images/p/full/2022/09/b909846f-def6-4522-bbf5-dbf18eac5e29.jpg')
            .setTimestamp()
            .setFooter({ text: 'Usa /comandos para ver toda la lista de comandos disponibles.', iconURL: 'https://media.tenor.com/qVlSOwUINxcAAAAC/scp-logo.gif' });

        await interaction.reply({ embeds: [exampleEmbed] });
    },
};
