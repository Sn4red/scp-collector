const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } = require('discord.js');
const firebase = require('../../utils/firebase');

const database = firebase.firestore();

module.exports = {
    cooldown: 60,
    data: new SlashCommandBuilder()
        .setName('cancelartradeo')
        .setDescription('Cancela un tradeo en específico que hayas enviado.')
        .addStringOption(x =>
            x.setName('solicitud')
            .setDescription('ID solicitud del tradeo a cancelar.')
            .setRequired(true)),
    async execute(interaction) {
        // Avisa a la API de Discord que la interacción se recibió correctamente y da un tiempo máximo de 15 minutos.
        await interaction.deferReply({ ephemeral: true });

        const idUsuario = interaction.user.id;

        const referenciaUsuario = database.collection('usuario').doc(idUsuario);
        const snapshotUsuario = await referenciaUsuario.get();

        if (snapshotUsuario.exists) {
            const idTradeo = interaction.options.getString('solicitud');

            const referenciaTradeo = database.collection('tradeo').doc(idTradeo);
            const snapshotTradeo = await referenciaTradeo.get();

            if (snapshotTradeo.exists) {
                const tradeo = snapshotTradeo.data();

                if (tradeo.emisor == idUsuario) {
                    const rowBotones = desplegarBotones();

                    const respuesta = await interaction.editReply({
                        content: `¿Estás seguro de cancelar la solicitud de tradeo **${snapshotTradeo.id}**?`,
                        components: [rowBotones],
                    });

                    const filtroCollector = (x) => x.user.id === tradeo.emisor;
                    const tiempo = 1000 * 30;

                    const collector = respuesta.createMessageComponentCollector({ componentType: ComponentType.Button, filter: filtroCollector, time: tiempo });

                    let mensajeEliminado = false;

                    collector.on('collect', async (boton) => {
                        if (boton.customId === 'confirmar') {
                            mensajeEliminado = true;

                            await database.collection('tradeo').doc(snapshotTradeo.id).delete();

                            // Falta deslockear la carta del usuario emisor.

                            await interaction.followUp({ content: `Tradeo >> **${snapshotTradeo.id}** << cancelado con éxito.`, ephemeral: true });
                            await interaction.deleteReply();
                        }

                        if (boton.customId === 'cancelar') {
                            mensajeEliminado = true;

                            await interaction.deleteReply();
                        }
                    });

                    collector.on('end', async () => {
                        if (!mensajeEliminado) {
                            await interaction.deleteReply();
                        }
                    });
                } else {
                    await interaction.editReply('Error. No puedes cancelar este tradeo porque no eres el propietario.');
                }
            } else {
                await interaction.editReply('¡No existe un tradeo con esa ID!');
            }
        } else {
            await interaction.editReply('¡No estás registrado(a)! Usa /tarjeta para guardar tus datos.');
        }
    },
};

function desplegarBotones() {
    const confirmar = new ButtonBuilder()
        .setCustomId('confirmar')
        .setLabel('Confirmar')
        .setStyle(ButtonStyle.Danger);
    
    const cancelar = new ButtonBuilder()
        .setCustomId('cancelar')
        .setLabel('Cancelar')
        .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder();

    row.addComponents(cancelar, confirmar);

    return row;
}
