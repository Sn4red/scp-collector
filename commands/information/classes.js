const path = require('node:path');
const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    cooldown: 60 * 30,
    data: new SlashCommandBuilder()
        .setName('classes')
        .setDescription('Details the different classes of SCPs.'),
    async execute(interaction) {
        // * Notify the Discord API that the interaction was received successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply();

        const thumbnailPath = path.join(__dirname, '../../images/embed/classes-thumbnail.jpg');
        const iconFooterPath = path.join(__dirname, '../../images/embed/classes-iconFooter.gif');

        const thumbnail = new AttachmentBuilder(thumbnailPath);
        const iconFooter = new AttachmentBuilder(iconFooterPath);

        const embed = new EmbedBuilder()
            .setColor(0x010101)
            .setTitle(`${process.env.EMOJI_DISTORTED_WARNING}   Object Classes`)
            .setDescription(`${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}\n` +
                            'All objects, entities, and anomalous phenomena requiring Special Containment Procedures are assigned an **Object Class**. ' +
                            'They serve as an approximate indicator of how difficult an object is to contain. The following are covered here:\n\n' +
                            '- Safe -> +5XP -> 43% probability\n' +
                            '- Euclid -> +15XP -> 30% probability\n' +
                            '- Keter -> +30XP -> 21% probability\n' +
                            '- Thaumiel -> +100XP -> 4% probability\n' +
                            '- Apollyon -> +200XP -> 2% probability')
            .addFields(
                { name: `${process.env.EMOJI_HOLOGRAPHIC_CARD}   Holographics  ${process.env.EMOJI_THUNDER} VIP FEATURE ${process.env.EMOJI_THUNDER}`,
                    value: 'Also, there are chances of obtaining holographic cards. These are rares to collect and provide additional XP too!\n\n' +
                            `- ${process.env.EMOJI_EMERALD}   Emerald -> +40XP -> 7% probability\n` +
                            `- ${process.env.EMOJI_GOLDEN}   Golden -> +70XP -> 2% probability\n` +
                            `- ${process.env.EMOJI_DIAMOND}   Diamond -> +100XP -> 0.7% probability` },
            )
            .setThumbnail('attachment://classes-thumbnail.jpg')
            .setTimestamp()
            .setFooter({ text: 'Use /commands to see the full list of available commands.', iconURL: 'attachment://classes-iconFooter.gif' });

        await interaction.editReply({ embeds: [embed], files: [thumbnail, iconFooter] });
    },
};
