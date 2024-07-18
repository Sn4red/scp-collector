const path = require('node:path');
const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    cooldown: 60 * 30,
    data: new SlashCommandBuilder()
        .setName('merges')
        .setDescription('Explains about how merge works.'),
    async execute(interaction) {
        const thumbnailPath = path.join(__dirname, '../../images/embed/merges-thumbnail.gif');
        const iconFooterPath = path.join(__dirname, '../../images/embed/merges-iconFooter.gif');

        const thumbnail = new AttachmentBuilder(thumbnailPath);
        const iconFooter = new AttachmentBuilder(iconFooterPath);

        const embed = new EmbedBuilder()
            .setColor(0x010101)
            .setTitle('<a:chest:1257855164434354229>   Merges')
            .setDescription('<a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694>\n' +
                            'A merge consists in transforming 5 cards and converting them into a single card of a higher class. The cards used ' +
                            'can be from different classes, but the class of the resulting card will always be higher than the class of the majority of ' +
                            'the cards used. The following are examples of merges:\n\n' +
                            '- `3 Safe` // `2 Keter` will merge to give and **Euclid** card.\n' +
                            '- `4 Euclid` // `1 Safe` will merge to give a **Keter** card.\n' +
                            '- `5 Euclid` will merge to give a **Keter** card.\n\n' +
                            'If there is no a single majority group of cards, for example, `2 Safe` // `2 Euclid` // `1 Keter`, the result will be random ' +
                            'between an **Euclid** or **Keter** card.')
            .addFields(
                { name: '<a:holographic_card:1230360738653016095>   Holographics', value: 'For the resulting card to have a holograpic feature, the ' +
                        'following probabilities will be considered:\n\n' +
                        '- <a:emerald:1228923470239367238>   Emerald -> 7% probability\n' +
                        '- <a:golden:1228925086690443345>   Golden -> 2% probability\n' +
                        '- <a:diamond:1228924014479671439>   Diamond -> 0.7% probability' },
                { name: '<a:distorted_warning:1230359869316661330>   Limitations', value: 'Note that this function is only limited to Safe, Euclid and Keter class cards with **no holographic attributes**.' },
            )
            .setThumbnail('attachment://merges-thumbnail.gif')
            .setTimestamp()
            .setFooter({ text: 'Use /commands to see the full list of available commands.', iconURL: 'attachment://merges-iconFooter.gif' });

        await interaction.reply({ embeds: [embed], files: [thumbnail, iconFooter] });
    },
};
