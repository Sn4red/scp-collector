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

// * This function starts all the cron jobs.
function startCronJobs() {
    // * The cron task executes the reset function at midnight.
    cron.schedule('26 17 * * *', async () => {
        console.log('*** Resetting daily attempts limit ***');
        await resetDailyLimit();
    });

    // * The cron task executes the delete function at 23 hours.
    cron.schedule('27 17 * * *', async () => {
        console.log('*** Deleting old trade requests ***');
        await deleteOldTradeRequests();
    });
}

// * Exports the function to be used in the index file.
module.exports = { startCronJobs };