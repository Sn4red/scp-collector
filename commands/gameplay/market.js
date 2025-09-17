const {
    SlashCommandBuilder,
    AttachmentBuilder,
    MessageFlags,
    TextDisplayBuilder,
} = require('discord.js');

const {
    cardClassPrices,
    cardHolographicPrices,
} = require('../../utils/foundationConfig');

const Canvas = require('@napi-rs/canvas');
const fetch = require('node-fetch');
const firebase = require('../../utils/firebase');
const moment = require('moment');

const database = firebase.firestore();

module.exports = {
    cooldown: 60 * 5,
    data: new SlashCommandBuilder()
        .setName('market')
        .setDescription(
            'A weekly market where you can purchase up to 5 cards using your ' +
                'crystals.',
        ),
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

        const marketReference = database.collection('market').doc('market');
        const marketSnapshot = await marketReference.get();

        // ! If the market is not available, returns an error message.
        if (!marketSnapshot.exists) {
            const errorMessage = new TextDisplayBuilder()
                .setContent(
                    `${process.env.EMOJI_ERROR}  The market is not available ` +
                        'at the moment. Please, try again later.',
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

        const userDocument = userSnapshot.data();
        const marketDocument = marketSnapshot.data();

        // * Gets the deadline of the market stored in timestamp format and
        // * formats it to a readable format.
        const deadline = moment.unix(marketDocument.deadline._seconds)
            .utcOffset('-05:00').format('YYYY/MM/DD hh:mm a [UTC-5]');

        const marketDocuments = [
            marketDocument.card1,
            marketDocument.card2,
            marketDocument.card3,
            marketDocument.card4,
            marketDocument.card5,
        ];

        const promises = [];

        for (const document of marketDocuments) {
            const cardReference = document;
            const cardSnapshot = cardReference.get();

            promises.push(cardSnapshot);
        }

        const cardSnapshots = await Promise.all(promises);
        
        const cardIds = [];
        const cardClasses = [];
        const cardNames = [];

        cardSnapshots.forEach((snapshot) => {
            // * Pushing the IDs.
            cardIds.push(snapshot.id);

            // * Pushing the classes.
            // * It splits the reference path in an array to get the class name
            // * of the card.
            const pathSegment = snapshot.ref.path.split('/');
            const className = pathSegment[1];

            cardClasses.push(className);

            // * Pushing the names.
            cardNames.push(snapshot.data().name);
        });

        const cardHolographics = [
            marketDocument.holographic1,
            marketDocument.holographic2,
            marketDocument.holographic3,
            marketDocument.holographic4,
            marketDocument.holographic5,
        ];

        const cardsPurchased = [
            userDocument.card1Purchased,
            userDocument.card2Purchased,
            userDocument.card3Purchased,
            userDocument.card4Purchased,
            userDocument.card5Purchased,
        ];

        // * Uses the AttachmentBuilder class to process the file and be
        // * attached in the reply.
        const attachment = await displayMarket(
            userDocument.crystals,
            cardHolographics,
            cardIds,
            cardClasses,
            cardNames,
            cardsPurchased,
            deadline,
        );

        await interaction.editReply({
            files: [attachment],
        });
    },
};

// * This function draws all the user's card and returns it as an attachment.
async function displayMarket(
    userCrystals,
    cardHolographics,
    cardIds,
    cardClasses,
    cardNames,
    cardsPurchased,
    deadline,
) {
    // * The numeric ID is extracted from the emoji ID to build the URL, which
    // * is then used in the canvas.
    const emojiCrystal = process.env.EMOJI_CRYSTAL;
    const emojiIdCrystal = emojiCrystal.match(/\d{15,}/g)[0];

    // * Creates a canvas of 571x527 pixels and obtain its context.
    // * The context will be used to modify the canvas.
    const canvas = Canvas.createCanvas(571, 527);
    const context = canvas.getContext('2d');

    // * Loads the background image onto the canvas and uses its dimensions to
    // * stretch it.
    const background = await Canvas.loadImage(
        './images/market/background-market.png',
    );
    context.drawImage(background, 0, 0, canvas.width, canvas.height);

    // * Market border.
    context.strokeStyle = '#000000';
    context.lineWidth = 11;
    context.strokeRect(0, 0, canvas.width, canvas.height);

    // * Market label.
    context.font = 'bold 18px Roboto Condensed';
    context.fillStyle = '#FF0000';
    context.fillText('[ MARKET ]', 43, 33);

    // * Header.
    context.font = 'bold 20px Roboto Condensed';
    context.fillStyle = '#FFFFFF';
    context.textAlign = 'center';
    context.fillText(
        `CRYSTALS: ${userCrystals}`,
        canvas.width / 2,
        33,
    );

    // * Card textures.
    const cardPositions = [
        { x: 11, y: 35 },
        { x: 171, y: 35 },
        { x: 331, y: 35 },
        { x: 91, y: 223 },
        { x: 251, y: 223 },
    ];

    const cardImagesPositions = [
        { x: 68, y: 110 },
        { x: 228, y: 110 },
        { x: 388, y: 110 },
        { x: 148, y: 298 },
        { x: 308, y: 298 },
    ];

    const cardIdPositions = [
        { x: 68, y: 100 },
        { x: 228, y: 100 },
        { x: 388, y: 100 },
        { x: 148, y: 288 },
        { x: 308, y: 288 },
    ];

    const cardClassesPositions = [
        { x: 126.5, y: 210 },
        { x: 286.5, y: 210 },
        { x: 446.5, y: 210 },
        { x: 206.5, y: 398 },
        { x: 366.5, y: 398 },
    ];

    const cardNamesPositions = [
        { x: 127, y: 225 },
        { x: 287, y: 225 },
        { x: 447, y: 225 },
        { x: 207, y: 413 },
        { x: 367, y: 413 },
    ];

    const crystalEmojisPositions = [
        { x: 102, y: 57 },
        { x: 262, y: 57 },
        { x: 422, y: 57 },
        { x: 182, y: 449 },
        { x: 342, y: 449 },
    ];

    const cardPricesPositions = [
        { x: 131, y: 68 },
        { x: 291, y: 68 },
        { x: 451, y: 68 },
        { x: 211, y: 460 },
        { x: 371, y: 460 },
    ];

    // * X textures for purchased cards.
    const xPositions = [
        {
            fstartx: 57,
            fstarty: 83,
            fendx: 196,
            fendy: 249,
            sstartx: 196,
            sstarty: 83,
            sendx: 57,
            sendy: 249,
        },
        {
            fstartx: 217,
            fstarty: 83,
            fendx: 356,
            fendy: 249,
            sstartx: 356,
            sstarty: 83,
            sendx: 217,
            sendy: 249,
        },
        {
            fstartx: 377,
            fstarty: 83,
            fendx: 516,
            fendy: 249,
            sstartx: 516,
            sstarty: 83,
            sendx: 377,
            sendy: 249,
        },
        {
            fstartx: 137,
            fstarty: 271,
            fendx: 276,
            fendy: 437,
            sstartx: 276,
            sstarty: 271,
            sendx: 137,
            sendy: 437,
        },
        {
            fstartx: 297,
            fstarty: 271,
            fendx: 436,
            fendy: 437,
            sstartx: 436,
            sstarty: 271,
            sendx: 297,
            sendy: 437,
        },
    ];

    // * Crystals emoji.
    const crystalEmoji = await loadEmoji(
        `https://cdn.discordapp.com/emojis/${emojiIdCrystal}`,
    );

    for (let i = 0; i < cardIds.length; i++) {
        const cardId = cardIds[i];
        const cardClass = cardClasses[i];
        let cardName = cardNames[i];
        const cardPrice = cardClassPrices[cardClass] +
            cardHolographicPrices[cardHolographics[i]];
        const cardPurchased = cardsPurchased[i];

        // * Displaying card texture.
        const card = await Canvas.loadImage(
            `./images/market/${cardHolographics[i].toLowerCase()}-card.png`,
        );
        context.drawImage(
            card,
            cardPositions[i].x,
            cardPositions[i].y,
            230,
            260,
        );

        // * Displaying card image.
        const cardImage = await Canvas.loadImage(`./images/scp/${cardId}.jpg`);
        context.drawImage(
            cardImage,
            cardImagesPositions[i].x,
            cardImagesPositions[i].y,
            117,
            86,
        );

        // * Displaying card ID.
        context.font = 'bold 13px Roboto Condensed';
        context.fillStyle = '#000000';
        context.textAlign = 'start';
        context.fillText(cardId, cardIdPositions[i].x, cardIdPositions[i].y);

        // * Displaying card class.
        context.font = 'bold 9px Roboto Condensed';
        context.fillStyle = '#000000';
        context.textAlign = 'center';
        context.fillText(
            cardClass,
            cardClassesPositions[i].x,
            cardClassesPositions[i].y,
        );

        // *  Displaying card name.
        const maxWidth = 119;
        const initialFontSize = 8;
        const textFitted = fitTextToWidth(
            context,
            cardName,
            maxWidth,
            initialFontSize,
        );

        context.font = `bold ${textFitted.fontSize}px Roboto Condensed`;
        context.fillStyle = '#000000';
        context.textAlign = 'center';

        if (textFitted.splitName) {
            let textLength = cardName.length;
    
            // * If the card name has more than 75 characters, it will be
            // * replaced the rest with an ellipsis.
            if (textLength > 75) {
                cardName = cardName.slice(0, 76);
    
                // * If the last character is not a space, it will be removed
                // * until it finds one, to avoid cutting a word in half.
                while (cardName[cardName.length - 1] !== ' ') {
                    cardName = cardName.slice(0, -1);
                }
                
                // * The original card name is replaced by the new one with an
                // * ellipsis.
                cardName = cardName.slice(0, -1) + '...';
                textLength = cardName.length;
            }
    
            // * Getting the index where the card name will be split, taking
            // * the first half with a 60%. The number is rounded to avoid
            // * getting a decimal number.
            let splitIndex = Math.round(textLength * 0.6);
    
            // * If the split index is in the middle of a word, it will be
            // * moved to the left until it finds a space.
            while (cardName[splitIndex] !== ' ') {
                splitIndex--;
            }
    
            const firstHalf = cardName.slice(0, splitIndex);
            const secondHalf = cardName.slice(splitIndex + 1);
    
            context.fillText(
                firstHalf,
                cardNamesPositions[i].x,
                cardNamesPositions[i].y,
            );
            context.fillText(
                secondHalf,
                cardNamesPositions[i].x,
                cardNamesPositions[i].y + 10,
            );
        } else {
            context.fillText(
                cardName,
                cardNamesPositions[i].x,
                cardNamesPositions[i].y,
            );
        }

        // * Displaying crystal emojis.
        context.drawImage(
            crystalEmoji,
            crystalEmojisPositions[i].x,
            crystalEmojisPositions[i].y,
            15,
            15,
        );

        // * Displaying card price.
        context.font = 'bold 10px Roboto Condensed';

        if (userCrystals < cardPrice || cardPurchased) {
            context.fillStyle = 'rgba(255, 255, 255, 0.4)';
        } else {
            context.fillStyle = '#FFFFFF';
        }

        context.fillText(cardPrice.toString(),
            cardPricesPositions[i].x,
            cardPricesPositions[i].y,
        );

        // * Displaying a red X if the card was purchased.
        context.lineWidth = 5;
        context.lineCap = 'round';
        context.strokeStyle = 'rgba(255, 0, 0, 0.6)';

        if (cardPurchased) {
            context.beginPath();
            context.moveTo(xPositions[i].fstartx, xPositions[i].fstarty);
            context.lineTo(xPositions[i].fendx, xPositions[i].fendy);
            context.stroke();

            context.beginPath();
            context.moveTo(xPositions[i].sstartx, xPositions[i].sstarty);
            context.lineTo(xPositions[i].sendx, xPositions[i].sendy);
            context.stroke();
        }
    }

    // * Gray Label.
    context.fillStyle = 'rgba(87, 87, 87, 0.5)';
    context.fillRect(6, 481, 559, 40);

    // * Deadline.
    context.font = '16px Roboto Condensed';
    context.fillStyle = '#FFFFFF';
    context.textAlign = 'center';
    context.fillText(`ENDS ON ${deadline}`, canvas.width / 2, 506);

    return new AttachmentBuilder(
        await canvas.encode('png'),
        { name: 'market.png' },
    );
}

// * This function adjusts the font size of the card's name to fit into the card
// * properly. If it is too long, it will just lower the font size to 6
// * (originally is 8) and tell the function to split the name into two lines.
function fitTextToWidth(context, name, maxWidth, initialFontSize) {
    let splitName = false;
    let fontSize = initialFontSize;
    context.font = `bold ${fontSize}px Roboto Condensed`;

    while (context.measureText(name).width > maxWidth) {
        if (fontSize === 6) {
            splitName = true;
            break;
        }

        fontSize--;
        context.font = `bold ${fontSize}px Roboto Condensed`;
    }

    return {
        fontSize,
        splitName,
    };
}

// * This function is to convert the emoji URL into an image, to be used in the
// * canvas.
async function loadEmoji(emojiUrl) {
    const response = await fetch(emojiUrl);
    const image = await Canvas.loadImage(await response.buffer());

    return image;
}
