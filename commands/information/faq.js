const path = require('node:path');
const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    cooldown: 60 * 30,
    data: new SlashCommandBuilder()
        .setName('faq')
        .setDescription('Frequently Asked Questions about bot functionality.'),
    async execute(interaction) {
        // * Notify the Discord API that the interaction was received successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply();

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
                { name: 'How many SCP cards are there at the moment?', value: 'The **Series I** (002-999) is currently being covered. However, Apollyon-class cards come from later series, ' +
                        'as there are no Apollyon-class SCPs in Series I. More cards from later series will be added over time and replaced (in case there is some changes in the official SCP Foundation website).' },
                { name: 'Can extra benefits be obtained?', value: 'You can donate at the following link to see the details of benefits: [patreon.com/Sn4red](https://www.patreon.com/Sn4red/)' },
                { name: 'I\'m already paying for the membership but I\'m not receiving my benefits.', value: 'Make sure to link your Patreon account with Discord **and also** be in the ' +
                        '[Official Server](https://discord.gg/PrfWkJchZg), ' +
                        'so the Patreon bot can give you the proper VIP role.' },
                { name: 'I paid for the membership and joined the server, but later I left. I don\'t have my benefits anymore.', value: 'You must always be in the server to receive the benefits. ' +
                        'If you leave, you can join again so the Patreon bot can give you the proper VIP role.'},
                { name: 'I paid for the membership but I\'m banned from the server or I can\'t acccess.', value: 'You can keep using the bot without being in the official server, but you won\'t ' +
                        'be able to use your benefits. The only way to reverse this is to link your Patreon account to a different Discord account to gain access to the server. This will allow you ' +
                        'to receive your benefits, but unfortunately, you will lose your entire card collection, because the bot recognizes the accounts by the **Discord user ID**. For any appeal ' +
                        'please contact me through the form.' },
                { name: 'If you have more questions, please fill out this form so I can reach to you: https://bit.ly/SCPCollector', value: ' ' },
            )
            .setTimestamp()
            .setFooter({ text: 'Use /commands to see the full list of available commands.', iconURL: 'attachment://faq-iconFooter.gif' });

        await interaction.editReply({ embeds: [embed], files: [thumbnail, iconFooter] });
    },
};
