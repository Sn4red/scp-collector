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
            .setTitle(`${process.env.EMOJI_PIN}   FAQ - Frequently Asked Questions`)
            .setDescription(`${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}\n` +
                            'Here are some questions that may be common and could arise during the use of this bot.')
            .setThumbnail('attachment://faq-thumbnail.jpg')
            .setFields(
                { name: `${process.env.EMOJI_SMALL_WHITE_DASH}What is the schedule for the shots reset?`, value: 'Every day at 12:00 a.m (EST/EDT).' },
                { name: `${process.env.EMOJI_SMALL_WHITE_DASH}Is my progress local to each server?`, value: 'Your progress with the bot is global. Actions you take in one server may be reflected in another. ' +
                        'For example, if you obtain cards from one server, you should be able to view them from a different one.' },
                { name: `${process.env.EMOJI_SMALL_WHITE_DASH}How many SCP cards are there at the moment?`, value: 'The **Series I** (002-999) is currently being covered. However, Apollyon-class cards come from later series, ' +
                        'as there are no Apollyon-class SCPs in Series I. More cards from later series will be added over time and replaced (in case there is some changes in the official SCP Foundation website).' },
                { name: `${process.env.EMOJI_SMALL_WHITE_DASH}Can extra benefits be obtained?`, value: 'You can donate at the following link to see the details of benefits: [patreon.com/Sn4red](https://www.patreon.com/Sn4red/)' },
                { name: `${process.env.EMOJI_SMALL_WHITE_DASH}I'm already paying for the membership but I'm not receiving my benefits.`, value: 'Make sure to link your Patreon account with Discord **and also** be in the ' +
                        '[Official Server](https://discord.gg/PrfWkJchZg), ' +
                        'so the Patreon bot can give you the proper VIP role.' },
                { name: `${process.env.EMOJI_SMALL_WHITE_DASH}I paid for the membership and joined the server, but later I left. I don't have my benefits anymore.`, value: 'You must always be in the server to receive the benefits. ' +
                        'If you leave, you can join again so the Patreon bot can give you the proper VIP role.' },
                { name: `${process.env.EMOJI_SMALL_WHITE_DASH}I paid for the membership but I'm banned from the server or I can't acccess.`, value: 'You can keep using the bot without being in the official server, but you won\'t ' +
                        'be able to use your benefits. The only way to reverse this is to link your Patreon account to a different Discord account to gain access to the server. This will allow you ' +
                        'to receive your benefits, but unfortunately, you will lose your entire card collection, because the bot recognizes the accounts by the **Discord user ID**. For any appeal ' +
                        'please contact me through the form.' },
                { name: `${process.env.EMOJI_SMALL_WHITE_DASH}I had a pending trade request, but I don't see it anymore.`, value: 'There are four reasons why this might have happened: the request was declined, cancelled, over a ' +
                        'month old, or you no longer have the card needed to complete the trade.\n\n' +
                        'All pending trade requests that have been in the same state for at least a month will be deleted (this is checked every day at 11:00 p.m EST/EDT), so you can send a new one without any issues.\n\n' +
                        'When a trade is accepted, the command also checks whether the card you traded was involved in any other pending trades and if those trades are still possible. If you only had one copy of the card and ' +
                        'already traded it, this means that any other trades involving that card can\'t be completed and are therefore deleted.' },
                { name: `${process.env.EMOJI_SMALL_WHITE_DASH}When does the market reset?`, value: 'It resets every Sunday at 12:05 (EST/EDT).' },
                { name: `${process.env.EMOJI_SMALL_WHITE_DASH}Are the cards in the market the same for everyone, or does each user get different ones?`, value: 'The cards in the market are the same for everyone.' },
                { name: `${process.env.EMOJI_SMALL_WHITE_DASH}When do premium users receive their monthly crystals?`, value: 'At the end of each month at 12:20 (EST/EDT).' },
                { name: 'If you have more questions, please fill out this form so I can reach to you: https://bit.ly/SCPCollector', value: ' ' },
            )
            .setTimestamp()
            .setFooter({ text: 'Use /commands to see the full list of available commands.', iconURL: 'attachment://faq-iconFooter.gif' });

        await interaction.editReply({ embeds: [embed], files: [thumbnail, iconFooter] });
    },
};
