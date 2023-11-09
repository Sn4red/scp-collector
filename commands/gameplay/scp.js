const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const firebase = require('../../utils/firebase');

const database = firebase.firestore();

module.exports = {
    cooldown: 300,
    data: new SlashCommandBuilder()
        .setName('scp')
        .setDescription('Lista tu colección de SCP\'s.'),
    async execute(interaction) {
        const idUsuario = interaction.user.id;

        // Avisa a la API de Discord que la interacción se recibió correctamente y da un tiempo máximo de 15 minutos.
        await interaction.deferReply({ ephemeral: true });

        const referenciaUsuario = database.collection('usuario').doc(idUsuario);
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
                cartasArray.forEach((x) => {
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

                // Se listan las cartas iterándose en una sola cadena para mostrarlo en el embed.
                let listaCartas = '';

                const embeds = [];
                const paginas = {};
                let limiteRegistrosXPagina = 0;

                ordenCartas.forEach((elemento, indice, array) => {
                    const carta = cartas.get(elemento).data();
                    const cantidad = cartasCount.get(elemento);
                    const clase = cartasClase.get(elemento);

                    listaCartas += `(${cantidad}) ${elemento} - ${carta.nombre} - **${clase}**\n`;

                    limiteRegistrosXPagina++;
                    
                    // Cuando se acumulan 10 registros de cartas, se almacenan en una sola página y se resetea la variable.
                    if (limiteRegistrosXPagina == 10) {
                        embeds.push(new EmbedBuilder().setTitle(`__**Colección de ${usuario.nick} **__`).setDescription(listaCartas));

                        listaCartas = '';
                        limiteRegistrosXPagina = 0;
                    }

                    // Acá se realiza la validación para la última página si es que no se llegan a acumular 10 registros.
                    if (indice == array.length - 1) {
                        embeds.push(new EmbedBuilder().setTitle(`__**Colección de ${usuario.nick} **__`).setDescription(listaCartas));
                    }
                });

                // Se crea un ActionRow que contenga 2 botones.
                const rowUsuario = (id) => {
                    const row = new ActionRowBuilder();

                    const botonAnterior = new ButtonBuilder()
                        .setCustomId('botonAnterior')
                        .setStyle('Secondary')
                        .setEmoji('⬅️')
                        .setDisabled(paginas[id] === 0);

                    const botonSiguiente = new ButtonBuilder()
                        .setCustomId('botonSiguiente')
                        .setStyle('Secondary')
                        .setEmoji('➡️')
                        .setDisabled(paginas[id] === embeds.length - 1);

                    row.addComponents(botonAnterior, botonSiguiente);

                    return row;
                };

                paginas[idUsuario] = paginas[idUsuario] || 0;

                const embed = embeds[paginas[idUsuario]];
                const filtroCollector = (x) => x.user.id === idUsuario;
                const tiempo = 1000 * 60 * 5;

                const respuesta = await interaction.editReply({
                    embeds: [embed],
                    components: [rowUsuario(idUsuario)],
                });

                const collector = respuesta.createMessageComponentCollector({ filter: filtroCollector, time: tiempo });

                collector.on('collect', (boton) => {
                    if (!boton) {
                        return;
                    }
        
                    boton.deferUpdate();
        
                    if (boton.customId !== 'botonAnterior' && boton.customId !== 'botonSiguiente') {
                        return;
                    }
        
                    if (boton.customId === 'botonAnterior' && paginas[idUsuario] > 0) {
                        --paginas[idUsuario];
                    } else if (boton.customId === 'botonSiguiente' && paginas[idUsuario] < embeds.length - 1) {
                        ++paginas[idUsuario];
                    }
        
                    interaction.editReply({
                        embeds: [embeds[paginas[idUsuario]]],
                        components: [rowUsuario(idUsuario)],
                    });
                });
            } else {
                await interaction.editReply('No tienes SCP\'s capturados!');
            }
        } else {
            await interaction.editReply('¡No estás registrado! Usa /tarjeta para guardar tus datos.');
        }  
    },
};
