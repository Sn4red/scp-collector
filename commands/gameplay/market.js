const {
    SlashCommandBuilder,
    AttachmentBuilder,
    MessageFlags,
    TextDisplayBuilder } = require('discord.js');
const Canvas = require('@napi-rs/canvas');
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

        // * Uses the AttachmentBuilder class to process the file and be
        // * attached in the reply.
        const attachment = await displayMarket(
            userDocument,
            cardHolographics,
            cardIds,
            cardClasses,
            cardNames,
            deadline,
        );

        await interaction.editReply({
            files: [attachment],
        });
    },
};

// * This function draws all the user's card and returns it as an attachment.
async function displayMarket(
    userDocument,
    cardHolographics,
    cardIds,
    cardClasses,
    cardNames,
    deadline,
) {
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
    context.fillText('[ MARKET ]', 43, 40);

    // * Header.
    context.font = 'bold 20px Roboto Condensed';
    context.fillStyle = '#FFFFFF';
    context.textAlign = 'center';
    context.fillText(
        `CRYSTALS: ${userDocument.crystals}`,
        canvas.width / 2,
        40,
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

    const firstXPositions = {
        'firstLineMoveToX': 57,
        'firstLineMoveToY': 83,
        'firstLineLineToX': 196,
        'firstLineLineToY': 249,
        'secondLineMoveToX': 196,
        'secondLineMoveToY': 83,
        'secondLineLineToX': 57,
        'secondLineLineToY': 249,
    };

    const secondXPositions = {
        'firstLineMoveToX': 217,
        'firstLineMoveToY': 83,
        'firstLineLineToX': 356,
        'firstLineLineToY': 249,
        'secondLineMoveToX': 356,
        'secondLineMoveToY': 83,
        'secondLineLineToX': 217,
        'secondLineLineToY': 249,
    };

    const thirdXPositions = {
        'firstLineMoveToX': 377,
        'firstLineMoveToY': 83,
        'firstLineLineToX': 516,
        'firstLineLineToY': 249,
        'secondLineMoveToX': 516,
        'secondLineMoveToY': 83,
        'secondLineLineToX': 377,
        'secondLineLineToY': 249,
    };

    const fourthXPositions = {
        'firstLineMoveToX': 137,
        'firstLineMoveToY': 271,
        'firstLineLineToX': 276,
        'firstLineLineToY': 437,
        'secondLineMoveToX': 276,
        'secondLineMoveToY': 271,
        'secondLineLineToX': 137,
        'secondLineLineToY': 437,
    };

    const fifthXPositions = {
        'firstLineMoveToX': 297,
        'firstLineMoveToY': 271,
        'firstLineLineToX': 436,
        'firstLineLineToY': 437,
        'secondLineMoveToX': 436,
        'secondLineMoveToY': 271,
        'secondLineLineToX': 297,
        'secondLineLineToY': 437,
    };

    for (let i = 0; i < cardIds.length; i++) {
        const cardId = cardIds[i];
        const cardClass = cardClasses[i];
        let cardName = cardNames[i];

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
    }

    context.lineWidth = 5;
    context.lineCap = 'round';
    context.strokeStyle = 'rgba(255, 0, 0, 0.6';

    if (userDocument.card1Purchased) {
        context.beginPath();
        context.moveTo(
            firstXPositions.firstLineMoveToX,
            firstXPositions.firstLineMoveToY,
        );
        context.lineTo(
            firstXPositions.firstLineLineToX,
            firstXPositions.firstLineLineToY,
        );
        context.stroke();

        context.beginPath();
        context.moveTo(
            firstXPositions.secondLineMoveToX,
            firstXPositions.secondLineMoveToY,
        );
        context.lineTo(
            firstXPositions.secondLineLineToX,
            firstXPositions.secondLineLineToY,
        );
        context.stroke();
    }

    if (userDocument.card2Purchased) {
        context.beginPath();
        context.moveTo(
            secondXPositions.firstLineMoveToX,
            secondXPositions.firstLineMoveToY,
        );
        context.lineTo(
            secondXPositions.firstLineLineToX,
            secondXPositions.firstLineLineToY,
        );
        context.stroke();

        context.beginPath();
        context.moveTo(
            secondXPositions.secondLineMoveToX,
            secondXPositions.secondLineMoveToY,
        );
        context.lineTo(
            secondXPositions.secondLineLineToX,
            secondXPositions.secondLineLineToY,
        );
        context.stroke();
    }

    if (userDocument.card3Purchased) {
        context.beginPath();
        context.moveTo(
            thirdXPositions.firstLineMoveToX,
            thirdXPositions.firstLineMoveToY,
        );
        context.lineTo(
            thirdXPositions.firstLineLineToX,
            thirdXPositions.firstLineLineToY,
        );
        context.stroke();

        context.beginPath();
        context.moveTo(
            thirdXPositions.secondLineMoveToX,
            thirdXPositions.secondLineMoveToY,
        );
        context.lineTo(
            thirdXPositions.secondLineLineToX,
            thirdXPositions.secondLineLineToY,
        );
        context.stroke();
    }

    if (userDocument.card4Purchased) {
        context.beginPath();
        context.moveTo(
            fourthXPositions.firstLineMoveToX,
            fourthXPositions.firstLineMoveToY,
        );
        context.lineTo(
            fourthXPositions.firstLineLineToX,
            fourthXPositions.firstLineLineToY,
        );
        context.stroke();

        context.beginPath();
        context.moveTo(
            fourthXPositions.secondLineMoveToX,
            fourthXPositions.secondLineMoveToY,
        );
        context.lineTo(
            fourthXPositions.secondLineLineToX,
            fourthXPositions.secondLineLineToY,
        );
        context.stroke();
    }

    if (userDocument.card5Purchased) {
        context.beginPath();
        context.moveTo(
            fifthXPositions.firstLineMoveToX,
            fifthXPositions.firstLineMoveToY,
        );
        context.lineTo(
            fifthXPositions.firstLineLineToX,
            fifthXPositions.firstLineLineToY,
        );
        context.stroke();

        context.beginPath();
        context.moveTo(
            fifthXPositions.secondLineMoveToX,
            fifthXPositions.secondLineMoveToY,
        );
        context.lineTo(
            fifthXPositions.secondLineLineToX,
            fifthXPositions.secondLineLineToY,
        );
        context.stroke();
    }

    // * Gray Label.
    context.fillStyle = 'rgba(87, 87, 87, 0.5)';
    context.fillRect(6, 460, 559, 40);

    // * Deadline.
    context.font = '16px Roboto Condensed';
    context.fillStyle = '#FFFFFF';
    context.textAlign = 'center';
    context.fillText(`ENDS ON ${deadline}`, canvas.width / 2, 485);

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

    return { fontSize, splitName };
}
