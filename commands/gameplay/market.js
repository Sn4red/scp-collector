// TODO: Falta implementar las X sobre las cartas cuando el usuario ya las haya comprado.

const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const Canvas = require('@napi-rs/canvas');
const firebase = require('../../utils/firebase');

const database = firebase.firestore();

module.exports = {
    cooldown: 60 * 5,
    data: new SlashCommandBuilder()
        .setName('market')
        .setDescription('A weekly market where you can purchase up to 5 cards using your points.'),
    async execute(interaction) {
        // * Notify the Discord API that the interaction was received successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply({ ephemeral: true });

        const userId = interaction.user.id;

        const userReference = database.collection('user').doc(userId);
        const userSnapshot = await userReference.get();

        // ! If the user is not registered, returns an error message.
        if (!userSnapshot.exists) {
            await interaction.reply({ content: '<a:error:1229592805710762128>  You are not registered! Use /`card` to start playing.', ephemeral: true });
            return;
        }

        const marketReference = database.collection('market').doc('market');
        const marketSnapshot = await marketReference.get();

        // ! If the market is not available, returns an error message.
        if (!marketSnapshot.exists) {
            await interaction.reply({ content: '<a:error:1229592805710762128>  The market is not available at the moment. Please, try again later.', ephemeral: true });
            return;
        }

        /**
          * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
          * * The command passes all validations and the operation is performed. *
          * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
          */

        const userDocument = userSnapshot.data();
        const marketDocument = marketSnapshot.data();

        const marketDocuments = [
            marketDocument.card1,
            marketDocument.card2,
            marketDocument.card3,
            marketDocument.card4,
            marketDocument.card5,
        ];

        console.time('Execution Time');
        const promises = [];

        // const card1Reference = marketDocument.card1;
        // const card1Snapshot = await card1Reference.get();
        // const pathSegment1 = card1Snapshot.ref.path.split('/');
        // const className1 = pathSegment1[1];

        // const card2Reference = marketDocument.card2;
        // const card2Snapshot = await card2Reference.get();
        // const pathSegment2 = card2Snapshot.ref.path.split('/');
        // const className2 = pathSegment2[1];

        // const card3Reference = marketDocument.card3;
        // const card3Snapshot = await card3Reference.get();
        // const pathSegment3 = card3Snapshot.ref.path.split('/');
        // const className3 = pathSegment3[1];

        // const card4Reference = marketDocument.card4;
        // const card4Snapshot = await card4Reference.get();
        // const pathSegment4 = card4Snapshot.ref.path.split('/');
        // const className4 = pathSegment4[1];

        // const card5Reference = marketDocument.card5;
        // const card5Snapshot = await card5Reference.get();
        // const pathSegment5 = card5Snapshot.ref.path.split('/');
        // const className5 = pathSegment5[1];

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

        console.timeEnd('Execution Time');

        // const cardIds = [
        //     card1Snapshot.id,
        //     card2Snapshot.id,
        //     card3Snapshot.id,
        //     card4Snapshot.id,
        //     card5Snapshot.id,
        // ];

        // const cardClasses = [
        //     className1,
        //     className2,
        //     className3,
        //     className4,
        //     className5,
        // ];

        // const cardNames = [
        //     card1Snapshot.data().name,
        //     card2Snapshot.data().name,
        //     card3Snapshot.data().name,
        //     card4Snapshot.data().name,
        //     card5Snapshot.data().name,
        // ];

        // * Uses the AttachmentBuilder class to process the file and be attached in the reply.
        const attachment = await displayMarket(userDocument.points, cardHolographics, cardIds, cardClasses, cardNames);

        await interaction.editReply({ files: [attachment] });
    },
};

// TODO 12-13-2024: Falta ver sobre el proceso para comprar una carta.

