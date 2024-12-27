const { Events } = require('discord.js');
const firebase = require('../utils/firebase');

const database = firebase.firestore();

module.exports = {
    name: Events.GuildMemberUpdate,
    async execute(oldMember, newMember) {
        // * This variable has the ID of the official server.
        const guildId = '1162912802701316146';

        // * This variable has the ID of the VIP User role (temporarily has the Testing role).
        const vipRoleId = '1321955120824451193';

        // * The conditional checks if the event was triggered in the official server.
        if (newMember.guild.id !== guildId) {
            return;
        }

        const oldRoles = oldMember.roles.cache;
        const newRoles = newMember.roles.cache;

        const hadVipRoleBefore = oldRoles.has(vipRoleId);
        const hasVipRoleNow = newRoles.has(vipRoleId);

        // * If the bot is restarted, and it triggers when a user's role is removed, it won't execute the third if
        // * as expected. This is because the bot doesn't have the previous data to compare with the new data,
        // * returning 'oldRoles' as false.
        // * This if will behave like the third one.
        if (!hadVipRoleBefore && !hasVipRoleNow) {
            try {
                managePremiumStatus(false, newMember);
                
                console.log(`${new Date()} >>> *** ${newMember.user.id} (${newMember.user.username}) downgraded. The user has no more VIP! ***`);
            } catch (error) {
                console.log(`${new Date()} >>> *** ERROR: buy.js *** by ${newMember.user.id} (${newMember.user.username})`);
                console.error(error);
            }
        }

        if (!hadVipRoleBefore && hasVipRoleNow) {
            try {
                managePremiumStatus(true, newMember);

                console.log(`${new Date()} >>> *** ${newMember.user.id} (${newMember.user.username}) upgraded. The user has VIP! ***`);
            } catch (error) {
                console.log(`${new Date()} >>> *** ERROR: buy.js *** by ${newMember.user.id} (${newMember.user.username})`);
                console.error(error);
            }
        }

        if (hadVipRoleBefore && !hasVipRoleNow) {
            try {
                managePremiumStatus(false, newMember);

                console.log(`${new Date()} >>> *** ${newMember.user.id} (${newMember.user.username}) downgraded. The user has no more VIP! ***`);
            } catch (error) {
                console.log(`${new Date()} >>> *** ERROR: buy.js *** by ${newMember.user.id} (${newMember.user.username})`);
                console.error(error);
            }
        }
    },
};

async function managePremiumStatus(benefitsAreGiven, member) {
    const userId = member.user.id;
    const userNickname = member.user.username;

    // * Formats the date in YYYY/MM/DD.
    const currentDate = new Date();

    const year = currentDate.getFullYear();
    const month = ('0' + (currentDate.getMonth() + 1)).slice(-2);
    const day = ('0' + currentDate.getDate()).slice(-2);

    await database.runTransaction(async (transaction) => {
        const userReference = database.collection('user').doc(userId);
        const userSnapshot = await transaction.get(userReference);

        if (benefitsAreGiven) {
            if (userSnapshot.exists) {
                await transaction.update(userReference, {
                    premium: true,
                    dailyAttemptsRemaining: 10,
                });
            } else {
                const newPremiumUser = {
                    acceptTradeOffers: true,
                    dailyAttemptsRemaining: 10,
                    issueDate: year + '/' + month + '/' + day,
                    level: 1,
                    nickname: userNickname,
                    crystals: 0,
                    premium: true,
                    rank: 'Class D',
                    xp: 0,
                    card1Purchased: false,
                    card2Purchased: false,
                    card3Purchased: false,
                    card4Purchased: false,
                    card5Purchased: false,
                };
    
                await transaction.set(userReference, newPremiumUser);
            }
        } else {
            await transaction.update(userReference, {
                premium: false,
                dailyAttemptsRemaining: 5,
            });
        }
    });
}
