const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const firebase = require('../../utils/firebase');

const database = firebase.firestore();

module.exports = {
    cooldown: 20,
    data: new SlashCommandBuilder()
        .setName('senttrades')
        .setDescription('Lists pending trade requests along with a history of trades you have completed.'),
    async execute(interaction) {
        const userId = interaction.user.id;

        // * Notify the Discord API that the interaction was received successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply({ ephemeral: true });

        const userReference = database.collection('user').doc(userId);
        const userSnapshot = await userReference.get();

        // ! If the user is not registered, returns an error message.
        if (!userSnapshot.exists) {
            await interaction.editReply(`${process.env.EMOJI_ERROR}  You are not registered! Use /\`card\` to start playing.`);
            return;
        }

        const pendingTradeReference = database.collection('trade');

        const pendingTradeQuery = pendingTradeReference.where('issuer', '==', userId)
                                                        .where('tradeConfirmation', '==', false)
                                                        .orderBy('securityCooldown', 'desc');
        const pendingTradeSnapshot = await pendingTradeQuery.get();

        // ! If the user has no pending sent trades, it displays the embed with no details and the history of recent trades performed.
        if (pendingTradeSnapshot.empty) {
            const embed = new EmbedBuilder()
                .setColor(0x010101)
                .setTitle(`${process.env.EMOJI_PAGE}  __**List of Pending Sent Trades:**__ ${pendingTradeSnapshot.size}`)
                .setDescription(`No pending trade requests found.\n\n**${process.env.EMOJI_TRIANGLE_DOWN}${process.env.EMOJI_TRIANGLE_DOWN}${process.env.EMOJI_TRIANGLE_DOWN}  Recent Trade History  ${process.env.EMOJI_TRIANGLE_DOWN}${process.env.EMOJI_TRIANGLE_DOWN}${process.env.EMOJI_TRIANGLE_DOWN}**`);

            const filledEmbed = await historyTrades(userId, embed);

            await interaction.editReply({ embeds: [filledEmbed] });
            return;
        }

        /**
         * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
         * * The command passes all validations and the operation is performed. *
         * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
         */

        const promises = [];

        // * First for structure is used to iterate over the trades using promises and get the information faster.
        for (const trade of pendingTradeSnapshot.docs) {
            const tradeDocument = trade.data();

            const tradeDate = new Date(tradeDocument.securityCooldown._seconds * 1000 + tradeDocument.securityCooldown._nanoseconds / 1000000).toLocaleString();

            const recipientReference = database.collection('user').doc(tradeDocument.recipient);
            const recipientSnapshot = recipientReference.get();

            promises.push(recipientSnapshot);
            promises.push(tradeDate);
        }

        const results = await Promise.all(promises);

        // * The trades are listed by iterating in a single string to display it in the embed.
        let tradesList = '';

        const embeds = [];
        const pages = {};
        let entriesPerPageLimit = 0;

        // * Second for structure is used to iterate over the results and fill the embed with the trade information.
        for (let i = 0; i < results.length; i += 2) {
            const recipientSnapshot = results[i];
            const tradeDate = results[i + 1];

            const recipientDocument = recipientSnapshot.data();
            const recipientNickname = recipientDocument.nickname;

            tradesList += `${process.env.EMOJI_SMALL_WHITE_DASH}**\`${pendingTradeSnapshot.docs[i / 2].id}\`** // \`${tradeDate}\` to \`${recipientNickname}\`\n`;

            entriesPerPageLimit++;

            // * When 10 trade entries are accumulated, they are stored on a single page and the variable is reset.
            if (entriesPerPageLimit == 10) {
                tradesList += `\n**${process.env.EMOJI_TRIANGLE_DOWN}${process.env.EMOJI_TRIANGLE_DOWN}${process.env.EMOJI_TRIANGLE_DOWN}  Recent Trade History  ${process.env.EMOJI_TRIANGLE_DOWN}${process.env.EMOJI_TRIANGLE_DOWN}${process.env.EMOJI_TRIANGLE_DOWN}**`;

                const pageEmbed = new EmbedBuilder()
                    .setColor(0x010101)
                    .setTitle(`${process.env.EMOJI_PAGE}  __**List of Pending Sent Trades:**__ ${pendingTradeSnapshot.size}`)
                    .setDescription(tradesList);

                const filledEmbed = await historyTrades(userId, pageEmbed);

                embeds.push(filledEmbed);

                tradesList = '';
                entriesPerPageLimit = 0;
            }

            // * The validation is performed here for the last page in case 10 entries are not accumulated.
            if (i / 2 == pendingTradeSnapshot.size - 1) {
                // * If there are only 10 entries, the execution will still enter here, which will result in an error because 'tradesList'
                // * no longer contains text and it will attempt to add this in a new embed. So, this validation is performed to prevent this.
                if (tradesList.length == 0) {
                    // * 'break' is used for 'for'.
                    break;
                }

                tradesList += `\n**${process.env.EMOJI_TRIANGLE_DOWN}${process.env.EMOJI_TRIANGLE_DOWN}${process.env.EMOJI_TRIANGLE_DOWN}  Recent Trade History  ${process.env.EMOJI_TRIANGLE_DOWN}${process.env.EMOJI_TRIANGLE_DOWN}${process.env.EMOJI_TRIANGLE_DOWN}**`;

                const pageEmbed = new EmbedBuilder()
                    .setColor(0x010101)
                    .setTitle(`${process.env.EMOJI_PAGE}  __**List of Pending Sent Trades:**__ ${pendingTradeSnapshot.size}`)
                    .setDescription(tradesList);

                const filledEmbed = await historyTrades(userId, pageEmbed);

                embeds.push(filledEmbed);
            }
        }

        const userRow = (id) => {
            const row = new ActionRowBuilder();

            const previousButton = new ButtonBuilder()
                .setCustomId('previousButton')
                .setStyle('Secondary')
                .setEmoji(`${process.env.WHITE_ARROW_LEFT}`)
                .setDisabled(pages[id] === 0);

            const nextButton = new ButtonBuilder()
                .setCustomId('nextButton')
                .setStyle('Secondary')
                .setEmoji(`${process.env.WHITE_ARROW_RIGHT}`)
                .setDisabled(pages[id] === embeds.length - 1);

            row.addComponents(previousButton, nextButton);

            return row;
        };

        pages[userId] = pages[userId] || 0;

        const embed = embeds[pages[userId]];
        const collectorFilter = (x) => x.user.id === userId;
        const time = 1000 * 60 * 5;

        const reply = await interaction.editReply({
            embeds: [embed],
            components: [userRow(userId)],
        });

        const collector = reply.createMessageComponentCollector({ filter: collectorFilter, time: time });

        collector.on('collect', async (button) => {
            if (!button) {
                return;
            }

            button.deferUpdate();

            if (button.customId !== 'previousButton' && button.customId !== 'nextButton') {
                return;
            }

            if (button.customId === 'previousButton' && pages[userId] > 0) {
                --pages[userId];
            } else if (button.customId === 'nextButton' && pages[userId] < embeds.length - 1) {
                ++pages[userId];
            }

            await interaction.editReply({
                embeds: [embeds[pages[userId]]],
                components: [userRow(userId)],
            });
        });
    },
};

