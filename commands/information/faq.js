const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    cooldown: 1800,
    data: new SlashCommandBuilder()
        .setName('faq')
        .setDescription('Preguntas frecuentes sobre la funcionalidad del bot.'),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(0x000000)
            .setTitle('FAQ - Preguntas Frecuentes')
            .setDescription('He aquí algunas preguntas que pueden resultar comunes y pueden presentarse durante el uso de este bot.')
            .setThumbnail('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTQzl95DWl_GNe1tk4Z10e0lVfsavY_OhQNJQ&usqp=CAU')
            .setFields(
                { name: '¿Mi progreso es local en cada servidor?', value: 'Tu progreso en el juego es a nivel global. Por ejemplo, si obtienes SCP\'s desde un servidor, ' +
                        'deberías poder visualizar tus cartas desde otro servidor diferente. Esto es porque el bot utiliza una sola base de datos, donde se guarda ' +
                        'referencia de tu progreso con tu ID de usuario en Discord.' },
                { name: '¿Se agregarán más cartas SCP\'s?', value: 'Con el tiempo se irán agregando más cartas de forma continua. Requiere tiempo agregarlos a la base ' +
                        'de datos.' },
            )
            .setTimestamp()
            .setFooter({ text: 'Usa /comandos para ver toda la lista de comandos disponibles.', iconURL: 'https://media.tenor.com/qVlSOwUINxcAAAAC/scp-logo.gif' });

        await interaction.reply({ embeds: [embed] });
    },
};
