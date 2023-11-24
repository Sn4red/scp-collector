const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const firebase = require('../../utils/firebase');

const database = firebase.firestore();

module.exports = {
    cooldown: 60,
    data: new SlashCommandBuilder()
        .setName('tradear')
        .setDescription('Crea una petición de tradeo directa a un usuario.'),
    async execute(interaction) {
        const idUsuario = interaction.user.id;

        const referenciaUsuarioEmisor = database.collection('usuario').doc(idUsuario);
        const snapshotUsuarioEmisor = await referenciaUsuarioEmisor.get();

        if (snapshotUsuarioEmisor.exists) {
            const modal = new ModalBuilder()
                .setCustomId(`modal-${idUsuario}`)
                .setTitle('Petición de Tradeo');

            const txtReceptor = new TextInputBuilder()
                .setCustomId('txtReceptor')
                .setLabel('Usuario:')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('123456789')
                .setRequired(true);

            const txtCartaEmisor = new TextInputBuilder()
                .setCustomId('txtCartaEmisor')
                .setLabel('Carta a ofrecer:')
                .setStyle(TextInputStyle.Short)
                .setMinLength(7)
                .setMaxLength(8)
                .setPlaceholder('SCP-000')
                .setRequired(true);
        
            const txtCartaReceptor = new TextInputBuilder()
                .setCustomId('txtCartaReceptor')
                .setLabel('Carta deseada:')
                .setStyle(TextInputStyle.Short)
                .setMinLength(7)
                .setMaxLength(8)
                .setPlaceholder('SCP-000')
                .setRequired(true);
            
            const rowReceptor = new ActionRowBuilder().addComponents(txtReceptor);
            const rowCartaEmisor = new ActionRowBuilder().addComponents(txtCartaEmisor);
            const rowCartaReceptor = new ActionRowBuilder().addComponents(txtCartaReceptor);
        
            modal.addComponents(rowReceptor, rowCartaEmisor, rowCartaReceptor);
        
            await interaction.showModal(modal);

            const filtro = (x) => x.customId === `modal-${idUsuario}`;
            const tiempo = 1000 * 60 * 1;

            interaction.awaitModalSubmit({ filter: filtro, time: tiempo }).then(async (modalInteraction) => {
                const valorReceptor = modalInteraction.fields.getTextInputValue('txtReceptor');
                const valorCartaEmisor = modalInteraction.fields.getTextInputValue('txtCartaEmisor');
                const valorCartaReceptor = modalInteraction.fields.getTextInputValue('txtCartaReceptor');

                // Avisa a la API de Discord que la interacción se recibió correctamente y da un tiempo máximo de 15 minutos.
                await modalInteraction.deferReply({ ephemeral: true });

                const referenciaCartasEmisor = database.collection('obtencion').where('usuario', '==', referenciaUsuarioEmisor);
                const snapshotCartasEmisor = await referenciaCartasEmisor.get();

                let promesas = [];

                for (const x of snapshotCartasEmisor.docs) {
                    const obtencion = x.data();
                    const referenciaCarta = obtencion.carta;
                    const documentoCarta = referenciaCarta.get();

                    promesas.push(documentoCarta);
                }

                const cartasArrayEmisor = await Promise.all(promesas);
                const cartaEncontradaEmisor = cartasArrayEmisor.find((x) => x.id === valorCartaEmisor);

                if (cartaEncontradaEmisor) {
                    const referenciaUsuarioReceptor = database.collection('usuario').doc(valorReceptor);
                    const snapshotUsuarioReceptor = await referenciaUsuarioReceptor.get();

                    if (snapshotUsuarioReceptor.exists) {
                        const referenciaCartasReceptor = database.collection('obtencion').where('usuario', '==', referenciaUsuarioReceptor);
                        const snapshotCartasReceptor = await referenciaCartasReceptor.get();

                        promesas = [];

                        for (const x of snapshotCartasReceptor.docs) {
                            const obtencion = x.data();
                            const referenciaCarta = obtencion.carta;
                            const documentoCarta = referenciaCarta.get();

                            promesas.push(documentoCarta);
                        }

                        const cartasArrayReceptor = await Promise.all(promesas);
                        const cartaEncontradaReceptor = cartasArrayReceptor.find((x) => x.id === valorCartaReceptor);

                        if (cartaEncontradaReceptor) {
                            // Acá ya pasa todo el filtro de validaciones y falta programar el registro de la solicitud de tradeo.
                            // Queda pendiente ordenar el código para que sea más modular.
                        } else {
                            modalInteraction.editReply('Solicitud cancelada ¡Parece que el usuario no tiene la carta que quieres!');
                        }
                    } else {
                        modalInteraction.editReply('Solicitud cancelada. El usuario con el que intentas tradear todavía no está registrado.');
                    }
                } else {
                    modalInteraction.editReply('Solicitud cancelada ¡Parece que no tienes la carta que estás ofreciendo!');
                }
            }).catch((error) => {
                console.log(`Error: ${error}`);
            });
        } else {
            await interaction.reply('¡No estás registrado! Usa /tarjeta para guardar tus datos.');
        }
    },
};
