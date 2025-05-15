const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const firebase = require('../../utils/firebase');

const database = firebase.firestore();

module.exports = {
    cooldown: 20,
    data: new SlashCommandBuilder()
        .setName('receivedtrades')
        .setDescription('Lists the trade requests you have pending to accept or decline.'),
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

        const pendingTradeQuery = pendingTradeReference.where('recipient', '==', userId)
                                                        .where('tradeConfirmation', '==', false)
                                                        .orderBy('securityCooldown', 'desc');
        const pendingTradeSnapshot = await pendingTradeQuery.get();

        // ! If the user has no pending trade requests, returns an error message.
        if (pendingTradeSnapshot.empty) {
            await interaction.editReply(`${process.env.EMOJI_ERROR}  No pending trade requests found.`);
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

            const issuerReference = database.collection('user').doc(tradeDocument.issuer);
            const issuerSnapshot = issuerReference.get();

            promises.push(issuerSnapshot);
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
            const issuerSnapshot = results[i];
            const tradeDate = results[i + 1];

            const issuerDocument = issuerSnapshot.data();
            const issuerNickname = issuerDocument.nickname;

            tradesList += `${process.env.EMOJI_SMALL_WHITE_DASH}**\`${pendingTradeSnapshot.docs[i / 2].id}\`** // \`${tradeDate}\` from \`${issuerNickname}\`\n`;

            entriesPerPageLimit++;

            // * When 10 trade entries are accumulated, they are stored on a single page and the variable is reset.
            if (entriesPerPageLimit == 10) {
                embeds.push(new EmbedBuilder()
                                .setColor(0x010101)
                                .setTitle(`${process.env.EMOJI_PAGE}  __**List of Pending Received Trades:**__ ${pendingTradeSnapshot.size}`)
                                .setDescription(tradesList));

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

                embeds.push(new EmbedBuilder()
                                .setColor(0x010101)
                                .setTitle(`${process.env.EMOJI_PAGE}  __**List of Pending Received Trades:**__ ${pendingTradeSnapshot.size}`)
                                .setDescription(tradesList));
            }
        }

        // * A new ActionRow is created containing 2 buttons.
        const userRow = (id) => {
            const row = new ActionRowBuilder();

            const previousButton = new ButtonBuilder()
                .setCustomId('previousButton')
                .setStyle('Secondary')
                .setEmoji(`${process.env.EMOJI_WHITE_ARROW_LEFT}`)
                .setDisabled(pages[id] === 0);

            const nextButton = new ButtonBuilder()
                .setCustomId('nextButton')
                .setStyle('Secondary')
                .setEmoji(`${process.env.EMOJI_WHITE_ARROW_RIGHT}`)
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
