const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    cooldown: 1800,
    data: new SlashCommandBuilder()
        .setName('faq')
        .setDescription('Preguntas frecuentes sobre la funcionalidad del bot.'),
    async execute(interaction) {
        const exampleEmbed = new EmbedBuilder()
            .setColor(0x000000)
            .setTitle('FAQ - Preguntas Frecuentes')
            .setDescription('He aquí algunas preguntas que pueden resultar comunes y pueden presentarse durante el uso de este bot.')
            .setThumbnail('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTQzl95DWl_GNe1tk4Z10e0lVfsavY_OhQNJQ&usqp=CAU')
            .setFields(
                { name: '¿Mi progreso es local en cada servidor?', value: 'Tu progreso en el juego es a nivel global. Por ejemplo, si obtienes SCP\'s desde un servidor, ' +
                        'deberías poder visualizar tu lista de cartas desde otro servidor diferente. Esto es porque el bot utiliza una sola base de datos, donde se guarda ' +
                        'referencia de tu progreso con tu ID de usuario en Discord.' },
                { name: '¿Se agregarán más cartas SCP\'s?', value: 'Con el tiempo se irán agregando más cartas de forma continua. Al ser una cantidad grande, requiere tiempo ' +
                        'para agregarlos a la base de datos. Esto también explica por qué sólo puedes capturar 5 SCP\'s al día. Esto nos da tiempo para ir añadiendo. Cuando ' +
                        'se aumente la cantidad de cartas, se considerará también aumentar la cantidad de capturas al día.' },
            )
            .setTimestamp()
            .setFooter({ text: 'Usa /comandos para ver toda la lista de comandos disponibles.', iconURL: 'https://media.tenor.com/qVlSOwUINxcAAAAC/scp-logo.gif' });

        await interaction.reply({ embeds: [exampleEmbed] });
    },
};
