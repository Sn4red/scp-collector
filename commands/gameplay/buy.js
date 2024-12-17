// TODO 12-16-2024: ya no funciona usar returns dentro de los collectors, hay que usar la propuesta del Copilot, de usar throws
// TODO: para redirigir el flujo del programa.
// TODO: HAY QUE HACER LO MISMO CON LOS DEMÁS COMANDOS QUE USEN EL MISMO PATRÓN.

const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const path = require('node:path');
const firebase = require('../../utils/firebase');
const { Filter } = require('firebase-admin/firestore');

const database = firebase.firestore();

module.exports = {
    cooldown: 20,
    data: new SlashCommandBuilder()
        .setName('buy')
        .setDescription('Buys a card that is currently in the market, using your points.')
        .addStringOption(option =>
            option.setName('card')
                .setDescription('Card ID to buy.')
                .setRequired(true)),
    async execute(interaction) {
        // * Notify the Discord API that the interaction was received successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply({ ephemeral: true });

        const userId = interaction.user.id;

        const userReference = database.collection('user').doc(userId);
        let userSnapshot = await userReference.get();
        let userDocument = userSnapshot.data();

        // ! If the user is not registered, returns an error message.
        if (!userSnapshot.exists) {
            await interaction.editReply('<a:error:1229592805710762128>  You are not registered! Use /`card` to start playing.');
            return;
        }

        const cardId = interaction.options.getString('card');

        const fixedCardId = cardId.toUpperCase();
        const cardIdValidation = /^scp-\d{3,4}$/i.test(fixedCardId);

        // ! If the field has wrong data, returns an error message.
        if (!cardIdValidation) {
            await interaction.editReply('<a:error:1229592805710762128>  Invalid card ID format. Please use the following format: `SCP-XXXX`.');
            return;
        }

        const foundCardInMarket = await findCardInMarket(fixedCardId);

        // ! If the card is not found in the market, returns an error message.
        if (!foundCardInMarket.wasFound) {
            await interaction.editReply(`<a:error:1229592805710762128>  Card \`${fixedCardId}\` is not on the market!`);
            return;
        }

        const foundCardInformation = await findCardInformation(fixedCardId, foundCardInMarket.marketDocument, userDocument);

        // ! If the card has already been purchased, returns an error message.
        if (foundCardInformation.isAlreadyPurchased) {
            await interaction.editReply('<a:error:1229592805710762128>  You already bought this card!');
            return;
        }

        const cardReference = foundCardInformation.cardReference;
        const cardData = foundCardInformation.cardData;
        const cardClass = foundCardInformation.cardClass;
        const cardHolographic = foundCardInformation.cardHolographic;
        const holographicEmoji = getHolographicEmoji(cardHolographic);
        const points = getCardPoints(cardClass, cardHolographic);

        const buttonsRow = displayButtons();

        const reply = await interaction.editReply({
            content: `<a:stop:1243398806402240582>  Are you sure you want to buy ${holographicEmoji} \`${fixedCardId}\` (${cardClass}) for <a:point:1273453430190375043> **${points}**?`,
            components: [buttonsRow],
        });

        const collectorFilter = (userInteraction) => userInteraction.user.id === userId;
        const time = 1000 * 30;

        const collector = reply.createMessageComponentCollector({ componentType: ComponentType.Button, filter: collectorFilter, time: time });

        let deletedMessage = false;

        // * The return statements are used to get out of the collector event.
        collector.on('collect', async (button) => {
            if (button.customId === 'confirm') {
                deletedMessage = true;

                try {
                    await database.runTransaction(async (transaction) => {
                        userSnapshot = await transaction.get(userReference);
                        userDocument = userSnapshot.data();

                        // ! If the user doesn't have enough points, returns an error message.
                        if (userDocument.points < points) {
                            await interaction.followUp({ content: '<a:error:1229592805710762128>  You don\'t have enough points to buy this card!', ephemeral: true });
                            await interaction.deleteReply();

                            return;
                        }

                         /**
                          * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
                          * * The command passes all validations and the operation is performed. *
                          * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
                          */

                        const obtainingEntry = database.collection('user').doc(userSnapshot.id).collection('obtaining').doc();

                        await transaction.set(obtainingEntry, {
                            card: cardReference,
                            holographic: cardHolographic,
                        });

                        await updateUser(userReference, points, fixedCardId, foundCardInMarket.marketDocument, transaction);
                    });

                    console.log('igual paso por aca carajo');

                    const imagePath = path.join(__dirname, `../../images/scp/${fixedCardId}.jpg`);
                    const image = new AttachmentBuilder(imagePath);

                    const cardEmbed = new EmbedBuilder()
                        .setTitle(`${holographicEmoji} Item #: \`${fixedCardId}\` // \`${cardData.name}\``)
                        .addFields(
                            { name: '<:invader:1228919814555177021>  Class', value: `\`${cardClass}\``, inline: true },
                            { name: '<:files:1228920361723236412>  File', value: `**[View Document](${cardData.file})**`, inline: true },
                        )
                        .setImage(`attachment://${fixedCardId}.jpg`)
                        .setTimestamp();

                    await interaction.followUp({
                        embeds: [cardEmbed],
                        files: [image],
                        ephemeral: true,
                    });

                    await interaction.deleteReply();
                } catch (error) {
                    console.log(`${new Date()} >>> *** ERROR: buy.js *** by ${userId} (${interaction.user.username})`);
                    console.error(error);

                    await interaction.followUp({ content: '<a:error:1229592805710762128>  An error has occurred while trying to buy a card. Please try again.', ephemeral: true });
                }
            }

            if (button.customId === 'cancel') {
                deletedMessage = true;

                await interaction.deleteReply();
            }
        });

        collector.on('end', async () => {
            // * Only the message is deleted through here if the user doesn't reply in the indicated time.
            if (!deletedMessage) {
                await interaction.deleteReply();
            }
        });
    },
};

