const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    cooldown: 1800,
    data: new SlashCommandBuilder()
        .setName('comandos')
        .setDescription('Lista todos los comandos utilizables.'),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(0x000000)
            .setTitle('Lista de Comandos')
            .setThumbnail('https://media.tenor.com/qVlSOwUINxcAAAAC/scp-logo.gif')
            .addFields(
                { name: 'Información', value: '/comandos - Lista todos los comandos utilizables.\n' +
                                            '/tarjeta - Muestra tu tarjeta personal y el detalle de tu progreso.\n' +
                                            '/sistema - Explica cómo funcionan los rangos, niveles y experiencia.\n' +
                                            '/clases - Detalla las diferentes clases de SCP\'s.\n' +
                                            '/historia - Detalla la temática del bot para más contexto y un poco de historia sobre qué es La Fundación SCP.\n' +
                                            '/faq - Preguntas frecuentes sobre la funcionalidad del bot.' },
                { name: 'Jugabilidad', value: '/capturar - Atrapa un SCP y lo añades a tu colección. Puedes obtener repetidos que servirán para que puedas intercambiarlos ' +
                                            'con un tercero. La rareza (clase) del SCP influirá en las probabilidades de que lo obtengas. Sólo puedes capturar 5 SCP\'s al día.\n' +
                                            '/scp - Lista los SCP\'s que tienes por el momento, incluyendo los repetidos.' },
                { name: 'Sistema de Tradeo', value: '/tradear - Crea una petición de tradeo directa a un usuario, especificando el usuario, el SCP que tiene y el que estás dispuesto' +
                                                    'a tradear. Cuando el otro usuario acepta tu petición, se realizará el  tradeo de forma automática. ' +
                                                    '**Antes de poder aceptar, hay un cooldown de 1 minuto por si se envió una solicitud por error.**\n' +
                                                    '/aceptartradeo <ID solicitud> - Acepta la petición y se realiza el tradeo.\n' +
                                                    '/rechazartradeo <ID solicitud> - Rechaza una oferta de tradeo.\n' +
                                                    '/cancelartradeo <ID solicitud> - Cancela un tradeo en específico que hayas enviado.\n' +
                                                    '/vertradeo <ID solicitud> - Muestra el detalle de un tradeo.\n' +
                                                    '/listatradeosenviados - Lista los tradeos que están pendientes junto con un historial de tradeos que has realizado.\n' +
                                                    '/tradeosrecibidos - Lista las solicitudes de tradeos que tienes pendientes de aceptar o rechazar.' },
            )
            .setTimestamp()
            .setFooter({ text: 'Para enviar sugerencias o reportar errores: <Google Form>', iconURL: 'https://logowik.com/content/uploads/images/google-forms8392.jpg' });

        await interaction.reply({ embeds: [embed] });
    },
};