// * This function draws all the user's card and returns it as an attachment.
async function displayMarket(userPoints, cardHolographics, cardIds, cardClasses, cardNames) {
    // * Creates a canvas of 571x527 pixels and obtain its context.
    // * The context will be used to modify the canvas.
    const canvas = Canvas.createCanvas(571, 527);
    const context = canvas.getContext('2d');

    // * Loads the background image onto the canvas and uses its dimensions to stretch it. 
    const background = await Canvas.loadImage('./images/market/background-market.png');
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
    context.fillText(`POINTS: ${userPoints}`, canvas.width / 2, 40);

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

    for (let i = 0; i < cardIds.length; i++) {
        const cardId = cardIds[i];
        const cardClass = cardClasses[i];
        let cardName = cardNames[i];

        // * Displaying card texture.
        const card = await Canvas.loadImage(`./images/market/${cardHolographics[i].toLowerCase()}-card.png`);
        context.drawImage(card, cardPositions[i].x, cardPositions[i].y, 230, 260);

        // * Displaying card image.
        const cardImage = await Canvas.loadImage(`./images/scp/${cardId}.jpg`);
        context.drawImage(cardImage, cardImagesPositions[i].x, cardImagesPositions[i].y, 117, 86);

        // * Displaying card ID.
        context.font = 'bold 13px Roboto Condensed';
        context.fillStyle = '#000000';
        context.textAlign = 'start';
        context.fillText(cardId, cardIdPositions[i].x, cardIdPositions[i].y);

        // * Displaying card class.
        context.font = 'bold 9px Roboto Condensed';
        context.fillStyle = '#000000';
        context.textAlign = 'center';
        context.fillText(cardClass, cardClassesPositions[i].x, cardClassesPositions[i].y);

        // *  Displaying card name.
        const maxWidth = 119;
        const initialFontSize = 8;
        const textFitted = fitTextToWidth(context, cardName, maxWidth, initialFontSize);

        context.font = `bold ${textFitted.fontSize}px Roboto Condensed`;
        context.fillStyle = '#000000';
        context.textAlign = 'center';

        if (textFitted.splitName) {
            let textLength = cardName.length;
    
            // * If the card name has more than 75 characters, it will be replaced the rest with an ellipsis.
            if (textLength > 75) {
                cardName = cardName.slice(0, 76);
    
                // * If the last character is not a space, it will be removed until it finds one,
                // * to avoid cutting a word in half.
                while (cardName[cardName.length - 1] !== ' ') {
                    cardName = cardName.slice(0, -1);
                }
                
                // * The original card name is replaced by the new one with an ellipsis.
                cardName = cardName.slice(0, -1) + '...';
                textLength = cardName.length;
            }
    
            // * Getting the index where the card name will be split, taking the first half with a 60%.
            // * The number is rounded to avoid getting a decimal number.
            let splitIndex = Math.round(textLength * 0.6);
    
            // * If the split index is in the middle of a word, it will be moved to the left until it finds a space.
            while (cardName[splitIndex] !== ' ') {
                splitIndex--;
            }
    
            const firstHalf = cardName.slice(0, splitIndex);
            const secondHalf = cardName.slice(splitIndex + 1);
    
            context.fillText(firstHalf, cardNamesPositions[i].x, cardNamesPositions[i].y);
            context.fillText(secondHalf, cardNamesPositions[i].x, cardNamesPositions[i].y + 10);
        } else {
            context.fillText(cardName, cardNamesPositions[i].x, cardNamesPositions[i].y);
        }
    }

    // * Gray Label.
    context.fillStyle = 'rgba(87, 87, 87, 0.5)';
    context.fillRect(6, 460, 559, 40);

    // * Deadline.
    context.font = '16px Roboto Condensed';
    context.fillStyle = '#FFFFFF';
    context.textAlign = 'center';
    context.fillText('ENDS ON 2024/08/18 12:00 am GMT-4', canvas.width / 2, 485);

    return new AttachmentBuilder(await canvas.encode('png'), { name: 'market.png' });
}

// * This function adjusts the font size of the card's name to fit into the card properly.
// * If it is too long, it will just lower the font size to 6 (originally is 8) and tell
// * the function to split the name into two lines.
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