async function historyTrades(userId, embed) {
    const issuerCompleteTradeReference = database.collection('trade');
    const issuerCompleteTradeQuery = issuerCompleteTradeReference.where('issuer', '==', userId)
                                                                    .where('tradeConfirmation', '==', true);
    const issuerCompleteTradeSnapshot = await issuerCompleteTradeQuery.get();

    const recipientCompleteTradeReference = database.collection('trade');
    const recipientCompleteTradeQuery = recipientCompleteTradeReference.where('recipient', '==', userId)
                                                                        .where('tradeConfirmation', '==', true);
    const recipientCompleteTradeSnapshot = await recipientCompleteTradeQuery.get();

    const userCompleteTradeSnapshot = issuerCompleteTradeSnapshot.docs.concat(recipientCompleteTradeSnapshot.docs);

    // * This line sorts the trades by date in descending order.
    userCompleteTradeSnapshot.sort((a, b) => b.data().tradeDate.toMillis() - a.data().tradeDate.toMillis());

    let historyLimit = 0;

    const promises = [];

    // * First for structure is used to iterate over the trades using promises and get the information faster.
    for (const document of userCompleteTradeSnapshot) {
        if (historyLimit === 7) {
            break;
        }
        
        const tradeDocument = document.data();

        const issuerCardReference = tradeDocument.issuerCard;
        const issuerCardSnapshot = issuerCardReference.get();

        const recipientCardReference = tradeDocument.recipientCard;
        const recipientCardSnapshot = recipientCardReference.get();

        const issuerReference = database.collection('user').doc(tradeDocument.issuer);
        const issuerSnapshot = issuerReference.get();

        promises.push(issuerCardSnapshot);
        promises.push(recipientCardSnapshot);
        promises.push(issuerSnapshot);

        historyLimit++;
    }

    const results = await Promise.all(promises);

    // * Second for structure is used to iterate over the results and fill the embed with the trade information.
    for (let i = 0; i < results.length; i += 3) {
        const issuerCardSnapshot = results[i];
        const recipientCardSnapshot = results[i + 1];
        const issuerSnapshot = results[i + 2];

        const tradeDocument = userCompleteTradeSnapshot[i / 3].data();

        const tradeDate = new Date(tradeDocument.tradeDate._seconds * 1000 + tradeDocument.tradeDate._nanoseconds / 1000000).toLocaleString();
        const issuerDocument = issuerSnapshot.data();
        const issuerNickname = issuerDocument.nickname;

        const holographicEmojis = {
            'Emerald': `${process.env.EMOJI_EMERALD}`,
            'Golden': `${process.env.EMOJI_GOLDEN}`,
            'Diamond': `${process.env.EMOJI_DIAMOND}`,
        };  

        const issuerCard = tradeDocument.issuerHolographic !== 'Normal' ? `${issuerCardSnapshot.id} (${holographicEmojis[tradeDocument.issuerHolographic]})` : `${issuerCardSnapshot.id}`;
        const recipientCard = tradeDocument.recipientHolographic !== 'Normal' ? `${recipientCardSnapshot.id} (${holographicEmojis[tradeDocument.recipientHolographic]})` : `${recipientCardSnapshot.id}`;

        embed.addFields(
            { name: ' ', value: `${process.env.EMOJI_WHITE_DASH} ${issuerCard} for ${recipientCard} (${tradeDate}) ${process.env.EMOJI_RIGHT_ARROW} **${issuerNickname}**` },
        );
    }

    return embed;
}
