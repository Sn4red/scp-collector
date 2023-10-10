/*
    Pendiente:

    - Crear un contador para capturar un límite de SCP's cada cierto tiempo.
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
        // El XP que se obtiene según la clase del SCP.
        const xp = {
            'Seguro': 5,
            'Euclid': 15,
            'Keter': 30,
            'Taumiel': 100,
            'Apollyon': 200,
        };

        // El XP máximo por nivel (20 niveles por rango) según el rango del jugador.
        const xpJugador = {
            'Clase D': 50,
            'Oficial de Seguridad': 100,
            'Investigador': 250,
            'Especialista de Contención': 500,
            'Agente de Campo': 1500,
            'Director de Sede': 5000,
            'Miembro del Consejo O5': 10000,
        };


        // Avisa a la API de Discord que la interacción se recibió correctamente y da un tiempo máximo de 15 minutos.
        await interaction.deferReply();

        // Se realiza la consulta a la base de datos.
        const queryUsuario = database.collection('usuario').doc(interaction.user.id);
        const snapshotUsuario = await queryUsuario.get();

        if (snapshotUsuario.exists) {
            // Clase obtenida mediante probabilidad.
            const claseObtenida = probabilidadClase();

            console.log(claseObtenida);
            console.log(claseObtenida);
            console.log(claseObtenida);
            console.log(claseObtenida);
            console.log(claseObtenida);
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
                    
                // Se inserta el registro de la obtención de la carta.
                const registroObtencion = database.collection('obtencion').doc();
    
                await registroObtencion.set({
                    carta: database.collection('carta').doc(claseObtenida).collection(subColeccion).doc(idCarta),
                    usuario: queryUsuario,
                });

                // Acá se realiza la promoción de rango y nivel (si fuera el caso).
                const xpGanado = xp[clase];
                const usuario = snapshotUsuario.data();
                const xpMaximo = xpJugador[usuario.rango];

                // La variable determina qué tipo de promoción va a hacerse (rango o nivel),
                // para que salga diferente tipo de mensaje.
                let tipoPromocion = 'no';

                // Esta sección obtiene el siguiente rango en base al rango actual del usuario. Si el rango actual es
                // 'Miembro del Consejo O5', no hay promoción.
                const rangos = [
                    'Clase D',
                    'Oficial de Seguridad',
                    'Investigador',
                    'Especialista de Contención',
                    'Agente de Campo',
                    'Director de Sede',
                    'Miembro del Consejo O5',
                ];

                let indiceElementoActual = rangos.indexOf(usuario.rango);
                indiceElementoActual++;

                if (indiceElementoActual == 6) {
                    indiceElementoActual--;
                }

                if ((usuario.xp + xpGanado) >= xpMaximo) {
                    if (usuario.nivel < 20) {
                        tipoPromocion = 'nivel';

                        await queryUsuario.update({
                            nivel: ++usuario.nivel,
                            xp: (usuario.xp + xpGanado) - xpMaximo,
                        });
                    } else {
                        tipoPromocion = 'rango';

                        await queryUsuario.update({
                            rango: rangos[indiceElementoActual],
                            nivel: 1,
                            xp: (usuario.xp + xpGanado) - xpMaximo,
                        });
                    }
                } else {
                    await queryUsuario.update({
                        xp: firebase.firestore.FieldValue.increment(xpGanado),
                    });
                }                    

                await interaction.editReply({
                    embeds: [cartaEmbed],
                    files: [imagePath],
                });

                switch (tipoPromocion) {
                    case 'nivel':
                        await interaction.followUp('Felicidades ' + usuario.nick + '. Ahora eres nivel ' + usuario.nivel + '.');
                        break;
                    case 'rango':
                        await interaction.followUp('Felicidades ' + usuario.nick + '. Has ascendido a ' + rangos[indiceElementoActual] + '.');
                        break;
                }
            } else {
                await interaction.editReply('Error al intentar capturar un SCP. Inténtalo más tarde.');
            }
        } else {
            await interaction.editReply('¡No estás registrado! Usa /tarjeta para guardar tus datos.');
        }
    },
};

// La función te define la probabilidad por clase (rareza) en un array,
// y determina la clase a elegir según la probabilidad acumulativa.
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
