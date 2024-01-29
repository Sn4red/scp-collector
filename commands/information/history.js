const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    cooldown: 1800,
    data: new SlashCommandBuilder()
        .setName('history')
        .setDescription('Offers bot theme details and a brief history of the SCP Foundation for context.'),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(0x000000)
            .setTitle('🏛️   SCP Foundation')
            .setDescription('Operating clandestinely and globally, The Foundation operates beyond any jurisdiction, reinforced by major national governments that have tasked ' +
                            'it with containing anomalous objects, entities, and phenomena. These anomalies pose a significant threat to global security, as they are capable ' +
                            'of causing physical or psychological harm.\n\n' +
                            'The Foundation operates to maintain normalcy, ensuring that the civilian population worldwide can live and carry on their daily lives without fear, ' +
                            'mistrust, or doubts about their personal beliefs. It also works to maintain human independence from extraterrestrial, extradimensional, and generally ' +
                            'extranormal influences.')
            .setThumbnail('https://media.tenor.com/SRrg39SSX2YAAAAC/scp.gif')
            .setTimestamp()
            .setFooter({ text: 'Use /commands to see the full list of available commands.', iconURL: 'https://media.tenor.com/qVlSOwUINxcAAAAC/scp-logo.gif' });

        await interaction.reply({ embeds: [embed] });
    },
};
