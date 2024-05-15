/**
 * * - Considerar mejorar el sello de Premium para la carta del usuario. Darle un toque brillante.
 */

const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const Canvas = require('@napi-rs/canvas');
const fetch = require('node-fetch');
const { request } = require('undici');
const firebase = require('../../utils/firebase');

const database = firebase.firestore();

module.exports = {
    cooldown: 60 * 7,
    data: new SlashCommandBuilder()
        .setName('card')
        .setDescription('Displays your personal card and progress details.'),
    async execute(interaction) {
        // * Notify the Discord API that the interaction was received successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply();

        // * Database query is performed.
        const userReference = database.collection('user').doc(interaction.user.id);
        const userSnapshot = await userReference.get();

        // * If the user exists, the data is updated, in this case the nickame (if it was changed manually).
        if (userSnapshot.exists) {
            const document = userSnapshot.data();

            if (document.nickname !== interaction.user.username) {
                await userReference.update({
                    nickname: interaction.user.username,
                });
            }

            document.nickname = interaction.user.username;

            // * Uses the AttachmentBuilder class to process the file and be able to attach it in the reply.
            const attachment = await displayCard(document, userSnapshot.id, interaction);

            await interaction.editReply({ files: [attachment] });
        } else {
            // * If the user doesn't exist, a new document is created before displaying the card.

            // * Formats the date in YYYY/MM/DD.
            const currentDate = new Date();

            const year = currentDate.getFullYear();
            const month = ('0' + (currentDate.getMonth() + 1)).slice(-2);
            const day = ('0' + currentDate.getDate()).slice(-2);

            const newUser = {
                acceptTradeOffers: true,
                dailyAttemptsRemaining: 5,
                issueDate: year + '/' + month + '/' + day,
                level: 1,
                nickname: interaction.user.username,
                premium: false,
                rank: 'Class D',
                xp: 0,
            };

            await database.collection('user').doc(interaction.user.id).set(newUser);

            // * Uses the AttachmentBuilder class to process the file and be attached in the reply.
            const attachment = await displayCard(newUser, interaction.user.id, interaction);

            await interaction.editReply({ files: [attachment] });
            await interaction.followUp('<a:waving_hand:1229639454302670869>  New user! You can now use commands to collect cards and more.');
        }
    },
};

