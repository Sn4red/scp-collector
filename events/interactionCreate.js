const {
    Events,
    Collection,
    MessageFlags } = require('discord.js');
const { cooldowns } = require('../index-scp-collector.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isChatInputCommand()) {
            return;
        }
    
        const command = interaction
            .client.commands.get(interaction.commandName);
    
        if (!command) {
            console.error(
                `No command with the name ${interaction.commandName} was ` +
                    'found.',
            );
            return;
        }

        if (!cooldowns.has(command.data.name)) {
            cooldowns.set(command.data.name, new Collection());
        }

        // * Cooldown.
        const now = interaction.createdTimestamp;
        const timestamps = cooldowns.get(command.data.name);
        const defaultCooldownDuration = 3;
        const cooldownAmount =
            (command.cooldown ?? defaultCooldownDuration) * 1000;

        if (timestamps.has(interaction.user.id)) {
            const expirationTime = timestamps
                .get(interaction.user.id) + cooldownAmount;

            if (now < expirationTime) {
                const expiredTimestamp = Math.round(expirationTime / 1000);
                return interaction.reply({
                    content: `${process.env.EMOJI_CLASSIC_HOURGLASS}  You ` +
                        `can use /\`${command.data.name}\` again ` +
                        `<t:${expiredTimestamp}:R>.`,
                    flags: [MessageFlags.Ephemeral],
                });
            }
        }

        timestamps.set(interaction.user.id, now);
        setTimeout(() => timestamps
            .delete(interaction.user.id), cooldownAmount);
    
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: `${process.env.EMOJI_ERROR}  An error occurred ` +
                        'while executing this command!',
                    flags: [MessageFlags.Ephemeral],
                });
            } else {
                await interaction.reply({
                    content: `${process.env.EMOJI_ERROR}  An error occurred ` +
                        'while executing this command!',
                    flags: [MessageFlags.Ephemeral],
                });
            }
        }
    },
};
