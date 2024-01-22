const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    cooldown: 1800,
    data: new SlashCommandBuilder()
        .setName('faq')
        .setDescription('Preguntas frecuentes sobre la funcionalidad del bot.'),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(0x000000)
            .setTitle('📌   FAQ - Preguntas Frecuentes')
            .setDescription('He aquí algunas preguntas que pueden resultar comunes y pueden presentarse durante el uso de este bot.')
            .setThumbnail('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTQzl95DWl_GNe1tk4Z10e0lVfsavY_OhQNJQ&usqp=CAU')
            .setFields(
                { name: '¿Mi progreso es local en cada servidor?', value: 'Tu progreso con el bot es a nivel global. Las acciones que hagas en un servidor se pueden reflejar en otro. ' +
                        'Por ejemplo, si obtienes cartas desde un servidor, deberías poder visualizarlas desde otro distinto.' },
                { name: '¿Cuántas cartas SCP hay por el momento?', value: 'Se está abarcando la Serie I (002-999). Con el tiempo se irán agregando más.' },
                { name: '¿Se pueden obtener beneficios extra?', value: 'Considera donar en el siguiente enlace para poder ver el detalle de beneficios: <Patreon>' },
            )
            .setTimestamp()
            .setFooter({ text: 'Usa /comandos para ver toda la lista de comandos disponibles.', iconURL: 'https://media.tenor.com/qVlSOwUINxcAAAAC/scp-logo.gif' });

        await interaction.reply({ embeds: [embed] });
    },
};