async function displayCard(document, userId, interaction) {
    // * User data.
    const issueDate = document.issueDate;
    const id = userId;
    const nickname = document.nickname;
    const level = document.level;
    const rank = document.rank;
    const xp = document.xp.toString();

    // * Aggregation query to the database counting the number of obtained SCPs.
    const obtainingReference = database.collection('user').doc(id).collection('obtaining');
    const obtainingSnapshot = await obtainingReference.count().get();

    const SCPCount = obtainingSnapshot.data().count;
    
    // * Creates a canvas of 450x250 pixels and obtain its context.
    // * The context will be used to modify the canvas.
    const canvas = Canvas.createCanvas(450, 250);
    const context = canvas.getContext('2d');
    
    // * Loads the background image onto the canvas and uses its dimensions to stretch it. 
    const background = await Canvas.loadImage('./images/card/background-card.jpg');
    context.drawImage(background, 0, 0, canvas.width, canvas.height);
    
    // * Card border.
    context.strokeStyle = '#000000';
    context.lineWidth = 10;
    context.strokeRect(0, 0, canvas.width, canvas.height);
    
    // * User photo border.
    context.strokeStyle = '#FFFFFF';
    context.lineWidth = 5;
    context.strokeRect(25, 55, 100, 100);
    
    // * Header
    context.font = 'bold 15px Roboto Condensed';
    context.fillStyle = '#FFFFFF';
    context.fillText('SCP FOUNDATION', 175, 28);
    
    // * Code name.
    context.font = 'bold 16px Roboto Condensed';
    context.fillStyle = '#FFFFFF';
    context.fillText('Agent:', 145, 65);
    
    context.font = 'bold 14px Roboto Condensed';
    context.fillText(nickname, 194, 65);
    
    // * Rank.
    context.font = 'bold 16px Roboto Condensed';
    context.fillStyle = '#FFFFFF';
    context.fillText('Rank:', 145, 91);
    
    context.font = 'bold 14px Roboto Condensed';
    context.fillText(rank, 188, 91);

    let emojiImage = null;

    switch (rank) {
        case 'Class D':
            emojiImage = await loadEmoji('https://cdn.discordapp.com/emojis/1230353704972976128');
            break;
        case 'Security Officer':
            emojiImage = await loadEmoji('https://cdn.discordapp.com/emojis/1230354487559061504');
            break;
        case 'Investigator':
            emojiImage = await loadEmoji('https://cdn.discordapp.com/emojis/1230354913780039793');
            break;
        case 'Containment Specialist':
            emojiImage = await loadEmoji('https://cdn.discordapp.com/emojis/1230355217607037040');
            break;
        case 'Field Agent':
            emojiImage = await loadEmoji('https://cdn.discordapp.com/emojis/1230356442913968128');
            break;
        case 'Site Director':
            emojiImage = await loadEmoji('https://cdn.discordapp.com/emojis/1230357575644479539');
            break;
        case 'O5 Council Member':
            emojiImage = await loadEmoji('https://cdn.discordapp.com/emojis/1230357613049286797');
            break;
    }

    // * This section is used to calculate the position of the emoji according to the rank, and give it a margin.
    const rankTextWidth = context.measureText(rank).width;
    const emojiX = 188 + rankTextWidth + 10;

    context.drawImage(emojiImage, emojiX, 91 - 17, 20, 20);
    
    // * Issue date.
    context.font = 'bold 10px Roboto Condensed';
    context.fillStyle = '#FFFFFF';
    context.fillText('Issue Date:', 145, 117);
    context.fillText(issueDate, 195, 117);
    
    // * Captured SCPs.
    context.font = 'bold 10px Roboto Condensed';
    context.fillStyle = '#FFFFFF';
    context.fillText('Captured SCPs:', 145, 132);
    context.fillText(SCPCount + '', 212, 132);
    
    // * Classified label.
    context.font = '13px Roboto Condensed';
    context.fillStyle = '#FF0000';
    context.fillText('[ Classified ]', 43, 28);
    
    // * User ID.
    context.font = 'bold 8px Roboto Condensed';
    context.fillStyle = '#FFFFFF';
    context.fillText(id, 367, 98);
    
    // * User progress bar.
    context.fillStyle = '#1A1A1A';
    context.fillRect(22, 210, 406, 15);
    
    // * User progress fill bar.
    const gradient = context.createLinearGradient(0, 213, 0, 222);
    gradient.addColorStop(0, '#AEE064');
    gradient.addColorStop(0.5, '#2E6C1F');
    context.fillStyle = gradient;
    
    // * Progress filling according to the rank.
    const multiplicationFactors = {
        'Class D': 8,
        'Security Officer': 4,
        'Investigator': 1.6,
        'Containment Specialist': 0.8,
        'Field Agent': 0.266,
        'Site Director': 0.08,
        'O5 Council Member': 0.04,
    };
    
    context.fillRect(25, 213, xp * multiplicationFactors[rank], 9);
    
    // * User level.
    context.font = 'bold 10px Roboto Condensed';
    context.fillStyle = '#FFFFFF';
    context.fillText(`Level: ${level}`, 25, 203);
    
    // * User XP.
    context.font = 'bold 10px Roboto Condensed';
    context.fillStyle = '#FFFFFF';
    
    const textWidth = context.measureText(xp).width;
    const xPosition = 22 + (406 - textWidth) / 2;
    
    context.fillText(xp + ' XP', xPosition, 203);
    
    // * User's next level.
    context.font = 'bold 10px Roboto Condensed';
    context.fillStyle = '#FFFFFF';
    
    let nextLevel = level;
    nextLevel++;
    
    if (rank !== 'O5 Council Member') {
        if (nextLevel === 501) {
            nextLevel = 'Rank Up!';
        }
    }

    if (nextLevel === 'Rank Up!') {
        context.fillText(`Next Level: ${nextLevel}`, 341, 203);
    } else if (nextLevel.toString().length > 3) {
        context.fillText(`Next Level: ${nextLevel}`, 355, 203);
    } else if (nextLevel.toString().length > 2) {
        context.fillText(`Next Level: ${nextLevel}`, 364, 203);
    } else {
        context.fillText(`Next Level: ${nextLevel}`, 369, 203);
    }
    
    // * Using undici to make HTTP request with better performance.
    // * Loading the user's photo.
    const { body: avatarBody } = await request(interaction.user.displayAvatarURL({ extension: 'jpg' }));
    const avatar = await Canvas.loadImage(await avatarBody.arrayBuffer());
    
    // * Loading the logo.
    let logo = null;

    if (document.premium === true) {
        logo = await Canvas.loadImage('./images/card/scp-premium-logo-card.png');
    } else {
        logo = await Canvas.loadImage('./images/card/scp-normal-logo-card.png');
    }
    
    // * Loading the DataMatrix QR code.
    const qr = await Canvas.loadImage('./images/card/qr-datamatrix-card.png');
    
    // * Dibuja las imágenes en el lienzo.
    context.drawImage(avatar, 25, 55, 100, 100);
    context.drawImage(logo, 280, 120, 70, 70);
    context.drawImage(qr, 365, 5, 80, 80);
    
    return new AttachmentBuilder(await canvas.encode('png'), { name: 'profile-image.png' });
}

// * This function is to convert the emoji URL into an image, to be used in the canvas.
async function loadEmoji(emojiUrl) {
    const response = await fetch(emojiUrl);
    const image = await Canvas.loadImage(await response.buffer());

    return image;
}
