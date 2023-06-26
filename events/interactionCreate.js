const { Events, Collection } = require('discord.js');
const { cooldowns } = require('../index.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isChatInputCommand()) {
            return;
        }
    
        const command = interaction.client.commands.get(interaction.commandName);
    
        if (!command) {
            console.error(`Ningún comando de nombre ${interaction.commandName} fue encontrado.`);
            return;
        }

        if (!cooldowns.has(command.data.name)) {
            cooldowns.set(command.data.name, new Collection());
        }

        // Cooldown
        const now = interaction.createdTimestamp;
        const timestamps = cooldowns.get(command.data.name);
        const defaultCooldownDuration = 3;
        const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1000;

        if (timestamps.has(interaction.user.id)) {
            const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

            if (now < expirationTime) {
                const expiredTimestamp = Math.round(expirationTime / 1000);
                return interaction.reply({ content: `Podrás usar de nuevo \`${command.data.name}\` <t:${expiredTimestamp}:R>.`, ephemeral: true });
            }
        }

        timestamps.set(interaction.user.id, now);
        setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
    
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: '¡Se produjo un error al ejecutar este comando!', ephemeral: true });
            } else {
                await interaction.reply({ content: '¡Se produjo un error al ejecutar este comando!', ephemeral: true });
            }
        }
    },
};
