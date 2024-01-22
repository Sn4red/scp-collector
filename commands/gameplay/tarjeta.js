const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const Canvas = require('@napi-rs/canvas');
const { request } = require('undici');
const firebase = require('../../utils/firebase');

const database = firebase.firestore();

module.exports = {
    cooldown: 300,
    data: new SlashCommandBuilder()
        .setName('tarjeta')
        .setDescription('Muestra tu tarjeta personal y el detalle de tu progreso.'),
    async execute(interaction) {
        // Notify the Discord API that the interaction was received successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply();

        // Database query is performed.
        const userReference = database.collection('usuario').doc(interaction.user.id);
        const userSnapshot = await userReference.get();

        // If the user exists, his data is updated, in this case the nickame (if it was changed manually).
        if (userSnapshot.exists) {
            await userReference.update({
                nick: interaction.user.username,
            });

            const document = userSnapshot.data();
            const userId = interaction.user.id;

            // Uses the AttachmentBuilder class to process the file and be able to attach it in the reply.
            const attachment = await displayCard(document, userId, interaction);

            await interaction.editReply({ files: [attachment] });
        } else {
            // If the user doesn't exist, a new document is created before displaying the card.

            // Formats the date in DD/MM/YYYY.
            const currentDate = new Date();

            const day = ('0' + currentDate.getDate()).slice(-2);
            const month = ('0' + (currentDate.getMonth() + 1)).slice(-2);
            const year = currentDate.getFullYear();

            const newUser = {
                capturasDiarias: 0,
                fecha: day + '/' + month + '/' + year,
                nick: interaction.user.username,
                nivel: 1,
                rango: 'Clase D',
                xp: 0,
            };

            await database.collection('usuario').doc(interaction.user.id).set(newUser);

            // Uses the AttachmentBuilder class to process the file and be attached in the reply.
            const attachment = await displayCard(newUser, interaction.user.id, interaction);

            await interaction.editReply({ files: [attachment] });
            await interaction.followUp('👋  ¡Usuario nuevo! Ya puedes usar los comandos para coleccionar cartas y demás.');
        }
    },
};

