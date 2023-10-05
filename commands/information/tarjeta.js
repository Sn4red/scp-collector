/*
    Implementaciones pendientes:

    - El valor de los SCP's capturados. Esto lo implementaré cuando añada
    la colección donde se almacene el historial de los SCP's obtenidos,
    donde se pueda acumular el valor y mostrarlo en la tarjeta.
*/

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
        // Se realiza la consulta a la base de datos.
        const query = database.collection('usuario').where(firebase.firestore.FieldPath.documentId(), '==', interaction.user.id);
        const snapshot = await query.get();

        if (!snapshot.empty) {
            const document = snapshot.docs[0];
            const jugador = document.data();

            // Datos del jugador.
            const fecha = jugador.fecha;
            const id = document.id;
            const nick = jugador.nick;
            const nivel = jugador.nivel;
            const rango = jugador.rango;
            const xp = jugador.xp.toString();

            // Crea un lienzo de 450x250 píxeles y obtiene su contexto.
            // El contexto será usado para poder modificar el lienzo.
            const canvas = Canvas.createCanvas(450, 250);
            const context = canvas.getContext('2d');

            // Carga la imagen de fondo al lienzo y usa las dimensiones de esta para estirarlo.
            const background = await Canvas.loadImage('./images/tarjeta/background-card.jpg');
            context.drawImage(background, 0, 0, canvas.width, canvas.height);

            // Borde de la tarjeta.
            context.strokeStyle = '#000000';
            context.lineWidth = 10;
            context.strokeRect(0, 0, canvas.width, canvas.height);
        
            // Borde de la foto del jugador.
            context.strokeStyle = '#FFFFFF';
            context.lineWidth = 5;
            context.strokeRect(25, 55, 100, 100);

            // Encabezado.
            context.font = 'bold 15px Roboto Condensed';
            context.fillStyle = '#FFFFFF';
            context.fillText('FUNDACIÓN SCP', 178, 28);

            // Nombre en clave.
            context.font = 'bold 16px Roboto Condensed';
            context.fillStyle = '#FFFFFF';
            context.fillText('Agente:', 145, 65);

            context.font = 'bold 14px Roboto Condensed';
            context.fillText(nick, 202, 65);
        
            // Rango.
            context.font = 'bold 16px Roboto Condensed';
            context.fillStyle = '#FFFFFF';
            context.fillText('Rango:', 145, 91);

            context.font = 'bold 14px Roboto Condensed';
            context.fillText(rango, 197, 91);

            // Fecha de emisión.
            context.font = 'bold 10px Roboto Condensed';
            context.fillStyle = '#FFFFFF';
            context.fillText('Fecha de emisión:', 145, 117);
            context.fillText(fecha, 220, 117);

            // SCP's capturados.
            context.font = 'bold 10px Roboto Condensed';
            context.fillStyle = '#FFFFFF';
            context.fillText('SCP\'s capturados:', 145, 132);
            context.fillText('0', 220, 132);

            // Etiqueta de clasificado.
            context.font = '13px Roboto Condensed';
            context.fillStyle = '#FF0000';
            context.fillText('[ Clasificado ]', 41, 28);

            // ID del jugador.
            context.font = 'bold 8px Roboto Condensed';
            context.fillStyle = '#FFFFFF';
            context.fillText(id, 367, 98);

            // Barra de progreso del jugador.
            context.fillStyle = '#1A1A1A';
            context.fillRect(22, 210, 406, 15);

            // Barra de llenado de progreso del jugador.
            const gradient = context.createLinearGradient(0, 213, 0, 222);
            gradient.addColorStop(0, '#AEE064');
            gradient.addColorStop(0.5, '#2E6C1F');
            context.fillStyle = gradient;

            // Llenado del progreso según el rango.
            const factoresMultiplicacion = {
                'Clase D': 8,
                'Oficial de Seguridad': 4,
                'Investigador': 1.6,
                'Especialista de Contención': 0.8,
                'Agente de Campo': 0.266,
                'Director de Sede': 0.08,
                'Miembro del Consejo O5': 0.04,
            };

            context.fillRect(25, 213, xp * factoresMultiplicacion[rango], 9);

            // Nivel del jugador.
            context.font = 'bold 10px Roboto Condensed';
            context.fillStyle = '#FFFFFF';
            context.fillText(`Nivel: ${nivel}`, 25, 203);

            // XP del jugador.
            context.font = 'bold 10px Roboto Condensed';
            context.fillStyle = '#FFFFFF';

            const textWidth = context.measureText(xp).width;
            const xPosition = 22 + (406 - textWidth) / 2;

            context.fillText(xp + ' XP', xPosition, 203);

            // Nivel siguiente del jugador.
            context.font = 'bold 10px Roboto Condensed';
            context.fillStyle = '#FFFFFF';

            let siguienteNivel = nivel;
            siguienteNivel++;

            if (siguienteNivel == 21) {
                siguienteNivel = 'Rank Up!';
            }
            
            if (siguienteNivel.length > 2) {
                context.fillText(`Sgte. Nivel: ${siguienteNivel}`, 340, 203);
            } else {
                context.fillText(`Sgte. Nivel: ${siguienteNivel}`, 368, 203);
            }

            // Usando undici para realizar las solicitudes HTTP con un mejor rendimiento.
            // Cargando la foto del jugador.
            const { body: avatarBody } = await request(interaction.user.displayAvatarURL({ extension: 'jpg' }));
            const avatar = await Canvas.loadImage(await avatarBody.arrayBuffer());

            // Cargando el logo.
            const logo = await Canvas.loadImage('./images/tarjeta/scp-logo-card.png');
        
            // Cargando el código QR DataMatrix
            const qr = await Canvas.loadImage('./images/tarjeta/qr-datamatrix-card.png');
        
            // Dibuja las imágenes en el lienzo.
            context.drawImage(avatar, 25, 55, 100, 100);
            context.drawImage(logo, 307, 110, 70, 70);
            context.drawImage(qr, 365, 5, 80, 80);
        
            // Usa la clase AttachmentBuilder para que se procese el archivo y pueda adjuntarse en el reply.
            const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'profile-image.png' });

            await interaction.reply({ files: [attachment] });
        } else {
            await interaction.reply('¡No estás registrado! Captura un SCP para guardar tus datos.');
        }
    },
};
