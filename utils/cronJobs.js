// TODO 12-13-2024: el cron job para actualizar el market ya está completado.
// TODO: Falta modificar la function getMarketCards para que no repita cartas en el market.
// TODO: Ya se sabe cuál será la modificación, pero todavía no se va a implementar porque,
// TODO: algunas clases (Thaumiel) sólo tienen una carta, entonces puede que el cambio lleve a errores.
// TODO: cuando el bot esté completado y se hayan añadido más cartas, implementar lo siguiente:

// async function getMarketCards(obtainedClasses) {
//     const cardReferences = [];

//     for (const obtainedClass of obtainedClasses) {
//         let uniqueCardFound = false;

//         while (!uniqueCardFound) {
//             // * Retrieves through Aggregation Query the numbers of documents contained in the collection.
//             const cardReference = database.collection('card').doc(obtainedClass).collection(obtainedClass.toLowerCase());
//             const cardSnapshot = await cardReference.get();

//             const classCount = cardSnapshot.size; // Usar la propiedad size para obtener el número de documentos

//             // * Using the Math object, a random number is obtained based on the number of cards,
//             // * and a random card is selected matching the random number with the 'random' field in the document.
//             // * We add 1 to the result in case it returns 0.
//             const randomNumber = Math.floor(Math.random() * classCount) + 1;
            
//             const selectedCardReference = database.collection('card').doc(obtainedClass).collection(obtainedClass.toLowerCase());
//             const selectedCardQuery = selectedCardReference.where('random', '==', randomNumber);
//             const selectedCardSnapshot = await selectedCardQuery.get();

//             const cardDocument = selectedCardSnapshot.docs[0];

//             // Verificar si el documento ya está en el array
//             if (!cardReferences.some(ref => ref.id === cardDocument.id)) {
//                 cardReferences.push(cardDocument.ref);
//                 uniqueCardFound = true; // Salir del bucle while
//             }
//         }
//     }

//     return cardReferences; // Devolver las referencias de los documentos
// }

const firebase = require('./firebase');
const moment = require('moment');
const cron = require('node-cron');

const database = firebase.firestore();

// * This function resets the daily limit of attempts.
// * Sets to 10 for Premium users, and 5 for non Premium.
async function resetDailyLimit() {
    let numberPremium = 0;
    let numberNonPremium = 0;

    const premiumUserReference = database.collection('user');
    const premiumUserQuery = premiumUserReference.where('premium', '==', true)
                                                    .where('dailyAttemptsRemaining', '<', 10);
    const premiumUserSnapshot = await premiumUserQuery.get();

    premiumUserSnapshot.forEach(async (user) => {
        if (user.exists) {
            numberPremium++;

            await user.ref.update({
                dailyAttemptsRemaining: 10, 
            });
        }
    });

    const normalUserReference = database.collection('user');
    const normalUserQuery = normalUserReference.where('premium', '==', false)
                                                .where('dailyAttemptsRemaining', '<', 5);
    const normalUserSnapshot = await normalUserQuery.get();

    normalUserSnapshot.forEach(async (user) => {
        if (user.exists) {
            numberNonPremium++;

            await user.ref.update({
                dailyAttemptsRemaining: 5, 
            });
        }
    });

    console.log(`${new Date()} >>> *** The daily attempts of ${numberPremium} Premium user(s) and ${numberNonPremium} non Premium user(s) have been restarted. ***`);
}

// * This function deletes trade requests documents that are 1 month old, whereas the trade has been completed or not.
async function deleteOldTradeRequests() {
    let numberTrades = 0;

    // * This rests the actual date to 1 month ago.
    const oneMonthAgo = moment().subtract(1, 'months').toDate();

    const tradeReference = database.collection('trade');
    // * Then is used to query the trade requests that are at least 1 month old.
    const tradeQuery = tradeReference.where('securityCooldown', '<=', oneMonthAgo);
    const tradeSnapshot = await tradeQuery.get();

    tradeSnapshot.forEach(async (trade) => {
        if (trade.exists) {
            numberTrades++;

            await trade.ref.delete();
        }
    });

    console.log(`${new Date()} >>> *** ${numberTrades} trade request(s) that were 1 month old have been deleted. ***`);
}

