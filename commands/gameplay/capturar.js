/*
    Implementaciones pendientes:

    1. Desarrollar el algoritmo para que capture SCP's aleatoriamente, tomando
    en cuenta la rareza por cada clase (por definir).
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
        // Se realiza la consulta a la base de datos.
        const query = database.collection('carta').doc('SCP-002');
        const snapshot = await query.get();

        if (!snapshot.empty) {
            const carta = snapshot.data();

            // Datos de la carta.
            const id = query.id;
            const clase = carta.clase;
            const archivo = carta.archivo;
            const nombre = carta.nombre;

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
