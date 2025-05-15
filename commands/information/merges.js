const path = require('node:path');
const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    cooldown: 60 * 30,
    data: new SlashCommandBuilder()
        .setName('merges')
        .setDescription('Explains about how merge works.'),
    async execute(interaction) {
        // * Notify the Discord API that the interaction was received successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply();

        const thumbnailPath = path.join(__dirname, '../../images/embed/merges-thumbnail.gif');
        const iconFooterPath = path.join(__dirname, '../../images/embed/merges-iconFooter.gif');

        const thumbnail = new AttachmentBuilder(thumbnailPath);
        const iconFooter = new AttachmentBuilder(iconFooterPath);

        const embed = new EmbedBuilder()
            .setColor(0x010101)
            .setTitle(`${process.env.EMOJI_CHEST}   Merges`)
            .setDescription(`${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}\n` +
                            'A merge consists in transforming 5 cards and converting them into a single card of a higher class. The cards used ' +
                            'can be from different classes, but the class of the resulting card will always be higher than the class of the majority of ' +
                            'the cards used. The following are examples of merges:\n\n' +
                            '- `3 Safe` // `2 Keter` will merge to give and **Euclid** card.\n' +
                            '- `4 Euclid` // `1 Safe` will merge to give a **Keter** card.\n' +
                            '- `5 Euclid` will merge to give a **Keter** card.\n\n' +
                            'If there is no a single majority group of cards, for example, `2 Safe` // `2 Euclid` // `1 Keter`, the result will be random ' +
                            'between an **Euclid** or **Keter** card.')
            .addFields(
                { name: `${process.env.EMOJI_HOLOGRAPHIC_CARD}   Holographics`, value: 'For the resulting card to have a holograpic feature, the ' +
                        'following probabilities will be considered:\n\n' +
                        `- ${process.env.EMOJI_EMERALD}   Emerald -> 7% probability\n` +
                        `- ${process.env.EMOJI_GOLDEN}   Golden -> 2% probability\n` +
                        `- ${process.env.EMOJI_DIAMOND}   Diamond -> 0.7% probability` },
                { name: `${process.env.EMOJI_DISTORTED_WARNING}   Limitations`, value: 'Note that this function is only limited to Safe, Euclid and Keter class cards with **no holographic attributes**.' },
            )
            .setThumbnail('attachment://merges-thumbnail.gif')
            .setTimestamp()
            .setFooter({ text: 'Use /commands to see the full list of available commands.', iconURL: 'attachment://merges-iconFooter.gif' });

        await interaction.editReply({ embeds: [embed], files: [thumbnail, iconFooter] });
    },
};
