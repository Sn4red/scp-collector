// TODO: 12-14-2024: validar el domingo 12-29-2024 si el cron job para actualizar el market funciona correctamente,
// TODO: estableciendo la fecha para el próximo domingo a la medianoche.

// TODO: En la misma ejecución, se validará si el cron job para reiniciar los campos relacionados con el market de los usuarios
// TODO: funciona correctamente.

// TODO 12-26-2024: validar los días 28 al 31 de diciembre cómo se ejecuta el cron job para dar 1000 cristales a los usuarios Premium.
// TODO: Su ejecución debería funcionar solamente el día 31 de este mes.

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
const { Filter } = require('firebase-admin/firestore');
const moment = require('moment');
const cron = require('node-cron');

const database = firebase.firestore();

// * This function resets the daily limit of attempts.
// * Sets to 10 for Premium users, and 5 for non Premium.
async function resetDailyLimit() {
    let numberPremium = 0;
    let numberNonPremium = 0;
    let numberPremiumErrors = 0;
    let numberNonPremiumErrors = 0;

    const premiumUserReference = database.collection('user');
    const premiumUserQuery = premiumUserReference.where('premium', '==', true)
                                                    .where('dailyAttemptsRemaining', '<', 10);

    const normalUserReference = database.collection('user');
    const normalUserQuery = normalUserReference.where('premium', '==', false)
                                                .where('dailyAttemptsRemaining', '<', 5);

    try {
        const [premiumUserSnapshot, normalUserSnapshot] = await Promise.all([
            premiumUserQuery.get(),
            normalUserQuery.get(),
        ]);

        for (const user of premiumUserSnapshot.docs) {
            try {
                await database.runTransaction(async (transaction) => {
                    await transaction.update(user.ref, {
                        dailyAttemptsRemaining: 10, 
                    });
                });
            } catch (error) {
                numberPremium--;
                numberPremiumErrors++;

                console.log(`${new Date()} >>> *** ERROR: Cron Job - resetDailyLimit *** by ${user.id} (${user.data().nickname})`);
                console.error(error);
            }
        }

        for (const user of normalUserSnapshot.docs) {
            try {
                await database.runTransaction(async (transaction) => {
                    await transaction.update(user.ref, {
                        dailyAttemptsRemaining: 5, 
                    });
                });
            } catch (error) {
                numberNonPremium--;
                numberNonPremiumErrors++;

                console.log(`${new Date()} >>> *** ERROR: Cron Job - resetDailyLimit *** by ${user.id} (${user.data().nickname})`);
                console.error(error);
            }
        }

        numberPremium += premiumUserSnapshot.size;
        numberNonPremium += normalUserSnapshot.size;

        console.log(`${new Date()} >>> *** The daily attempts of ${numberPremium} Premium user(s) and ${numberNonPremium} non Premium user(s) have been restarted. ***`);
        console.log(`*** Errors with Premium users: ${numberPremiumErrors} | Errors with Non Premium users: ${numberNonPremiumErrors} ***`);
    } catch (error) {
        console.log(`${new Date()} >>> *** ERROR: Cron Job - resetDailyLimit ***`);
        console.error(error);
    }
}

// * This function deletes trade requests documents that are 1 month old, whereas the trade has been completed or not.
async function deleteOldTradeRequests() {
    let numberTrades = 0;
    let numberTradesErrors = 0;

    // * This rests the actual date to 1 month ago.
    const oneMonthAgo = moment().subtract(1, 'months').toDate();

    const tradeReference = database.collection('trade');
    // * Then is used to query the trade requests that are at least 1 month old.
    const tradeQuery = tradeReference.where('securityCooldown', '<=', oneMonthAgo);

    try {
        const tradeSnapshot = await tradeQuery.get();

        for (const trade of tradeSnapshot.docs) {
            try {
                await database.runTransaction(async (transaction) => {
                    await transaction.delete(trade.ref);
                });
            } catch (error) {
                numberTrades--;
                numberTradesErrors++;

                console.log(`${new Date()} >>> *** ERROR: Cron Job - resetDailyLimit *** by ${trade.id}`);
                console.error(error);
            }
        }

        numberTrades += tradeSnapshot.size;

        console.log(`${new Date()} >>> *** ${numberTrades} trade request(s) that were 1 month old have been deleted. ***`);
        console.log(`*** Errors with trades: ${numberTradesErrors} ***`);
    } catch (error) {
        console.log(`${new Date()} >>> *** ERROR: Cron Job - deleteOldTradeRequests ***`);
        console.error(error);
    }
}

// * This function updates the market every week.
async function updateMarket() {
    // * Classes obtained through probability.
    const obtainedClasses = [];

    for (let i = 0; i < 5; i++) {
        obtainedClasses.push(classProbability());
    }
    
    try {
        await database.runTransaction(async (transaction) => {
            // * According to the given classes, the cards are obtained.
            const cardResults = await getMarketCards(obtainedClasses, transaction);

            // * Holographic values obtained through probability.
            const obtainedHolographics = holographicProbability();

            // * The market is updated with the obtained cards references, holographics values and card IDs.
            await updateMarketCards(cardResults.cardReferences, obtainedHolographics, cardResults.cardIds, transaction);
        });

        console.log(`${new Date()} >>> *** Market was updated. ***`);
    } catch (error) {
        console.log(`${new Date()} >>> *** ERROR: Cron Job - updateMarket ***`);
        console.error(error);
    }
}

