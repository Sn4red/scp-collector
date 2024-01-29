const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    cooldown: 1800,
    data: new SlashCommandBuilder()
        .setName('faq')
        .setDescription('Frequently Asked Questions about bot functionality.'),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(0x000000)
            .setTitle('📌   FAQ - Frequently Asked Questions')
            .setDescription('Here are some questions that may be common and could arise during the use of this bot.')
            .setThumbnail('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTQzl95DWl_GNe1tk4Z10e0lVfsavY_OhQNJQ&usqp=CAU')
            .setFields(
                { name: 'Is my progress local to each server?', value: 'Your progress with the bot is global. Actions you take in one server may be reflected in another. ' +
                        'For example, if you obtain cards from one server, you should be able to view them from a different one.' },
                { name: 'How many SCP cards are there at the moment?', value: 'The Series I (002-999) is currently being covered. More will be added over time.' },
                { name: 'Can extra benefits be obtained?', value: 'You can donate at the following link to see the details of benefits: <Patreon>' },
            )
            .setTimestamp()
            .setFooter({ text: 'Use /commands to see the full list of available commands.', iconURL: 'https://media.tenor.com/qVlSOwUINxcAAAAC/scp-logo.gif' });

        await interaction.reply({ embeds: [embed] });
    },
};
