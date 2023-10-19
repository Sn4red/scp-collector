const { SlashCommandBuilder, EmbedBuilder, SlashCommandSubcommandGroupBuilder } = require('discord.js');
const firebase = require('../../utils/firebase');

const database = firebase.firestore();

module.exports = {
    cooldown: 300,
    data: new SlashCommandBuilder()
        .setName('scp')
        .setDescription('Lista tu colección de SCP\'s.'),
    async execute(interaction) {
       // Avisa a la API de Discord que la interacción se recibió correctamente y da un tiempo máximo de 15 minutos.
        await interaction.deferReply({ ephemeral: true });

        const referenciaUsuario = database.collection('usuario').doc(interaction.user.id);
        const snapshotUsuario = await referenciaUsuario.get();
        const usuario = snapshotUsuario.data();

        const referenciaCartas = database.collection('obtencion').where('usuario', '==', referenciaUsuario);
        const snapshotCartas = await referenciaCartas.get();
        
        const cartas = [];

        for (const x of snapshotCartas.docs) {
            const obtencion = x.data();
            const referenciaCarta = obtencion.carta;
            const documentoCarta = await referenciaCarta.get();

            cartas.push(documentoCarta);
        }

        cartas.sort((a, b) => a.id.localeCompare(b.id));

        const embed = new EmbedBuilder()
            .setColor(0x000000)
            .setTitle('**Colección de ' + usuario.nick + '**')
            .setTimestamp();

        let listaCartas = '';

        cartas.forEach(x => {
            const carta = x.data();

            listaCartas += `${x.id} - ${carta.nombre}\n`;
        });

        embed.addFields({ name: '\u200B', value: listaCartas });

        await interaction.editReply({ embeds: [embed] });
    },
};
