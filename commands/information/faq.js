const path = require('node:path');
const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    cooldown: 60 * 30,
    data: new SlashCommandBuilder()
        .setName('faq')
        .setDescription('Frequently Asked Questions about bot functionality.'),
    async execute(interaction) {
        const thumbnailPath = path.join(__dirname, '../../images/embed/faq-thumbnail.jpg');
        const iconFooterPath = path.join(__dirname, '../../images/embed/faq-iconFooter.gif');

        const thumbnail = new AttachmentBuilder(thumbnailPath);
        const iconFooter = new AttachmentBuilder(iconFooterPath);

        const embed = new EmbedBuilder()
            .setColor(0x010101)
            .setTitle('<a:pin:1230368962496434338>   FAQ - Frequently Asked Questions')
            .setDescription('<a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694>\n' +
                            'Here are some questions that may be common and could arise during the use of this bot.')
            .setThumbnail('attachment://faq-thumbnail.jpg')
            .setFields(
                { name: 'Is my progress local to each server?', value: 'Your progress with the bot is global. Actions you take in one server may be reflected in another. ' +
                        'For example, if you obtain cards from one server, you should be able to view them from a different one.' },
                { name: 'How many SCP cards are there at the moment?', value: 'The **Series I** (002-999) is currently being covered. More will be added over time.' },
                { name: 'Can extra benefits be obtained?', value: 'You can donate at the following link to see the details of benefits: <Patreon>' },
            )
            .setTimestamp()
            .setFooter({ text: 'Use /commands to see the full list of available commands.', iconURL: 'attachment://faq-iconFooter.gif' });

        await interaction.reply({ embeds: [embed], files: [thumbnail, iconFooter] });
    },
};
