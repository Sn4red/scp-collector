const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
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

        const referenciaCartas = database.collection('obtencion');
        const snapshotCartas = await referenciaCartas.where('usuario', '==', referenciaUsuario).get();

        snapshotCartas.forEach(x => {
            const carta = x.data();
            
            console.log(x.id);
            console.log(carta.carta.id);
        });

        const embed = new EmbedBuilder()
            .setColor(0x000000)
            .setTitle('**Colección de ' + usuario.nick + '**')
            .setDescription('aeaaea')
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
};