// * This function validates if the card in question is in the market.
async function findCardInMarket(cardId) {
    const marketReference = database.collection('market');
    const marketQuery = marketReference.where(
        Filter.or(
            Filter.where('card1Id', '==', cardId),
            Filter.where('card2Id', '==', cardId),
            Filter.where('card3Id', '==', cardId),
            Filter.where('card4Id', '==', cardId),
            Filter.where('card5Id', '==', cardId),
        ),
    );
    const marketSnapshot = await marketQuery.get();

    if (marketSnapshot.empty) {
        return { wasFound: false };
    } else {
        return { wasFound: true, marketDocument: marketSnapshot.docs[0].data() };
    }
}

// * This function retrieves the card information from the database, based on the card ID.
// * It also checks if the user has already purchased the card, taking advantage of the
// * operation of the same switch.
async function findCardInformation(cardId, marketDocument, userDocument) {
    let cardSnapshot = null;
    let cardData = null;
    let cardHolographic = null;
    let isAlreadyPurchased = false;

    switch (cardId) {
        case marketDocument.card1Id:
            cardSnapshot = await marketDocument.card1.get();
            cardData = cardSnapshot.data();
            cardHolographic = marketDocument.holographic1;

            if (userDocument.card1Purchased) {
                isAlreadyPurchased = true;
            }

            break;
        case marketDocument.card2Id:
            cardSnapshot = await marketDocument.card2.get();
            cardData = cardSnapshot.data();
            cardHolographic = marketDocument.holographic2;

            if (userDocument.card2Purchased) {
                isAlreadyPurchased = true;
            }

            break;
        case marketDocument.card3Id:
            cardSnapshot = await marketDocument.card3.get();
            cardData = cardSnapshot.data();
            cardHolographic = marketDocument.holographic3;

            if (userDocument.card3Purchased) {
                isAlreadyPurchased = true;
            }
            
            break;
        case marketDocument.card4Id:
            cardSnapshot = await marketDocument.card4.get();
            cardData = cardSnapshot.data();
            cardHolographic = marketDocument.holographic4;

            if (userDocument.card4Purchased) {
                isAlreadyPurchased = true;
            }
            
            break;
        case marketDocument.card5Id:
            cardSnapshot = await marketDocument.card5.get();
            cardData = cardSnapshot.data();
            cardHolographic = marketDocument.holographic5;

            if (userDocument.card5Purchased) {
                isAlreadyPurchased = true;
            }
            
            break;
    }

    const pathSegments = cardSnapshot.ref.path.split('/');
    const cardClass = pathSegments[1];

    return { cardReference: cardSnapshot.ref, cardData: cardData, cardClass: cardClass, cardHolographic: cardHolographic, isAlreadyPurchased: isAlreadyPurchased };
}

// * This function returns the holographic emoji based on the holographic type.
function getHolographicEmoji(cardHolographic) {
    switch (cardHolographic) {
        case 'Emerald':
            return '<a:emerald:1228923470239367238>';
        case 'Golden':
            return '<a:golden:1228925086690443345>';
        case 'Diamond':
            return '<a:diamond:1228924014479671439>';
        default:
            return '';
    }
}

// * This function calculates the cost of the card based on the class and holographic (if any).
function getCardPoints(cardClass, cardHolographic) {
    let points = 0;

    switch (cardClass) {
        case 'Safe':
            points = 1000;
            break;
        case 'Euclid':
            points = 2000;
            break;
        case 'Keter':
            points = 3000;
            break;
        case 'Thaumiel':
            points = 5000;
            break;
        case 'Apollyon':
            points = 10000;
            break;
    }

    switch (cardHolographic) {
        case 'Emerald':
            points += 200;
            break;
        case 'Golden':
            points += 300;
            break;
        case 'Diamond':
            points += 500;
            break;
    }

    return points;
}

// * This function displays the 'confirm' and 'cancel' buttons.
function displayButtons() {
    const confirmButton = new ButtonBuilder()
        .setCustomId('confirm')
        .setLabel('Confirm')
        .setStyle(ButtonStyle.Danger);
    
    const cancelButton = new ButtonBuilder()
        .setCustomId('cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder();

    row.addComponents(cancelButton, confirmButton);

    return row;
}

async function updateUser(userReference, points, cardId, marketDocument, transaction) {
    const changeObject = {};

    switch (cardId) {
        case marketDocument.card1Id:
            changeObject.points = firebase.firestore.FieldValue.increment(-points);
            changeObject.card1Purchased = true;

            break;
        case marketDocument.card2Id:
            changeObject.points = firebase.firestore.FieldValue.increment(-points);
            changeObject.card2Purchased = true;

            break;
        case marketDocument.card3Id:
            changeObject.points = firebase.firestore.FieldValue.increment(-points);
            changeObject.card3Purchased = true;

            break;
        case marketDocument.card4Id:
            changeObject.points = firebase.firestore.FieldValue.increment(-points);
            changeObject.card4Purchased = true;
                    
            break;
        case marketDocument.card5Id:
            changeObject.points = firebase.firestore.FieldValue.increment(-points);
            changeObject.card5Purchased = true;
                        
            break;
    }

    await transaction.update(userReference, changeObject);
}
