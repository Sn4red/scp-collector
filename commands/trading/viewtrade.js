const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const firebase = require('../../utils/firebase');

const database = firebase.firestore();

module.exports = {
    cooldown: 20,
    data: new SlashCommandBuilder()
        .setName('viewtrade')
        .setDescription('Displays the details of a trade.')
        .addStringOption(option =>
            option.setName('trade')
                .setDescription('Trade request ID to inquire about.')
                .setRequired(true)),
    async execute(interaction) {
        // * Notify the Discord API that the interaction was received successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply({ ephemeral: true });

        const userId = interaction.user.id;

        const userReference = database.collection('user').doc(userId);
        const userSnapshot = await userReference.get();

        // ! If the user is not registered, returns an error message.
        if (!userSnapshot.exists) {
            await interaction.editReply(`${process.env.EMOJI_ERROR}  You are not registered! Use /\`card\` to start playing.`);
            return;
        }

        // * Some extra validation is performed here, according to the Firestore's documents ID requirements.
        const tradeId = interaction.options.getString('trade');
        const tradeIdValidation = /^(?!\.\.?$)(?!.*__.*__)([^/]{1,1500})$/.test(tradeId);

        // ! If the field has wrong data, returns an error message.
        if (!tradeIdValidation) {
            await interaction.editReply(`${process.env.EMOJI_ERROR}  Error. Please, provide a valid trade ID.`);
            return;
        }

        const tradeReference = database.collection('trade').doc(tradeId);
        const tradeSnapshot = await tradeReference.get();

        // ! If the trade ID provided does not exist, returns an error message.
        if (!tradeSnapshot.exists) {
            await interaction.editReply(`${process.env.EMOJI_ERROR}  There is no trade with that ID!`);
            return;
        }

        /**
         * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
         * * The command passes all validations and the operation is performed. *
         * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
         */

        const tradeDocument = tradeSnapshot.data();

        const tradeObject = await formattingValues(tradeDocument);

        const issuerCardName = limitCardName(tradeObject.issuerCardName);
        const recipientCardName = limitCardName(tradeObject.recipientCardName);

        const tradeEmbed = new EmbedBuilder()
            .setColor(0x010101)
            .setTitle(`${process.env.EMOJI_PAGE}  Trade #: \`${tradeSnapshot.id}\``)
            .addFields(
                { name: `${process.env.EMOJI_USER}  Issuer`, value: `\`${tradeObject.issuerNickname}\` (\`${tradeObject.issuerId}\`)` },
                { name: `${tradeObject.issuerHolographicEmoji}  Card`, value: `\`${tradeObject.issuerCardId}\` // \`${issuerCardName}\`` },
                { name: `${process.env.EMOJI_USER}  Recipient`, value: `\`${tradeObject.recipientNickname}\` (\`${tradeObject.recipientId}\`)` },
                { name: `${tradeObject.recipientHolographicEmoji}  Card`, value: `\`${tradeObject.recipientCardId}\` // \`${recipientCardName}\`` },
                { name: `${process.env.EMOJI_BIT_CLOCK}  Creation Date`, value: `\`${tradeObject.creationDate}\`` },
                { name: `${process.env.EMOJI_PIN}  Status`, value: `**\`${tradeObject.tradeStatus}\`**  ${tradeObject.statusEmoji}` },
            )
            .setTimestamp();

        if (tradeObject.tradeDate != null) {
            tradeEmbed.addFields({ name: `${process.env.EMOJI_BIT_CLOCK}  Trade Date`, value: `\`${tradeObject.tradeDate}\`` });
        }

        await interaction.editReply({ embeds: [tradeEmbed] });
    },
};

// * This function formats the values of the trade document to be displayed in the embed.
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

    const holographicEmojis = {
        'Normal': `${process.env.EMOJI_NORMAL}`,
        'Emerald': `${process.env.EMOJI_EMERALD}`,
        'Golden': `${process.env.EMOJI_GOLDEN}`,
        'Diamond': `${process.env.EMOJI_DIAMOND}`,
    }; 

    const issuerHolographicEmoji = holographicEmojis[tradeDocument.issuerHolographic];
    const recipientHolographicEmoji = holographicEmojis[tradeDocument.recipientHolographic];

    const creationDate = new Date(tradeDocument.securityCooldown._seconds * 1000 + tradeDocument.securityCooldown._nanoseconds / 1000000).toLocaleString();

    let tradeStatus = false;
    let statusEmoji = null;
    let tradeDate = null;

    if (tradeDocument.tradeConfirmation == false) {
        tradeStatus = 'Pending';
        statusEmoji = `${process.env.EMOJI_PENDING_STATUS}`;
    } else {
        tradeStatus = 'Completed';
        statusEmoji = `${process.env.EMOJI_CHECK}`;
        tradeDate = new Date(tradeDocument.tradeDate._seconds * 1000 + tradeDocument.tradeDate._nanoseconds / 1000000).toLocaleString();
    }

    return { issuerNickname, issuerId, issuerCardId, issuerCardName, issuerHolographicEmoji, recipientNickname, recipientId, recipientCardId, recipientCardName, recipientHolographicEmoji, creationDate, tradeStatus, statusEmoji, tradeDate };
}

// * This function ensures that the card name with all the value field does not exceed the maximum character limit, which is 1024.
// * To make sure that no errors occur, and for a better visual, the card name will be cutted more than it should be (until 100).
function limitCardName(cardName) {
    let fixedCardName = cardName;

    if (fixedCardName.length <= 100) {
        return fixedCardName;
    }

    fixedCardName = fixedCardName.slice(0, 101);

    // * If the last character is not a space, it will be removed until it finds one,
    // * to avoid cutting a word in half.
    while (fixedCardName[fixedCardName.length - 1] !== ' ') {
        fixedCardName = fixedCardName.slice(0, -1);
    }

    // * The original card name is replaced by the new one with an ellipsis.
    fixedCardName = fixedCardName.slice(0, -1) + '...';

    return fixedCardName;
}
