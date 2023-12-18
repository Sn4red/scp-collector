const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const firebase = require('../../utils/firebase');

const database = firebase.firestore();

module.exports = {
    cooldown: 20,
    data: new SlashCommandBuilder()
        .setName('listatradeosenviados')
        .setDescription('Muestra el detalle de un tradeo.'),
    async execute(interaction) {
        // Notify the Discord API that the interaction was received successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply({ ephemeral: true });

        const userReference = database.collection('usuario').doc(interaction.user.id);
        const userSnapshot = await userReference.get();

        if (userSnapshot.exists) {
            const tradeReference = database.collection('tradeo').where('emisor', '==', interaction.user.id);
            const tradeSnapshot = await tradeReference.get();

            // Se arma un embed inicial con un pequeno historial de tradeos realizados.

            if (!tradeSnapshot.empty) {
                // Se anaden los tradeos pendientes de aceptar al embed, se ordenan por fecha de creacion y se despliega.
            } else {
                // Se envia el embed armado mostrando un mensaje en el top que no hay tradeos pendientes de aceptar,
                // con solo un pequeno historial de tradeos realizados.
            }
        } else {
            await interaction.editReply('¡No estás registrado(a)! Usa /tarjeta para guardar tus datos.');
        }
    },
};