// * This function resets the market-related fields of the users every week.
async function resetUserMarketFields() {
    let numberUsers = 0;
    let numberUsersErrors = 0;

    const userReference = database.collection('user');
    const userQuery = userReference.where(
        Filter.or(
            Filter.where('card1Purchased', '==', true),
            Filter.where('card2Purchased', '==', true),
            Filter.where('card3Purchased', '==', true),
            Filter.where('card4Purchased', '==', true),
            Filter.where('card5Purchased', '==', true),
        ),
    );

    try {
        const userSnapshot = await userQuery.get();

        for (const user of userSnapshot.docs) {
            try {
                await database.runTransaction(async (transaction) => {
                    await transaction.update(user.ref, {
                        card1Purchased: false,
                        card2Purchased: false,
                        card3Purchased: false,
                        card4Purchased: false,
                        card5Purchased: false,
                    });
                });
            } catch (error) {
                numberUsers--;
                numberUsersErrors++;

                console.log(`${new Date()} >>> *** ERROR: Cron Job - resetUserMarketFields *** by ${user.id} (${user.data().nickname})`);
                console.error(error);
            }
        }

        numberUsers += userSnapshot.size;

        console.log(`${new Date()} >>> *** ${numberUsers} User(s) with market-related fields have been resetted. ***`);
        console.log(`*** Errors with users: ${numberUsersErrors} ***`);
    } catch (error) {
        console.log(`${new Date()} >>> *** ERROR: Cron Job - resetUserMarketFields ***`);
        console.error(error);
    }
}

// * This function gives 1000 crystals to Premium users at the end of the month.
async function giveCrystalsEndOfMonth() {
    let numberUsers = 0;
    let numberUsersErrors = 0;

    const userReference = database.collection('user');
    const userQuery = userReference.where('premium', '==', true);

    try {
        const userSnapshot = await userQuery.get();

        for (const user of userSnapshot.docs) {
            try {
                await database.runTransaction(async (transaction) => {
                    await transaction.update(user.ref, {
                        crystals: firebase.firestore.FieldValue.increment(1000),
                    });
                });
            } catch (error) {
                numberUsers--;
                numberUsersErrors++;

                console.log(`${new Date()} >>> *** ERROR: Cron Job - giveCrystalsEndOfMonth *** by ${user.id} (${user.data().nickname})`);
                console.error(error);
            }
        }

        numberUsers += userSnapshot.size;

        console.log(`${new Date()} >>> *** 1000 crystals were given to ${numberUsers} Premium user(s). ***`);
        console.log(`*** Errors with Premium users: ${numberUsersErrors} ***`);
    } catch (error) {
        console.log(`${new Date()} >>> *** ERROR: Cron Job - giveCrystalsEndOfMonth ***`);
        console.error(error);
    }
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

    // * The cron task executes the update market function and the
    // * reset user market-related fields function every Sunday at midnight (12:05).
    cron.schedule('5 0 * * 0', async () => {
        console.log('*** Updating market ***');
        await updateMarket();

        console.log('*** Resetting user market-related fields ***');
        await resetUserMarketFields();
    });

    // * The cron task executes the give crystals function at the end of the month
    // * at midnight (12:20).
    cron.schedule('20 0 28-31 * *', async () => {
        const now = moment();
        const endOfMonth = now.clone().endOf('month');

        // * If the current date is the last day of the month, the function is executed.
        if (now.isSame(endOfMonth, 'day')) {
            console.log('*** Giving 1000 crystals to Premium users ***');
            await giveCrystalsEndOfMonth();
        }
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
async function getMarketCards(obtainedClasses, transaction) {
    const cardReferences = [];
    const cardIds = [];

    for (const obtainedClass of obtainedClasses) {
        // * Retrieves through Aggregation Query the numbers of documents contained in the collection.
        const cardReference = database.collection('card').doc(obtainedClass).collection(obtainedClass.toLowerCase());
        const cardSnapshot = await transaction.get(cardReference.count());

        const classCount = cardSnapshot.data().count;

        // * Using the Math object, a random number is obtained based on the number of cards,
        // * and a random card is selected matching the random number with the 'random' field in the document.
        // * We add 1 to the result in case it returns 0.
        const randomNumber = Math.floor(Math.random() * classCount) + 1;
        
        const selectedCardReference = database.collection('card').doc(obtainedClass).collection(obtainedClass.toLowerCase());
        const selectedCardQuery = selectedCardReference.where('random', '==', randomNumber);
        const selectedCardSnapshot = await transaction.get(selectedCardQuery);

        const cardDocument = selectedCardSnapshot.docs[0];

        cardReferences.push(cardDocument.ref);
        cardIds.push(cardDocument.id);
    }

    return { cardReferences, cardIds };
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
async function updateMarketCards(cardReferences, obtainedHolographics, cardIds, transaction) {
    const marketReference = database.collection('market').doc('market');

    // * This calculates the date of the following Sunday at midnight (12:05).
    const nextSundayMidnight = moment().day(7).startOf('day').add(1, 'days').utcOffset('-05:00').set({ minute: 5 }).toDate();

    // * The cards ID are also inserted for a faster process when a user buys a card.
    await transaction.update(marketReference, {
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
        deadline: nextSundayMidnight,
        card1Id: cardIds[0],
        card2Id: cardIds[1],
        card3Id: cardIds[2],
        card4Id: cardIds[3],
        card5Id: cardIds[4],
    });
}

/**
  * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
  * * The previous functions are for the updateMarket function. *
  * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
  */

// * Exports the function to be used in the index file.
module.exports = { startCronJobs };