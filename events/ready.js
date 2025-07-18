const fs = require('fs');
const path = require('path');
const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(
            `${new Date()} >>> *** Functional bot ${client.user.tag} ***\n`,
        );

        const bannerPath = path.join(__dirname, '../utils/asciiArt.txt');
        const banner = fs.readFileSync(bannerPath, 'utf8');

        console.log(banner + '\n');

        // * This section updates the cache of guild members, to fetch the user
        // * roles appropriately after the bot is restarted.
        const guild = client.guilds.cache.get(process.env.DISCORD_SERVER_ID);

        try {
            await guild.members.fetch({ time: 30000 });
        } catch (error) {
            console.log(`${new Date()} >>> *** ERROR: ready.js ***`);
            console.error(error);
        }
    },
};
