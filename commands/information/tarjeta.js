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
        // Avisa a la API de Discord que la interacción se recibió correctamente y da un tiempo máximo de 15 minutos.
        await interaction.deferReply();

        // Se realiza la consulta a la base de datos.
        const queryUsuario = database.collection('usuario').doc(interaction.user.id);
        const snapshotUsuario = await queryUsuario.get();

        // Si el usuario existe, se actualizan sus datos, en este caso el nickname (por si se lo cambió manualmente).
        if (snapshotUsuario.exists) {
            await queryUsuario.update({
                nick: interaction.user.username,
            });

            const documento = snapshotUsuario.data();
            const idUsuario = interaction.user.id;

            // Usa la clase AttachmentBuilder para que se procese el archivo y pueda adjuntarse en el reply.
            const attachment = await desplegarTarjeta(documento, idUsuario, interaction);

            await interaction.editReply({ files: [attachment] });
        } else {
            // Si el usuario no existe, se crea un documento nuevo antes de desplegar la tarjeta.

            // Prepara el formato de fecha en DD/MM/YYYY.
            const fechaActual = new Date();

            const dia = ('0' + fechaActual.getDate()).slice(-2);
            const mes = ('0' + (fechaActual.getMonth() + 1)).slice(-2);
            const anio = fechaActual.getFullYear();

            const usuarioNuevo = {
                fecha: dia + '/' + mes + '/' + anio,
                nick: interaction.user.username,
                nivel: 1,
                rango: 'Clase D',
                xp: 0,
            };

            await database.collection('usuario').doc(interaction.user.id).set(usuarioNuevo);

            // Usa la clase AttachmentBuilder para que se procese el archivo y pueda adjuntarse en el reply.
            const attachment = await desplegarTarjeta(usuarioNuevo, interaction.user.id, interaction);

            await interaction.editReply({ files: [attachment] });
            
            await interaction.followUp('¡Usuario nuevo! Ya puedes usar los comandos para coleccionar cartas y demás.');
        }
    },
};

async function desplegarTarjeta(documento, idUsuario, interaction) {
    // Datos del usuario.
    const fecha = documento.fecha;
    const id = idUsuario;
    const nick = documento.nick;
    const nivel = documento.nivel;
    const rango = documento.rango;
    const xp = documento.xp.toString();

    // Consulta a la base de datos sobre la cantidad de SCP's obtenidos.
    let cantidadSCP = 0;
    const querySCP = database.collection('obtencion');
    const snapshotSCP = await querySCP.where('usuario', '==', database.collection('usuario').doc(id)).get();

    if (snapshotSCP.empty) {
        cantidadSCP = 0;
    } else {
        cantidadSCP = snapshotSCP.size;
    }
    
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
    
    // Borde de la foto del usuario.
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
    context.fillText(cantidadSCP + '', 220, 132);
    
    // Etiqueta de clasificado.
    context.font = '13px Roboto Condensed';
    context.fillStyle = '#FF0000';
    context.fillText('[ Clasificado ]', 41, 28);
    
    // ID del usuario.
    context.font = 'bold 8px Roboto Condensed';
    context.fillStyle = '#FFFFFF';
    context.fillText(id, 367, 98);
    
    // Barra de progreso del usuario.
    context.fillStyle = '#1A1A1A';
    context.fillRect(22, 210, 406, 15);
    
    // Barra de llenado de progreso del usuario.
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
    
    // Nivel del usuario.
    context.font = 'bold 10px Roboto Condensed';
    context.fillStyle = '#FFFFFF';
    context.fillText(`Nivel: ${nivel}`, 25, 203);
    
    // XP del usuario.
    context.font = 'bold 10px Roboto Condensed';
    context.fillStyle = '#FFFFFF';
    
    const textWidth = context.measureText(xp).width;
    const xPosition = 22 + (406 - textWidth) / 2;
    
    context.fillText(xp + ' XP', xPosition, 203);
    
    // Nivel siguiente del usuario.
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
    // Cargando la foto del usuario.
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
    
    return new AttachmentBuilder(await canvas.encode('png'), { name: 'profile-image.png' });
}
