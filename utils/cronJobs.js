const {
    marketClassProbabilities,
    marketHolographicProbabilities,
} = require('./foundationConfig');

const firebase = require('./firebase');
const { Filter } = require('firebase-admin/firestore');
const moment = require('moment');
const cron = require('node-cron');
const premiumWhitelist = require('./premiumWhitelist');

const database = firebase.firestore();

const guildId = process.env.DISCORD_SERVER_ID;
const VIPRoleId = process.env.DISCORD_VIP_ROLE_ID;

// * This function resets the daily limit of attempts.
// * Sets to 10 for Premium users, and 5 for non Premium.
async function resetDailyLimit(client) {
    let numberPremium = 0;
    let numberNonPremium = 0;
    let numberPremiumErrors = 0;
    let numberNonPremiumErrors = 0;

    const userReference = database.collection('user');
    
    try {
        const userSnapshot = await userReference.get();

        const guild = client.guilds.cache.get(guildId);

        for (const user of userSnapshot.docs) {
            let dailyAttemptsRemaining = 0;

            try {
                const member = await guild.members.fetch(user.id);
                const hasRole = member.roles.cache.has(VIPRoleId);

                dailyAttemptsRemaining = hasRole ? 10 : 5;
            } catch {
                dailyAttemptsRemaining = 5;
            }

            // * If the user it's in the premium whitelist, it will be
            // * considered as premium.
            if (premiumWhitelist.includes(user.id)) {
                dailyAttemptsRemaining = 10;
            }

            try {
                if (dailyAttemptsRemaining === 10) {
                    if (user.data().dailyAttemptsRemaining < 10) {
                        numberPremium++;
                        
                        await database.runTransaction(async (transaction) => {
                            await transaction.update(user.ref, {
                                dailyAttemptsRemaining: dailyAttemptsRemaining,
                            });
                        });
                    }
                } else {
                    if (user.data().dailyAttemptsRemaining < 5) {
                        numberNonPremium++;
                        
                        await database.runTransaction(async (transaction) => {
                            await transaction.update(user.ref, {
                                dailyAttemptsRemaining: dailyAttemptsRemaining,
                            });
                        });
                    }
                }
            } catch (error) {
                if (dailyAttemptsRemaining === 10) {
                    numberPremium--;
                    numberPremiumErrors++;
                } else {
                    numberNonPremium--;
                    numberNonPremiumErrors++;
                }

                console.log(
                    `${new Date()} >>> *** ERROR: Cron Job - resetDailyLimit ` +
                        `*** by ${user.id} (${user.data().nickname})`,
                );
                console.error(error);
            }
        }

        console.log(
            `${new Date()} >>> *** The daily attempts of ${numberPremium} ` +
                `Premium user(s) and ${numberNonPremium} Non Premium user(s) ` +
                'have been restarted. ***',
        );
        console.log(
            `*** Errors with Premium users: ${numberPremiumErrors} | Errors ` +
                `with Non Premium users: ${numberNonPremiumErrors} ***`,
        );
    } catch (error) {
        console.log(
            `${new Date()} >>> *** ERROR: Cron Job - resetDailyLimit ***`,
        );
        console.error(error);
    }
}

// * This function deletes trade requests documents that are 1 month old,
// * whereas the trade has been completed or not.
async function deleteOldTradeRequests() {
    let numberTrades = 0;
    let numberTradesErrors = 0;

    // * This rests the actual date to 1 month ago.
    const oneMonthAgo = moment().subtract(1, 'months').toDate();

    const tradeReference = database.collection('trade');
    // * Then is used to query the trade requests that are at least 1 month old.
    const tradeQuery = tradeReference
        .where('securityCooldown', '<=', oneMonthAgo);

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

                console.log(
                    `${new Date()} >>> *** ERROR: Cron Job - ` +
                        `deleteOldTradeRequests *** by ${trade.id}`,
                );
                console.error(error);
            }
        }

        numberTrades += tradeSnapshot.size;

        console.log(
            `${new Date()} >>> *** ${numberTrades} trade request(s) that ` +
                'were 1 month old have been deleted. ***',
        );
        console.log(`*** Errors with trades: ${numberTradesErrors} ***`);
    } catch (error) {
        console.log(
            `${new Date()} >>> *** ERROR: Cron Job - deleteOldTradeRequests ` +
                '***',
        );
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
            const cardResults = await getMarketCards(
                obtainedClasses,
                transaction,
            );

            // * Holographic values obtained through probability.
            const obtainedHolographics = holographicProbability();

            // * The market is updated with the obtained cards references,
            // * holographics values and card IDs.
            await updateMarketCards(
                cardResults.cardReferences,
                obtainedHolographics,
                cardResults.cardIds,
                transaction,
            );
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

                console.log(
                    `${new Date()} >>> *** ERROR: Cron Job - ` +
                        `resetUserMarketFields *** by ${user.id} ` +
                        `(${user.data().nickname})`,
                );
                console.error(error);
            }
        }

        numberUsers += userSnapshot.size;

        console.log(
            `${new Date()} >>> *** ${numberUsers} User(s) with ` +
                'market-related fields have been resetted. ***',
        );
        console.log(`*** Errors with users: ${numberUsersErrors} ***`);
    } catch (error) {
        console.log(
            `${new Date()} >>> *** ERROR: Cron Job - resetUserMarketFields ***`,
        );
        console.error(error);
    }
}

