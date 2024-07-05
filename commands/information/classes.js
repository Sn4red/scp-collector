const path = require('node:path');
const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    cooldown: 60 * 30,
    data: new SlashCommandBuilder()
        .setName('classes')
        .setDescription('Details the different classes of SCPs.'),
    async execute(interaction) {
        const thumbnailPath = path.join(__dirname, '../../images/embed/classes-thumbnail.jpg');
        const iconFooterPath = path.join(__dirname, '../../images/embed/classes-iconFooter.gif');

        const thumbnail = new AttachmentBuilder(thumbnailPath);
        const iconFooter = new AttachmentBuilder(iconFooterPath);

        const embed = new EmbedBuilder()
            .setColor(0x010101)
            .setTitle('<a:distorted_warning:1230359869316661330>   Object Classes')
            .setDescription('<a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694>\n' +
                            'All objects, entities, and anomalous phenomena requiring Special Containment Procedures are assigned an **Object Class**. ' +
                            'They serve as an approximate indicator of how difficult an object is to contain. The following are covered here:\n\n' +
                            '- Safe -> +5XP -> 43% probability\n' +
                            '- Euclid -> +15XP -> 30% probability\n' +
                            '- Keter -> +30XP -> 21% probability\n' +
                            '- Thaumiel -> +100XP -> 4% probability\n' +
                            '- Apollyon -> +200XP -> 2% probability')
            .addFields(
                { name: '<a:holographic_card:1230360738653016095>   Holographics  <a:thunder:1230360956056375317> VIP FEATURE <a:thunder:1230360956056375317>',
                    value: 'Also, there are chances of obtaining holographic cards. These are rares to collect and provide additional XP too!\n\n' +
                            '- <a:emerald:1228923470239367238>   Emerald -> +40XP -> 7% probability\n' +
                            '- <a:golden:1228925086690443345>   Golden -> +70XP -> 2% probability\n' +
                            '- <a:diamond:1228924014479671439>   Diamond -> +100XP -> 0.7% probability' },
            )
            .setThumbnail('attachment://classes-thumbnail.jpg')
            .setTimestamp()
            .setFooter({ text: 'Use /commands to see the full list of available commands.', iconURL: 'attachment://classes-iconFooter.gif' });

        await interaction.reply({ embeds: [embed], files: [thumbnail, iconFooter] });
    },
};
