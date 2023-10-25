const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const firebase = require('../../utils/firebase');

const database = firebase.firestore();

module.exports = {
    cooldown: 300,
    data: new SlashCommandBuilder()
        .setName('scp')
        .setDescription('Lista tu colección de SCP\'s.'),
    async execute(interaction) {
       // Avisa a la API de Discord que la interacción se recibió correctamente y da un tiempo máximo de 15 minutos.
        const mensaje = await interaction.deferReply({ fetchReply: true });

        const referenciaUsuario = database.collection('usuario').doc(interaction.user.id);
        const snapshotUsuario = await referenciaUsuario.get();

        if (snapshotUsuario.exists) {
            const usuario = snapshotUsuario.data();

            const referenciaCartas = database.collection('obtencion').where('usuario', '==', referenciaUsuario);
            const snapshotCartas = await referenciaCartas.get();

            if (!snapshotCartas.empty) {
                // 'cartasCount' almacenará la cantidad repetida por carta.
                // 'cartas' almacenará los datos completos de la carta.
                // 'cartasClase' almacenará las clases de las cartas (no son un campo de la carta, sino del nombre de su colección en Firebase).
                const cartasCount = new Map();
                const cartas = new Map();
                const cartasClase = new Map();

                const promesas = [];

                // Obtiene las cartas por el campo que las hace referencia y almacena el documento en un array.
                // Esto es para obtener los datos de la carta (se necesita el nombre para el listado).
                for (const x of snapshotCartas.docs) {
                    const obtencion = x.data();
                    const referenciaCarta = obtencion.carta;
                    const documentoCarta = referenciaCarta.get();

                    promesas.push(documentoCarta);
                }

                const cartasArray = await Promise.all(promesas);

                // Se guardan los datos requeridos en los maps.
                cartasArray.forEach(x => {
                    const idCarta = x.id;

                    if (cartasCount.has(idCarta)) {
                        cartasCount.set(idCarta, cartasCount.get(idCarta) + 1);
                    } else {
                        cartasCount.set(idCarta, 1);
                        cartas.set(idCarta, x);
                    }

                    cartasClase.set(idCarta, x.ref.parent.parent.id);
                });

                // Se ordena la lista de forma numérica tomando en cuenta el ID después del 'SCP-'
                // (a partir del quinto carácter) y convierte la lista de ID's de la colección en un array.
                const ordenCartas = Array.from(cartasCount.keys()).sort((a, b) => parseInt(a.slice(4), 10) - parseInt(b.slice(4), 10));

                const embed = new EmbedBuilder()
                    .setColor(0x000000)
                    .setTitle('__**Colección de ' + usuario.nick + '**__')
                    .setTimestamp();

                // Se listan las cartas interándose en una sola cadena para mostrarlo en el embed.
                let listaCartas = '';

                ordenCartas.forEach(x => {
                    const carta = cartas.get(x).data();
                    const cantidad = cartasCount.get(x);
                    const clase = cartasClase.get(x);

                    listaCartas += `(${cantidad}) ${x} - ${carta.nombre} - **${clase}**\n`;
                });

                embed.addFields({ name: '\u200B', value: listaCartas });

                await interaction.editReply({ embeds: [embed] });

                mensaje.react('➡️');

                // Filtra sólo reacciones provenientes del usuario que ejecutó el comando y en el emoji añadido en concreto.
                const filtroCollector = (reaction, user) => {
                    return reaction.emoji.name == '➡️' && user.id == interaction.user.id;
                };

                // Se aplica el filtro con otros parámetros para la función awaitReactions.
                mensaje.awaitReactions({ filter: filtroCollector, max: 1, time: 60000, errors: ['time'] })
                    .then((collected) => {
                        console.log('FUNCIONAAAAA')
                    })
                    .catch((collected) =>{
                        console.log('No hubo reacciones.')
                    });
            } else {
                await interaction.editReply('No tienes SCP\'s capturados!');
            }
        } else {
            await interaction.editReply('¡No estás registrado! Usa /tarjeta para guardar tus datos.');
        }
    },
};
