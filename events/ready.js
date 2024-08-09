const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        // TODO: mejorar el mensaje de consola, para que sea mas llamativo y facil de encontrar en la terminal.
        console.log(`${new Date()} >>> *** Functional bot ${client.user.tag} ***`);

        console.log('\n ,---.   ,-----.,------.      ,-----.       ,--.,--.               ,--.                 ');
        console.log('\'   .-\' \'  .--./|  .--. \'    \'  .--./ ,---. |  ||  | ,---.  ,---.,-\'  \'-. ,---. ,--.--. ');
        console.log('`.  `-. |  |    |  \'--\' |    |  |    | .-. ||  ||  || .-. :| .--\'-.  .-\'| .-. ||  .--\' ');
        console.log('.-\'    |\'  \'--\'\\|  | --\'     \'  \'--\'\\\' \'-\' \'|  ||  |\\   --.\\ `--.  |  |  \' \'-\' \'|  |    ');
        console.log('`-----\'  `-----\'`--\'          `-----\' `---\' `--\'`--\' `----\' `---\'  `--\'   `---\' `--\'    \n\n');
    },
};