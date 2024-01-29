const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const firebase = require('../../utils/firebase');

const database = firebase.firestore();

module.exports = {
    cooldown: 20,
    data: new SlashCommandBuilder()
        .setName('viewtrade')
        .setDescription('Displays the details of a trade request.')
        .addStringOption(option =>
            option.setName('request')
            .setDescription('Trade request ID to inquire about.')
            .setRequired(true)),
    async execute(interaction) {
        // Notify the Discord API that the interaction was received successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply({ ephemeral: true });

        const userReference = database.collection('user').doc(interaction.user.id);
        const userSnapshot = await userReference.get();

        if (userSnapshot.exists) {
            const tradeId = interaction.options.getString('request');

            const tradeReference = database.collection('trade').doc(tradeId);
            const tradeSnapshot = await tradeReference.get();

            if (tradeSnapshot.exists) {
                const tradeDocument = tradeSnapshot.data();

                const tradeObject = await formattingValues(tradeDocument);

                const tradeEmbed = new EmbedBuilder()
                    .setColor(0x000000)
                    .setTitle(`📃  Trade #: \`${tradeSnapshot.id}\``)
                    .addFields(
                        { name: '👤  Issuer', value: `\`${tradeObject.issuerNickname}\` (\`${tradeObject.issuerId}\`)` },
                        { name: '📓  Card', value: `\`${tradeObject.issuerCardId}\` // \`${tradeObject.issuerCardName}\`` },
                        { name: '👤  Recipient', value: `\`${tradeObject.recipientNickname}\` (\`${tradeObject.recipientId}\`)` },
                        { name: '📓  Card', value: `\`${tradeObject.recipientCardId}\` // \`${tradeObject.recipientCardName}\`` },
                        { name: '🕒  Creation Date', value: `\`${tradeObject.creationDate}\`` },
                        { name: '📌  Status', value: `**\`${tradeObject.tradeStatus}\`**` },
                    )
                    .setTimestamp();

                if (tradeObject.tradeDate != null) {
                    tradeEmbed.addFields({ name: '🕢  Trade Date', value: `\`${tradeObject.tradeDate}\`` });
                }

                await interaction.editReply({ embeds: [tradeEmbed] });
            } else {
                await interaction.editReply('❌  There is no trade with that ID!');
            }
        } else {
            await interaction.editReply('❌  You are not registered! Use /card to save your information.');
        }
    },
};

async function formattingValues(tradeDocument) {
    const issuerReference = database.collection('user').doc(tradeDocument.issuer);
    const issuerSnapshot = await issuerReference.get();
    const issuerDocument = issuerSnapshot.data();
    const issuerNickname = issuerDocument.nickname;
    const issuerId = issuerSnapshot.id;

    const issuerCardReference = tradeDocument.issuerCard;
    const issuerCardSnapshot = await issuerCardReference.get();
    const issuerCardDocument = issuerCardSnapshot.data();
    const issuerCardId = issuerCardSnapshot.id;
    const issuerCardName = issuerCardDocument.name;

    const recipientReference = database.collection('user').doc(tradeDocument.recipient);
    const recipientSnapshot = await recipientReference.get();
    const recipientDocument = recipientSnapshot.data();
    const recipientNickname = recipientDocument.nickname;
    const recipientId = recipientSnapshot.id;

    const recipientCardReference = tradeDocument.recipientCard;
    const recipientCardSnapshot = await recipientCardReference.get();
    const recipientCardDocument = recipientCardSnapshot.data();
    const recipientCardId = recipientCardSnapshot.id;
    const recipientCardName = recipientCardDocument.name;

    const creationDate = new Date(tradeDocument.securityCooldown._seconds * 1000 + tradeDocument.securityCooldown._nanoseconds / 1000000).toLocaleString();

    let tradeStatus = false;
    let tradeDate = null;

    if (tradeDocument.tradeConfirmation == false) {
        tradeStatus = 'Pending';
    } else {
        tradeStatus = 'Completed';
        tradeDate = new Date(tradeDocument.tradeDate._seconds * 1000 + tradeDocument.tradeDate._nanoseconds / 1000000).toLocaleString();
    }

    return { issuerNickname, issuerId, issuerCardId, issuerCardName, recipientNickname, recipientId, recipientCardId, recipientCardName, creationDate, tradeStatus, tradeDate };
}
