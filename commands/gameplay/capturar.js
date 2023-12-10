const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const firebase = require('../../utils/firebase');
const path = require('node:path');
const cron = require('node-cron');

const database = firebase.firestore();

// The XP obtained based on the SCP class.
const xp = {
    'Seguro': 5,
    'Euclid': 15,
    'Keter': 30,
    'Taumiel': 100,
    'Apollyon': 200,
};

// The maximum XP per level (20 levels per rank) based on the user's rank.
const userXP = {
    'Clase D': 50,
    'Oficial de Seguridad': 100,
    'Investigador': 250,
    'Especialista de Contención': 500,
    'Agente de Campo': 1500,
    'Director de Sede': 5000,
    'Miembro del Consejo O5': 10000,
};

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('capturar')
        .setDescription('Atrapa un SCP y lo añades a tu colección.'),
    async execute(interaction) {
        // Notify the Discord API that the interaction was received successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply();

        // Database query is performed.
        const userReference = database.collection('usuario').doc(interaction.user.id);
        const userSnapshot = await userReference.get();

        if (userSnapshot.exists) {
            // Data is retrieved from here for daily limit validation.
            const user = userSnapshot.data();

            // Validates if the daily capture limit (5) has been reached.
            if (user.capturasDiarias >= 5) {
                await interaction.editReply('Has alcanzado el límite de capturas diarias de SCP\'s.');
            } else {
                // Class obtained through probability.
                const obtainedClass = classProbability();

                // The subcollection has the same name as the document containing it, but is entirely in lowercase.
                const subCollection = obtainedClass.charAt(0).toLowerCase() + obtainedClass.slice(1);
    
                // Retrieves all SCP cards of the class obtained through probability.
                const cardReference = database.collection('carta').doc(obtainedClass).collection(subCollection);
                const cardSnapshot = await cardReference.get();
    
                if (!cardSnapshot.empty) {
                    // Transforms the documents from the QuerySnapshot object into an array.
                    const cardsArray = cardSnapshot.docs.map((x) => ({ id: x.id, data: x.data() }));
    
                    // Using the Math object, a random index is obtained based on the number of cards in the array,
                    // and a random card is selected.
                    const randomIndex = Math.floor(Math.random() * cardsArray.length);
                    const randomCard = cardsArray[randomIndex];
    
                    // Card data.
                    const cardId = randomCard.id;
                    const classCard = obtainedClass;
                    const file = randomCard.data.archivo;
                    const name = randomCard.data.nombre;
    
                    const imagePath = path.join(__dirname, `../../images/scp/${cardId}.jpg`);
    
                    // To ensure all images have the same size,
                    // they are resized to 300x200 pixels.
                    const cardEmbed = new EmbedBuilder()
                        .setColor(0x000000)
                        .setTitle(`Ítem #: ${cardId} / ${name}`)
                        .setDescription(`+${xp[classCard]} XP`)
                        .addFields(
                            { name: 'Clase', value: classCard, inline: true },
                            { name: 'Archivo', value: file, inline: true },
                        )
                        .setImage(`attachment://${cardId}.jpg`)
                        .setTimestamp();
                    
                    // The entry of obtaining the card is inserted.
                    const obtentionEntry = database.collection('obtencion').doc();
    
                    await obtentionEntry.set({
                        carta: database.collection('carta').doc(obtainedClass).collection(subCollection).doc(cardId),
                        usuario: userReference,
                        lockeado: false,
                    });

                    // The rank and level promotion is performed here (if applicable), along with the increase of daily limits.
                    const earnedXP = xp[classCard];
                    const maxXP = userXP[user.rango];

                    // The variable determines what type of promotion will be performed (rank or level),
                    // so that a different type of message is displayed.
                    let promotionType = 'no';

                    // This section retrieves the next rank based on the user's current rank. If the current rank is
                    // 'Council O5 Member', there is no promotion.
                    const ranks = [
                        'Clase D',
                        'Oficial de Seguridad',
                        'Investigador',
                        'Especialista de Contención',
                        'Agente de Campo',
                        'Director de Sede',
                        'Miembro del Consejo O5',
                    ];

                    let indexCurrentElement = ranks.indexOf(user.rango);
                    indexCurrentElement++;

                    if (indexCurrentElement == 6) {
                        indexCurrentElement--;
                    }

                    if ((user.xp + earnedXP) >= maxXP) {
                        if (user.nivel < 20) {
                            promotionType = 'nivel';

                            await userReference.update({
                                nivel: ++user.nivel,
                                xp: (user.xp + earnedXP) - maxXP,
                                capturasDiarias: ++user.capturasDiarias,
                            });
                        } else {
                            promotionType = 'rango';

                            await userReference.update({
                                rango: ranks[indexCurrentElement],
                                nivel: 1,
                                xp: (user.xp + earnedXP) - maxXP,
                                capturasDiarias: ++user.capturasDiarias,
                            });
                        }
                    } else {
                        await userReference.update({
                            xp: firebase.firestore.FieldValue.increment(earnedXP),
                            capturasDiarias: ++user.capturasDiarias,
                        });
                    }
                    
                    if (user.capturasDiarias == 4) {
                        cardEmbed.setFooter({ text: `${5 - user.capturasDiarias} tiro restante` });
                    } else {
                        cardEmbed.setFooter({ text: `${5 - user.capturasDiarias} tiros restantes` });
                    }

                    await interaction.editReply({
                        embeds: [cardEmbed],
                        files: [imagePath],
                    });

                    switch (promotionType) {
                        case 'nivel':
                            await interaction.followUp('Felicidades ' + user.nick + '. Ahora eres nivel ' + user.nivel + '.');
                            break;
                        case 'rango':
                            await interaction.followUp('Felicidades ' + user.nick + '. Has ascendido a ' + ranks[indexCurrentElement] + '.');
                            break;
                    }
                } else {
                    await interaction.editReply('Error al intentar capturar un SCP. Inténtalo más tarde.');
                }
            }
        } else {
            await interaction.editReply('¡No estás registrado(a)! Usa /tarjeta para guardar tus datos.');
        }
    },
};

// This function defines the probability per class (rarity) in an array,
// and determines the class to choose based on cumulative probability.
function classProbability() {
    const classes = [
        { name: 'Seguro', probability: 40 },
        { name: 'Euclid', probability: 30 },
        { name: 'Keter', probability: 21 },
        { name: 'Taumiel', probability: 7 },
        { name: 'Apollyon', probability: 2 },
    ];

    const random = Math.random() * 100;
    let cumulative = 0;

    for (const classCard of classes) {
        cumulative += classCard.probability;

        if (random < cumulative) {
            return classCard.name;
        }
    }

    return classes[0].name;
}

// This function resets the daily limit for card captures.
async function resetDailyLimit() {
    const userReference = database.collection('usuario');
    const userSnapshot = await userReference.get();

    userSnapshot.forEach(async (user) => {
        if (user.exists) {
            await user.ref.update({
                capturasDiarias: 0,
            });
        }
    });
}

// The cron task executes the reset function at midnight.
cron.schedule('0 0 * * *', async () => {
    console.log('*** Restableciendo límite de tiros diarios ***');
    await resetDailyLimit();
});
