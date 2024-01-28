const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const firebase = require('../../utils/firebase');

const database = firebase.firestore();

module.exports = {
    cooldown: 20,
    data: new SlashCommandBuilder()
        .setName('tradeosenviados')
        .setDescription('Lista los tradeos que están pendientes junto con un historial de tradeos que has realizado.'),
    async execute(interaction) {
        const userId = interaction.user.id;

        // Notify the Discord API that the interaction was received successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply({ ephemeral: true });

        const userReference = database.collection('user').doc(userId);
        const userSnapshot = await userReference.get();

        if (userSnapshot.exists) {
            const pendingTradeReference = database.collection('trade').where('issuer', '==', userId)
                                                                    .where('tradeConfirmation', '==', false);

            const pendingTradeSnapshot = await pendingTradeReference.get();

            if (!pendingTradeSnapshot.empty) {
                // The trades are listed by iterating in a single string to display it in the embed.
                let tradesList = '';

                const embeds = [];
                const pages = {};
                let entriesPerPageLimit = 0;

                for (const [index, document] of pendingTradeSnapshot.docs.entries()) {
                    const tradeDocument = document.data();

                    const tradeDate = new Date(tradeDocument.securityCooldown._seconds * 1000 + tradeDocument.securityCooldown._nanoseconds / 1000000).toLocaleString();

                    const recipientReference = database.collection('user').doc(tradeDocument.recipient);
                    const recipientSnapshot = await recipientReference.get();
                    const recipientDocument = recipientSnapshot.data();
                    const recipientNickname = recipientDocument.nickname;

                    tradesList += `▫️**\`${document.id}\`** // \`${tradeDate}\` a \`${recipientNickname}\`\n`;

                    entriesPerPageLimit++;

                    // When 10 trade entries are accumulated, they are stored on a single page and the variable is reset.
                    if (entriesPerPageLimit == 10) {
                        tradesList += '\n**🔻🔻🔻  Historial de Tradeos Recientes  🔻🔻🔻**';

                        const pageEmbed = new EmbedBuilder()
                            .setColor(0x000000)
                            .setTitle('📃  __**Lista de Tradeos Enviados**__')
                            .setDescription(tradesList);

                        const filledEmbed = await historyTrades(userId, pageEmbed);

                        embeds.push(filledEmbed);

                        tradesList = '';
                        entriesPerPageLimit = 0;
                    }

                    // The validation is performed here for the last page in case 10 entries are not accumulated.
                    if (index == pendingTradeSnapshot.size - 1) {
                        // If there are only 10 entries, the execution will still enter here, which will result in an error because 'cardsList'
                        // no longer contains text and it will attempt to add this in a new embed. So, this validation is performed to prevent this.
                        if (tradesList.length == 0) {
                            return;
                        }

                        tradesList += '\n**🔻🔻🔻  Historial de Tradeos Recientes  🔻🔻🔻**';

                        const pageEmbed = new EmbedBuilder()
                            .setColor(0x000000)
                            .setTitle('📃  __**Lista de Tradeos Enviados**__')
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
                        .setEmoji('⬅️')
                        .setDisabled(pages[id] === 0);

                    const nextButton = new ButtonBuilder()
                        .setCustomId('nextButton')
                        .setStyle('Secondary')
                        .setEmoji('➡️')
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
            } else {
                const embed = new EmbedBuilder()
                    .setColor(0x000000)
                    .setTitle('📃  __**Lista de Tradeos Enviados**__')
                    .setDescription('No se han encontrado tradeos pendientes.\n\n**🔻🔻🔻  Historial de Tradeos Recientes  🔻🔻🔻**');

                const filledEmbed = await historyTrades(userId, embed);

                await interaction.editReply({ embeds: [filledEmbed] });
            }
        } else {
            await interaction.editReply('❌  ¡No estás registrado(a)! Usa /tarjeta para guardar tus datos.');
        }
    },
};

async function historyTrades(userId, embed) {
    const issuerCompleteTradeReference = database.collection('trade').where('issuer', '==', userId)
                                                                    .where('tradeConfirmation', '==', true);

    const issuerCompleteTradeSnapshot = await issuerCompleteTradeReference.get();

    const recipientCompleteTradeReference = database.collection('trade').where('recipient', '==', userId)
                                                                        .where('tradeConfirmation', '==', true);
            
    const recipientCompleteTradeSnapshot = await recipientCompleteTradeReference.get();

    const userCompleteTradeSnapshot = issuerCompleteTradeSnapshot.docs.concat(recipientCompleteTradeSnapshot.docs);

    for (const document of userCompleteTradeSnapshot) {
        const tradeDocument = document.data();

        const issuerCardReference = tradeDocument.issuerCard;
        const issuerCardSnapshot = await issuerCardReference.get();

        const recipientCardReference = tradeDocument.recipientCard;
        const recipientCardSnapshot = await recipientCardReference.get();

        const tradeDate = new Date(tradeDocument.tradeDate._seconds * 1000 + tradeDocument.tradeDate._nanoseconds / 1000000).toLocaleString();
                
        const issuerReference = database.collection('user').doc(tradeDocument.issuer);
        const issuerSnapshot = await issuerReference.get();
        const issuerDocument = issuerSnapshot.data();
        const issuerNickname = issuerDocument.nickname;

        embed.addFields(
            { name: ' ', value: `* ${issuerCardSnapshot.id} por ${recipientCardSnapshot.id} (${tradeDate}) -> ${issuerNickname}` },
        );
    }

    return embed;
}
