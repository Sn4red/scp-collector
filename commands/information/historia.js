const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    cooldown: 1800,
    data: new SlashCommandBuilder()
        .setName('historia')
        .setDescription('Detalla la temática del bot para más contexto y un poco de historia sobre qué es La Fundación SCP.'),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(0x000000)
            .setTitle('🏛️   La Fundación SCP')
            .setDescription('Operando de forma clandestina y global, La Fundación actúa más allá de toda jurisdicción, reforzada por los grandes gobiernos nacionales que ' +
                            'le han encomendado la tarea de contener objetos, entes y fenómenos anómalos. Estas anomalías suponen una amenaza significativa para la seguridad ' +
                            'global, al ser capaces de causar daño físico o psicológico.\n\n' +
                            'La Fundación actúa para mantener la normalidad, de tal manera que la población civil de todo el mundo pueda vivir y ocuparse de sus vidas ' +
                            'cotidianas sin miedo, desconfianza o dudas sobre sus creencias personales, y para mantener la independencia humana de influencias extraterrestres, ' +
                            'extradimensionales y extranormales en general.')
            .setThumbnail('https://media.tenor.com/SRrg39SSX2YAAAAC/scp.gif')
            .setTimestamp()
            .setFooter({ text: 'Usa /comandos para ver toda la lista de comandos disponibles.', iconURL: 'https://media.tenor.com/qVlSOwUINxcAAAAC/scp-logo.gif' });

        await interaction.reply({ embeds: [embed] });
    },
};
