const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`${new Date()} >>> *** Functional bot ${client.user.tag} ***`);

        console.log('\n ,---.   ,-----.,------.      ,-----.       ,--.,--.               ,--.                 ');
        console.log('\'   .-\' \'  .--./|  .--. \'    \'  .--./ ,---. |  ||  | ,---.  ,---.,-\'  \'-. ,---. ,--.--. ');
        console.log('`.  `-. |  |    |  \'--\' |    |  |    | .-. ||  ||  || .-. :|  .--\'-.  .-\'| .-. ||  .--\' ');
        console.log('.-\'    |\'  \'--\'\\|  | --\'     \'  \'--\'\\\' \'-\' \'|  ||  |\\   --.\\ `--.  |  |  \' \'-\' \'|  |    ');
        console.log('`-----\'  `-----\'`--\'          `-----\' `---\' `--\'`--\' `----\' `---\'  `--\'   `---\' `--\'    \n\n');
    },
};