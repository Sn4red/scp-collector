const {
    SlashCommandBuilder,
    MessageFlags,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ContainerBuilder,
 } = require('discord.js');
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
        // * Notify the Discord API that the interaction was received
        // * successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply({
            flags: [MessageFlags.Ephemeral],
        });

        const userId = interaction.user.id;

        const userReference = database.collection('user').doc(userId);
        const userSnapshot = await userReference.get();

        // ! If the user is not registered, returns an error message.
        if (!userSnapshot.exists) {
            const errorMessage = new TextDisplayBuilder()
                .setContent(
                    `${process.env.EMOJI_ERROR}  You are not registered! ` +
                        'Use /`card` to start playing.',
                );

            await interaction.editReply({
                components: [errorMessage],
                flags: [MessageFlags.IsComponentsV2],
            });
            return;
        }

        // * Some extra validation is performed here, according to the
        // * Firestore's documents ID requirements.
        const tradeId = interaction.options.getString('trade');
        const tradeIdValidation = /^(?!\.\.?$)(?!.*__.*__)([^/]{1,1500})$/
            .test(tradeId);

        // ! If the field has wrong data or enters the test trade ID, return an
        // ! error message.
        if (!tradeIdValidation || tradeId === 'testTradeDocument') {
            const errorMessage = new TextDisplayBuilder()
                .setContent(
                    `${process.env.EMOJI_ERROR}  Error. Please, provide a ` +
                        'valid trade ID.',
                );

            await interaction.editReply({
                components: [errorMessage],
                flags: [MessageFlags.IsComponentsV2],
            });
            return;
        }

        const tradeReference = database.collection('trade').doc(tradeId);
        const tradeSnapshot = await tradeReference.get();

        // ! If the trade ID provided does not exist, returns an error message.
        if (!tradeSnapshot.exists) {
            const errorMessage = new TextDisplayBuilder()
                .setContent(
                    `${process.env.EMOJI_ERROR}  There is no trade with that ` +
                        'ID!',
                );

            await interaction.editReply({
                components: [errorMessage],
                flags: [MessageFlags.IsComponentsV2],
            });
            return;
        }

        /**
         * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
         * * The command passes all validations and the operation is performed.*
         * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
         */

        const tradeDocument = tradeSnapshot.data();

        const tradeObject = await formattingValues(tradeDocument);

        const issuerCardName = limitCardName(tradeObject.issuerCardName);
        const recipientCardName = limitCardName(tradeObject.recipientCardName);

        // * The trade container is created.
        const tradeContainer = createTradeContainer(
            tradeSnapshot.id,
            tradeObject,
            issuerCardName,
            recipientCardName,
        );

        await interaction.editReply({
            components: [tradeContainer],
            flags: [MessageFlags.IsComponentsV2],
        });
    },
};

// * This function formats the values of the trade document to be displayed in
// * the container.
async function formattingValues(tradeDocument) {
    const issuerReference = database.collection('user')
        .doc(tradeDocument.issuer);
    const issuerSnapshot = await issuerReference.get();
    const issuerDocument = issuerSnapshot.data();
    const issuerNickname = issuerDocument.nickname;
    const issuerId = issuerSnapshot.id;

    const issuerCardReference = tradeDocument.issuerCard;
    const issuerCardSnapshot = await issuerCardReference.get();
    const issuerCardDocument = issuerCardSnapshot.data();
    const issuerCardId = issuerCardSnapshot.id;
    const issuerCardName = issuerCardDocument.name;

    const recipientReference = database.collection('user')
        .doc(tradeDocument.recipient);
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

    const issuerHolographicEmoji = holographicEmojis[
        tradeDocument.issuerHolographic
    ];
    const recipientHolographicEmoji = holographicEmojis[
        tradeDocument.recipientHolographic
    ];

    const creationDate = tradeDocument.securityCooldown.toDate()
        .toLocaleString();

    let tradeStatus = false;
    let statusEmoji = null;
    let tradeDate = null;

    if (tradeDocument.tradeConfirmation == false) {
        tradeStatus = 'Pending';
        statusEmoji = `${process.env.EMOJI_PENDING_STATUS}`;
    } else {
        tradeStatus = 'Completed';
        statusEmoji = `${process.env.EMOJI_CHECK}`;
        tradeDate = tradeDocument.tradeDate.toDate().toLocaleString();
    }

    return {
        issuerNickname,
        issuerId,
        issuerCardId,
        issuerCardName,
        issuerHolographicEmoji,
        recipientNickname,
        recipientId,
        recipientCardId,
        recipientCardName,
        recipientHolographicEmoji,
        creationDate,
        tradeStatus,
        statusEmoji,
        tradeDate,
    };
}

