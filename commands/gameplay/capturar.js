/*
    Implementaciones pendientes:

    - Usar la colección 'usuario' para que gane XP en función de las cartas obtenidas.
*/

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const firebase = require('../../utils/firebase');
const path = require('path');

const database = firebase.firestore();

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('capturar')
        .setDescription('Atrapa un SCP y lo añades a tu colección.'),
    async execute(interaction) {
        // Clase obtenida mediante probabilidad.
        const claseObtenida = probabilidadClase();
        // La subcolección tiene el mismo nombre que el documento que la contiene, pero es completamente en minúscula.
        const subColeccion = claseObtenida.charAt(0).toLowerCase() + claseObtenida.slice(1);

        // Obtiene todas las cartas de SCP de la clase obtenida por probabilidad.
        const cartas = database.collection('carta').doc(claseObtenida).collection(subColeccion);
        const snapshot = await cartas.get();

        if (!snapshot.empty) {
            // Pasa los documentos del objeto QuerySnapshot en un array.
            const cartasArray = snapshot.docs.map(x => ({ id: x.id, data: x.data() }));

            // Mediante el objeto Math, se obtiene un índice aleatorio en base a la cantidad de cartas que hay en el array,
            // y se selecciona una carta aleatoria.
            const indiceAleatorio = Math.floor(Math.random() * cartasArray.length);
            const cartaAleatoria = cartasArray[indiceAleatorio];

            // Datos de la carta.
            const id = cartaAleatoria.id;
            const clase = claseObtenida;
            const archivo = cartaAleatoria.data.archivo;
            const nombre = cartaAleatoria.data.nombre;

            const imagePath = path.join(__dirname, `../../images/scp/${id}.jpg`);

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
                .setTitle(`Ítem #: ${id} / ${nombre}`)
                .setDescription(`+${xp[clase]} XP`)
                .addFields(
                    { name: 'Clase', value: clase, inline: true },
                    { name: 'Archivo', value: archivo, inline: true },
                )
                .setImage(`attachment://${id}.jpg`)
                .setTimestamp()
                .setFooter({ text: 'X tiros restantes.' });

            await interaction.reply({
                embeds: [cartaEmbed],
                files: [imagePath],
            });
        } else {
            await interaction.reply('Error al intentar capturar un SCP. Inténtalo más tarde.');
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