async function displayCard(document, userId, interaction) {
    // User data.
    const date = document.fecha;
    const id = userId;
    const nickname = document.nick;
    const level = document.nivel;
    const rank = document.rango;
    const xp = document.xp.toString();

    // Query to the database regarding the number of obtained SCPs.
    let SCPCount = 0;
    const obtentionReference = database.collection('obtencion');
    const obtentionSnapshot = await obtentionReference.where('usuario', '==', database.collection('usuario').doc(id)).get();

    if (obtentionSnapshot.empty) {
        SCPCount = 0;
    } else {
        SCPCount = obtentionSnapshot.size;
    }
    
    // Creates a canvas of 450x250 pixels and obtain its context.
    // The context will be used to modify the canvas.
    const canvas = Canvas.createCanvas(450, 250);
    const context = canvas.getContext('2d');
    
    // Loads the background image onto the canvas and uses its dimensions to stretch it. 
    const background = await Canvas.loadImage('./images/card/background-card.jpg');
    context.drawImage(background, 0, 0, canvas.width, canvas.height);
    
    // Card border.
    context.strokeStyle = '#000000';
    context.lineWidth = 10;
    context.strokeRect(0, 0, canvas.width, canvas.height);
    
    // User photo border.
    context.strokeStyle = '#FFFFFF';
    context.lineWidth = 5;
    context.strokeRect(25, 55, 100, 100);
    
    // Header
    context.font = 'bold 15px Roboto Condensed';
    context.fillStyle = '#FFFFFF';
    context.fillText('FUNDACIÓN SCP', 178, 28);
    
    // Code name.
    context.font = 'bold 16px Roboto Condensed';
    context.fillStyle = '#FFFFFF';
    context.fillText('Agente:', 145, 65);
    
    context.font = 'bold 14px Roboto Condensed';
    context.fillText(nickname, 202, 65);
    
    // Rank.
    context.font = 'bold 16px Roboto Condensed';
    context.fillStyle = '#FFFFFF';
    context.fillText('Rango:', 145, 91);
    
    context.font = 'bold 14px Roboto Condensed';
    context.fillText(rank, 197, 91);
    
    // Issuance date.
    context.font = 'bold 10px Roboto Condensed';
    context.fillStyle = '#FFFFFF';
    context.fillText('Fecha de emisión:', 145, 117);
    context.fillText(date, 220, 117);
    
    // Captured SCPs.
    context.font = 'bold 10px Roboto Condensed';
    context.fillStyle = '#FFFFFF';
    context.fillText('SCPs capturados:', 145, 132);
    context.fillText(SCPCount + '', 219, 132);
    
    // Classified label.
    context.font = '13px Roboto Condensed';
    context.fillStyle = '#FF0000';
    context.fillText('[ Clasificado ]', 41, 28);
    
    // User ID.
    context.font = 'bold 8px Roboto Condensed';
    context.fillStyle = '#FFFFFF';
    context.fillText(id, 367, 98);
    
    // User progress bar.
    context.fillStyle = '#1A1A1A';
    context.fillRect(22, 210, 406, 15);
    
    // User progress fill bar.
    const gradient = context.createLinearGradient(0, 213, 0, 222);
    gradient.addColorStop(0, '#AEE064');
    gradient.addColorStop(0.5, '#2E6C1F');
    context.fillStyle = gradient;
    
    // Progress filling according to the rank.
    const multiplicationFactors = {
        'Clase D': 8,
        'Oficial de Seguridad': 4,
        'Investigador': 1.6,
        'Especialista de Contención': 0.8,
        'Agente de Campo': 0.266,
        'Director de Sede': 0.08,
        'Miembro del Consejo O5': 0.04,
    };
    
    context.fillRect(25, 213, xp * multiplicationFactors[rank], 9);
    
    // User level.
    context.font = 'bold 10px Roboto Condensed';
    context.fillStyle = '#FFFFFF';
    context.fillText(`Nivel: ${level}`, 25, 203);
    
    // User XP.
    context.font = 'bold 10px Roboto Condensed';
    context.fillStyle = '#FFFFFF';
    
    const textWidth = context.measureText(xp).width;
    const xPosition = 22 + (406 - textWidth) / 2;
    
    context.fillText(xp + ' XP', xPosition, 203);
    
    // User's next level.
    context.font = 'bold 10px Roboto Condensed';
    context.fillStyle = '#FFFFFF';
    
    let nextLevel = level;
    nextLevel++;
    
    if (nextLevel == 21) {
        nextLevel = 'Rank Up!';
    }
        
    if (nextLevel.length > 2) {
        context.fillText(`Sgte. Nivel: ${nextLevel}`, 340, 203);
    } else {
        context.fillText(`Sgte. Nivel: ${nextLevel}`, 368, 203);
    }
    
    // Using undici to make HTTP request with better performance.
    // Loading the user's photo.
    const { body: avatarBody } = await request(interaction.user.displayAvatarURL({ extension: 'jpg' }));
    const avatar = await Canvas.loadImage(await avatarBody.arrayBuffer());
    
    // Loading the logo.
    const logo = await Canvas.loadImage('./images/card/scp-logo-card.png');
    
    // Loading the DataMatrix QR code.
    const qr = await Canvas.loadImage('./images/card/qr-datamatrix-card.png');
    
    // Dibuja las imágenes en el lienzo.
    context.drawImage(avatar, 25, 55, 100, 100);
    context.drawImage(logo, 307, 110, 70, 70);
    context.drawImage(qr, 365, 5, 80, 80);
    
    return new AttachmentBuilder(await canvas.encode('png'), { name: 'profile-image.png' });
}
