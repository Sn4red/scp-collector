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
            const modal = desplegarModal(idUsuario);
        
            await interaction.showModal(modal);

            const filtro = (x) => x.customId === `modal-${idUsuario}`;
            const tiempo = 1000 * 60 * 1;

            interaction.awaitModalSubmit({ filter: filtro, time: tiempo }).then(async (modalInteraction) => {
                const valorReceptor = modalInteraction.fields.getTextInputValue('txtReceptor');
                const valorCartaEmisor = modalInteraction.fields.getTextInputValue('txtCartaEmisor');
                const valorCartaReceptor = modalInteraction.fields.getTextInputValue('txtCartaReceptor');

                // Avisa a la API de Discord que la interacción se recibió correctamente y da un tiempo máximo de 15 minutos.
                await modalInteraction.deferReply({ ephemeral: true });

                const validacionCampos = validarCampos(valorReceptor, valorCartaEmisor, valorCartaReceptor);

                const cartaEncontradaEmisor = await encontrarCarta(referenciaUsuarioEmisor, valorCartaEmisor);

                if (cartaEncontradaEmisor) {
                    const referenciaUsuarioReceptor = database.collection('usuario').doc(valorReceptor);
                    const snapshotUsuarioReceptor = await referenciaUsuarioReceptor.get();

                    if (snapshotUsuarioReceptor.exists) {
                        const cartaEncontradaReceptor = await encontrarCarta(referenciaUsuarioReceptor, valorCartaReceptor);

                        if (cartaEncontradaReceptor) {
                            const registroTradeo = database.collection('tradeo').doc();

                            await registroTradeo.set({
                                cartaEmisor: cartaEncontradaEmisor.ref,
                                cartaReceptor: cartaEncontradaReceptor.ref,
                                confirmacionTradeo: false,
                                cooldownSeguridad: new Date(),
                                emisor: idUsuario,
                                fechaTradeo: null,
                                receptor: valorReceptor,
                            });

                            lockearCarta(referenciaUsuarioEmisor, cartaEncontradaEmisor);

                            modalInteraction.editReply(`Solicitud de tradeo enviada con el ID **${registroTradeo.id}**. Puedes usar el mismo ID para cancelar la solicitud.`);
                        } else {
                            modalInteraction.editReply('Solicitud cancelada ¡Parece que el usuario no tiene la carta que quieres!');
                        }
                    } else {
                        modalInteraction.editReply('Solicitud cancelada. El usuario con el que intentas tradear todavía no está registrado o no se ha encontrado.');
                    }
                } else {
                    modalInteraction.editReply('Solicitud cancelada ¡Parece que no tienes la carta que estás ofreciendo!');
                }
            }).catch((error) => {
                console.log(`Error: ${error}`);
            });
        } else {
            await interaction.reply('¡No estás registrado(a)! Usa /tarjeta para guardar tus datos.');
        }
    },
};

// Función que construye el modal.
function desplegarModal(idUsuario) {
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

    return modal;
}

function validarCampos(valorReceptor, valorCartaEmisor, valorCartaReceptor) {
    // Se realiza la validación de que el ID del usuario contenga sólo números.
    const validacionReceptor = /^[0-9]+$/.test(valorReceptor);
    
    // Se realiza la validación de que el formato de la carta sea correcta.
    const validacionCartaEmisor = /^scp-\d{3,4}$/i.test(valorCartaEmisor);
    const validacionCartaReceptor = /^scp-\d{3,4}$/i.test(valorCartaReceptor);

    // Se realiza una validación alternativa si se especifica el ID de la carta con sólo números.
    const validacionCartaEmisorNumeros = /^\d{3,4}$/.test(valorCartaEmisor);
    const validacionCartaReceptorNumeros = /^\d{3,4}$/.test(valorCartaReceptor);
    
    let resultado = '';

    if (validacionReceptor == false) {
        resultado += 'Los siguientes datos fueron ingresados incorrectamente: ID Usuario';

        if (validacionCartaEmisor == false) {
            resultado += ', carta ofrecida';
        }
    }

    // Armar un if else para validar si se ingresó cualquiera de las 2 formas de ID de carta y luego realizar los filtros del mensaje.
    // Se debe de retornar el resultado, con los 2 valores de ID de carta.

    return {  };
}

// Esta función busca una carta de un usuario que no esté 'lockeado'.
async function encontrarCarta(referenciaUsuario, valorCarta) {
    const referenciaCartasEmisor = database.collection('obtencion').where('usuario', '==', referenciaUsuario).where('lockeado', '==', false);
    const snapshotCartasEmisor = await referenciaCartasEmisor.get();

    const promesas = [];
    
    for (const x of snapshotCartasEmisor.docs) {
        const obtencion = x.data();
        const referenciaCarta = obtencion.carta;
        const documentoCarta = referenciaCarta.get();

        promesas.push(documentoCarta);
    }

    const cartasArrayEmisor = await Promise.all(promesas);
    const cartaEncontradaEmisor = cartasArrayEmisor.find((x) => x.id === valorCarta);

    return cartaEncontradaEmisor;
}

// Esta función 'lockea' la carta del que crea la solicitud para que no pueda usarse para otros tradeos en paralelo.
async function lockearCarta(referenciaUsuarioEmisor, cartaEncontradaEmisor) {
    const referenciaCarta = database.collection('obtencion').where('usuario', '==', referenciaUsuarioEmisor)
                                                            .where('carta', '==', cartaEncontradaEmisor.ref)
                                                            .where('lockeado', '==', false).limit(1);
    const snapshotCarta = await referenciaCarta.get();
    
    const documentoCarta = snapshotCarta.docs[0];

    documentoCarta.ref.update({
        lockeado: true,
    });
}