// * This function gives 1000 crystals to Premium users at the beginning of the
// * month.
async function giveCrystalsBeginningOfMonth(client) {
    let numberUsers = 0;
    let numberUsersErrors = 0;

    const userReference = database.collection('user');

    try {
        const userSnapshot = await userReference.get();

       const guild = client.guilds.cache.get(guildId);

        for (const user of userSnapshot.docs) {
            let hasPremium = false;

            try {
                const member = await guild.members.fetch(user.id);
                const hasRole = member.roles.cache.has(VIPRoleId);

                hasPremium = hasRole ? true : false;
            } catch {
                hasPremium = false;
            }

            // * If the user it's in the premium whitelist, it will be
            // * considered as premium.
            if (premiumWhitelist.includes(user.id)) {
                hasPremium = true;
            }

            try {
                if (hasPremium) {
                    numberUsers++;

                    await database.runTransaction(async (transaction) => {

                        await transaction.update(user.ref, {
                            crystals: firebase
                                .firestore.FieldValue.increment(1000),
                        });
                    });
                }
            } catch (error) {
                numberUsers--;
                numberUsersErrors++;

                console.log(
                    `${new Date()} >>> *** ERROR: Cron Job - ` +
                        `giveCrystalsBeginningOfMonth *** by ${user.id} ` +
                        `(${user.data().nickname})`,
                );
                console.error(error);
            }
        }

        console.log(
            `${new Date()} >>> *** 1000 crystals were given to ` +
                `${numberUsers} Premium user(s). ***`,
        );
        console.log(`*** Errors with Premium users: ${numberUsersErrors} ***`);
    } catch (error) {
        console.log(
            `${new Date()} >>> *** ERROR: Cron Job - ` +
                'giveCrystalsBeginningOfMonth ***',
        );
        console.error(error);
    }
}

// * This function starts all the cron jobs.
function startCronJobs(client) {
    // * The cron task executes the reset function at midnight.
    cron.schedule('0 0 * * *', async () => {
        console.log('*** Resetting daily attempts limit ***');
        await resetDailyLimit(client);
    });

    // * The cron task executes the delete function at 23 hours.
    cron.schedule('0 23 * * *', async () => {
        console.log('*** Deleting old trade requests ***');
        await deleteOldTradeRequests();
    });

    // * The cron task executes the update market function and the
    // * reset user market-related fields function every Monday at midnight
    // * (12:05).
    cron.schedule('5 0 * * 1', async () => {
        console.log('*** Updating market ***');
        await updateMarket();

        console.log('*** Resetting user market-related fields ***');
        await resetUserMarketFields();
    });

    // * The cron task executes the give crystals function at the beginning of
    // * the month at midnight (12:20).
    cron.schedule('20 0 1 * *', async () => {
        console.log('*** Giving 1000 crystals to Premium users ***');
        await giveCrystalsBeginningOfMonth(client);
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
    const random = Math.random() * 100;
    let cumulative = 0;

    for (const classCard of marketClassProbabilities) {
        cumulative += classCard.probability;

        if (random < cumulative) {
            return classCard.name;
        }
    }

    return marketClassProbabilities[0].name;
}

// * This function retrieves 5 random cards and returns them as an array.
async function getMarketCards(obtainedClasses, transaction) {
    const cardReferences = [];
    const cardIds = [];

    for (const obtainedClass of obtainedClasses) {
        let uniqueCardFound = false;

        while (!uniqueCardFound) {
            // * Retrieves through Aggregation Query the numbers of documents
            // * contained in the collection.
            const cardReference = database
                .collection('card')
                .doc(obtainedClass)
                .collection(obtainedClass.toLowerCase());
            const cardSnapshot = await transaction.get(cardReference.count());

            const classCount = cardSnapshot.data().count;

            // * Using the Math object, a random number is obtained based on
            // * the number of cards, and a random card is selected matching
            // * the random number with the 'random' field in the document. 1 is
            // * added to the result in case it returns 0.
            const randomNumber = Math.floor(Math.random() * classCount) + 1;
            
            const selectedCardReference = database
                .collection('card')
                .doc(obtainedClass)
                .collection(obtainedClass.toLowerCase());
            const selectedCardQuery = selectedCardReference
                .where('random', '==', randomNumber);
            const selectedCardSnapshot = await transaction
                .get(selectedCardQuery);

            const cardDocument = selectedCardSnapshot.docs[0];

            //  * This verifies if the document is already in the array
            // * (repeated).
            if (!cardReferences.some(ref => ref.id === cardDocument.id)) {
                cardReferences.push(cardDocument.ref);
                cardIds.push(cardDocument.id);

                // * This ends the while loop and goes to the next class.
                uniqueCardFound = true;
            }
        }
    }

    return {
        cardReferences,
        cardIds,
    };
}

// * This function defines the probability of getting holographic cards.
// * It does this 5 times.
function holographicProbability() {
    const holographics = [];

    for (let i = 0; i < 5; i++) {
        const randomNumber = Math.random();

        /**
         * * This algorithm sets the probability of drawing holographic cards
         * * as follows:
         * * - Diamond 5%
         * * - Golden 10%
         * * - Emerald 20%
         */
        
        if (randomNumber < marketHolographicProbabilities['Diamond']) {
            holographics.push('Diamond');
        } else if (randomNumber < marketHolographicProbabilities['Golden']) {
            holographics.push('Golden');
        } else if (randomNumber < marketHolographicProbabilities['Emerald']) {
            holographics.push('Emerald');
        } else {
            holographics.push('Normal');
        }
    }

    return holographics;
}

// * This function updates the market with the new cards and holographics.
async function updateMarketCards(
    cardReferences,
    obtainedHolographics,
    cardIds,
    transaction,
) {
    const marketReference = database.collection('market').doc('market');

    // * This calculates the date of the following Sunday at midnight (12:05).
    const nextSundayMidnight = moment()
        .day(7)
        .startOf('day')
        .add(1, 'days')
        .utcOffset('-05:00')
        .set({ minute: 5 })
        .toDate();

    // * The cards ID are also inserted for a faster process when a user buys a
    // * card.
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
