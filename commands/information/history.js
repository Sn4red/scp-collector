const path = require('node:path');
const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    cooldown: 1800,
    data: new SlashCommandBuilder()
        .setName('history')
        .setDescription('Offers bot theme details and a brief history of the SCP Foundation for context.'),
    async execute(interaction) {
        const thumbnailPath = path.join(__dirname, '../../images/embed/history-thumbnail.gif');
        const iconFooterPath = path.join(__dirname, '../../images/embed/history-iconFooter.gif');

        const thumbnail = new AttachmentBuilder(thumbnailPath);
        const iconFooter = new AttachmentBuilder(iconFooterPath);

        const embed = new EmbedBuilder()
            .setColor(0x010101)
            .setTitle('<:building:1230367857791991898>   SCP Foundation')
            .setDescription('<a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694>\n' +
                            'Operating clandestinely and globally, The Foundation operates beyond any jurisdiction, reinforced by major national governments that have tasked ' +
                            'it with containing anomalous objects, entities, and phenomena. These anomalies pose a significant threat to global security, as they are capable ' +
                            'of causing physical or psychological harm.\n\n' +
                            'The Foundation operates to maintain normalcy, ensuring that the civilian population worldwide can live and carry on their daily lives without fear, ' +
                            'mistrust, or doubts about their personal beliefs. It also works to maintain human independence from extraterrestrial, extradimensional, and generally ' +
                            'extranormal influences.')
            .setThumbnail('attachment://history-thumbnail.gif')
            .setTimestamp()
            .setFooter({ text: 'Use /commands to see the full list of available commands.', iconURL: 'attachment://history-iconFooter.gif' });

        await interaction.reply({ embeds: [embed], files: [thumbnail, iconFooter] });
    },
};