// * This function ensures that the card name with all the value field does not
// * exceed the maximum character limit, which is 1024.
// * To make sure that no errors occur, and for a better visual, the card name
// * will be cutted more than it should be (until 100).
function limitCardName(cardName) {
    let fixedCardName = cardName;

    if (fixedCardName.length <= 100) {
        return fixedCardName;
    }

    fixedCardName = fixedCardName.slice(0, 101);

    // * If the last character is not a space, it will be removed until it finds
    // * one, to avoid cutting a word in half.
    while (fixedCardName[fixedCardName.length - 1] !== ' ') {
        fixedCardName = fixedCardName.slice(0, -1);
    }

    // * The original card name is replaced by the new one with an ellipsis.
    fixedCardName = fixedCardName.slice(0, -1) + '...';

    return fixedCardName;
}

// * Creates the trade container with all the information.
function createTradeContainer(
    tradeId,
    tradeObject,
    issuerCardName,
    recipientCardName,
) {
    // * Header.
    const header = new TextDisplayBuilder()
        .setContent(
            `### ${process.env.EMOJI_PAGE}  Trade #: \`${tradeId}\``,
        );

    // * Separator.
    const separator = new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small);

    // * Issuer.
    const issuerText = new TextDisplayBuilder()
        .setContent(
            `**${process.env.EMOJI_USER}  Issuer**\n` +
                `\`${tradeObject.issuerNickname}\` ` +
                `(\`${tradeObject.issuerId}\`)`,
        );

    // * Issuer Card.
    const issuerCardText = new TextDisplayBuilder()
        .setContent(
            `**${tradeObject.issuerHolographicEmoji}  Card**\n` +
                `\`${tradeObject.issuerCardId}\` // \`${issuerCardName}\``,
        );

    // * Recipient.
    const recipientText = new TextDisplayBuilder()
        .setContent(
            `**${process.env.EMOJI_USER}  Recipient**\n` +
                `\`${tradeObject.recipientNickname}\` ` +
                `(\`${tradeObject.recipientId}\`)`,
        );

    // * Recipient Card.
    const recipientCardText = new TextDisplayBuilder()
        .setContent(
            `**${tradeObject.recipientHolographicEmoji}  Card**\n` +
                `\`${tradeObject.recipientCardId}\` // ` +
                `\`${recipientCardName}\``,
        );

    // * Creation Date.
    const creationDateText = new TextDisplayBuilder()
        .setContent(
            `**${process.env.EMOJI_BIT_CLOCK}  Creation Date**\n` +
                `\`${tradeObject.creationDate}\``,
        );

    // * Status.
    const statusText = new TextDisplayBuilder()
        .setContent(
            `**${process.env.EMOJI_PIN}  Status**\n` +
                `**\`${tradeObject.tradeStatus}\`**  ` +
                `${tradeObject.statusEmoji}`,
        );

    // * Container.
    const tradeContainer = new ContainerBuilder()
        .setAccentColor(0x010101)
        .addTextDisplayComponents(header)
        .addSeparatorComponents(separator)
        .addTextDisplayComponents(issuerText)
        .addTextDisplayComponents(issuerCardText)
        .addTextDisplayComponents(recipientText)
        .addTextDisplayComponents(recipientCardText)
        .addTextDisplayComponents(creationDateText)
        .addTextDisplayComponents(statusText);

    if (tradeObject.tradeConfirmation) {
        // * Trade Date.
        const tradeDateText = new TextDisplayBuilder()
            .setContent(
                `**${process.env.EMOJI_BIT_CLOCK}  Trade Date**\n` +
                    `\`${tradeObject.tradeDate}\``,
            );

        tradeContainer.addTextDisplayComponents(tradeDateText);
    }

    return tradeContainer;
}
