/*
    Implementaciones pendientes:

    - Usar la colección 'usuario' para que gane XP en función de las cartas obtenidas.
*/

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const firebase = require('../../utils/firebase');
const path = require('path');

const database = firebase.firestore();

module.exports = {
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName('capturar')
        .setDescription('Atrapa un SCP y lo añades a tu colección.'),
    async execute(interaction) {
        try {
            const idUsuario = interaction.user.id;
            const queryUsuario = database.collection('usuario').doc(idUsuario);
            const snapshotUsuario = await queryUsuario.get();

            if (snapshotUsuario.exists) {
                // Clase obtenida mediante probabilidad.
                const claseObtenida = probabilidadClase();
                // La subcolección tiene el mismo nombre que el documento que la contiene, pero es completamente en minúscula.
                const subColeccion = claseObtenida.charAt(0).toLowerCase() + claseObtenida.slice(1);
    
                // Obtiene todas las cartas de SCP de la clase obtenida por probabilidad.
                const cartas = database.collection('carta').doc(claseObtenida).collection(subColeccion);
                const snapshotCarta = await cartas.get();
    
                if (!snapshotCarta.empty) {
                    // Pasa los documentos del objeto QuerySnapshot en un array.
                    const cartasArray = snapshotCarta.docs.map(x => ({ id: x.id, data: x.data() }));
    
                    // Mediante el objeto Math, se obtiene un índice aleatorio en base a la cantidad de cartas que hay en el array,
                    // y se selecciona una carta aleatoria.
                    const indiceAleatorio = Math.floor(Math.random() * cartasArray.length);
                    const cartaAleatoria = cartasArray[indiceAleatorio];
    
                    // Datos de la carta.
                    const idCarta = cartaAleatoria.id;
                    const clase = claseObtenida;
                    const archivo = cartaAleatoria.data.archivo;
                    const nombre = cartaAleatoria.data.nombre;
    
                    const imagePath = path.join(__dirname, `../../images/scp/${idCarta}.jpg`);
    
                    // El XP que se obtiene según la clase del SCP.
                    const xp = {
                        'Seguro': 5,
                        'Euclid': 15,
                        'Keter': 30,
                        'Taumiel': 100,
                        'Apollyon': 200,
                    };
    
                    // Para que todas las imágenes tengan el mismo tamaño,
                    // se redimensionan a 300x200 píxeles.
                    const cartaEmbed = new EmbedBuilder()
                    .setColor(0x000000)
                    .setTitle(`Ítem #: ${idCarta} / ${nombre}`)
                    .setDescription(`+${xp[clase]} XP`)
                    .addFields(
                        { name: 'Clase', value: clase, inline: true },
                        { name: 'Archivo', value: archivo, inline: true },
                    )
                    .setImage(`attachment://${idCarta}.jpg`)
                    .setTimestamp()
                    .setFooter({ text: 'X tiros restantes.' });
    
                    const registroObtencion = database.collection('obtencion').doc();
    
                    await registroObtencion.set({
                        carta: database.collection('carta').doc(claseObtenida).collection(subColeccion).doc(idCarta),
                        usuario: queryUsuario,
                    });

                    const xpGanado = xp[clase];

                    await queryUsuario.update({
                        xp: firebase.firestore.FieldValue.increment(xpGanado),
                    });
    
                    await interaction.reply({
                        embeds: [cartaEmbed],
                        files: [imagePath],
                    });
                } else {
                    await interaction.reply('Error al intentar capturar un SCP. Inténtalo más tarde.');
                }
            } else {
                await interaction.reply('¡No estás registrado! Usa /tarjeta para guardar tus datos.');
            }
        } catch (error) {
            console.error('Error durante la ejecución del comando "capturar": ', error);
            await interaction.reply('Ocurrió un error al ejecutar el comando. Por favor, inténtalo más tarde.');
        }
    },
};

function probabilidadClase() {
    const clases = [
        { nombre: 'Seguro', probabilidad: 40 },
        { nombre: 'Euclid', probabilidad: 30 },
        { nombre: 'Keter', probabilidad: 21 },
        { nombre: 'Taumiel', probabilidad: 7 },
        { nombre: 'Apollyon', probabilidad: 2 },
    ];

    const random = Math.random() * 100;
    let acumulado = 0;

    for (const x of clases) {
        acumulado += x.probabilidad;

        if (random < acumulado) {
            return x.nombre;
        }
    }

    return clases[0].nombre;
}