// * This function updates the market every week.
async function updateMarket() {
    // * Classes obtained through probability.
    const obtainedClasses = [];

    for (let i = 0; i < 5; i++) {
        obtainedClasses.push(classProbability());
    }

    // * According to the given classes, the cards are obtained.
    const cardReferences = await getMarketCards(obtainedClasses);

    // * Holographic values obtained through probability.
    const obtainedHolographics = holographicProbability();

    // * The market is updated with the obtained cards references and holographics values.
    await updateMarketCards(cardReferences, obtainedHolographics);

    console.log(`${new Date()} >>> *** Market was updated. ***`);
}

// * This function starts all the cron jobs.
function startCronJobs() {
    // * The cron task executes the reset function at midnight.
    cron.schedule('0 0 * * *', async () => {
        console.log('*** Resetting daily attempts limit ***');
        await resetDailyLimit();
    });

    // * The cron task executes the delete function at 23 hours.
    cron.schedule('0 23 * * *', async () => {
        console.log('*** Deleting old trade requests ***');
        await deleteOldTradeRequests();
    });

    // * The cron task executes the update function every Sunday at midnight.
    cron.schedule('8 23 * * *', async () => {
        console.log('*** Updating market ***');
        await updateMarket();
    });
}

/**
  * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
  * * The following functions are for the updateMarket function. *
  * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
  */

// * This function defines the probability per class (rarity) in an array,
// * and determines the class to choose based on cumulative probability.
// * It does this 5 times.
function classProbability() {
    const classes = [
        { name: 'Safe', probability: 43 },
        { name: 'Euclid', probability: 30 },
        { name: 'Keter', probability: 21 },
        { name: 'Thaumiel', probability: 4 },
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

// * This function retrieves 5 random cards and returns them as an array.
async function getMarketCards(obtainedClasses) {
    const cardReferences = [];

    for (const obtainedClass of obtainedClasses) {
        // * Retrieves through Aggregation Query the numbers of documents contained in the collection.
        const cardReference = database.collection('card').doc(obtainedClass).collection(obtainedClass.toLowerCase());
        const cardSnapshot = await cardReference.count().get();

        const classCount = cardSnapshot.data().count;

        // * Using the Math object, a random number is obtained based on the number of cards,
        // * and a random card is selected matching the random number with the 'random' field in the document.
        // * We add 1 to the result in case it returns 0.
        const randomNumber = Math.floor(Math.random() * classCount) + 1;
        
        const selectedCardReference = database.collection('card').doc(obtainedClass).collection(obtainedClass.toLowerCase());
        const selectedCardQuery = selectedCardReference.where('random', '==', randomNumber);
        const selectedCardSnapshot = await selectedCardQuery.get();

        const cardDocument = selectedCardSnapshot.docs[0];

        cardReferences.push(cardDocument.ref);
    }

    return cardReferences;
}

// * This function defines the probability of getting holographic cards.
// * It does this 5 times.
function holographicProbability() {
    const holographics = [];

    for (let i = 0; i < 5; i++) {
        const randomNumber = Math.random();

        /**
         * * This algorithm sets the probability of drawing holographic cards as follows:
         * * - Diamond 5%
         * * - Golden 10%
         * * - Emerald 20%
         */
        
        if (randomNumber < 0.05) {
            holographics.push('Diamond');
        } else if (randomNumber < 0.10) {
            holographics.push('Golden');
        } else if (randomNumber < 0.20) {
            holographics.push('Emerald');
        } else {
            holographics.push('Normal');
        }
    }

    return holographics;
}

// * This function updates the market with the new cards and holographics.
async function updateMarketCards(cardReferences, obtainedHolographics) {
    const marketReference = database.collection('market').doc('market');

    await marketReference.update({
        card1: cardReferences[0],
        card2: cardReferences[1],
        card3: cardReferences[2],
        card4: cardReferences[3],
        card5: cardReferences[4],
        holographic1: obtainedHolographics[0],
        holographic2: obtainedHolographics[1],
        holographic3: obtainedHolographics[2],
        holographic4: obtainedHolographics[3],
        holographic5: obtainedHolographics[4],
    });
}

/**
  * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
  * * The previous functions are for the updateMarket function. *
  * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
  */

// * Exports the function to be used in the index file.
module.exports = { startCronJobs };