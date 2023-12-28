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
            const issuerTradeReference = database.collection('tradeo').where('emisor', '==', interaction.user.id)
                                            .where('confirmacionTradeo', '==', true);

            const issuerTradeSnapshot = await issuerTradeReference.get();

            const recipientTradeReference = database.collection('tradeo').where('receptor', '==', interaction.user.id)
                                            .where('confirmacionTradeo', '==', true);
            
            const recipientTradeSnapshot = await recipientTradeReference.get();

            const userTradeSnapshot = issuerTradeSnapshot.docs.concat(recipientTradeSnapshot.docs);

            const embed = new EmbedBuilder()
                .setColor(0x000000)
                .setTitle('Lista de Tradeos Enviados')
                .setDescription('No se han encontrado tradeos pendientes.\n\n**/--- Historial de Tradeos Recientes ---/**')
                .setTimestamp();

            for (const document of userTradeSnapshot) {
                const tradeDocument = document.data();

                const issuerCardReference = tradeDocument.cartaEmisor;
                const issuerCardSnapshot = await issuerCardReference.get();

                const recipientCardReference = tradeDocument.cartaReceptor;
                const recipientCardSnapshot = await recipientCardReference.get();

                const fechaTradeo = new Date(tradeDocument.fechaTradeo._seconds * 1000 + tradeDocument.fechaTradeo._nanoseconds / 1000000).toLocaleString();
                
                const issuerReference = database.collection('usuario').doc(tradeDocument.emisor);
                const issuerSnapshot = await issuerReference.get();
                const issuerDocument = issuerSnapshot.data();
                const issuerNickname = issuerDocument.nick;

                embed.addFields(
                    { name: ' ', value: `* ${issuerCardSnapshot.id} por ${recipientCardSnapshot.id} (${fechaTradeo}) -> ${issuerNickname}` },
                );
            }

            await interaction.editReply({ embeds: [embed] });
        } else {
            await interaction.editReply('¡No estás registrado(a)! Usa /tarjeta para guardar tus datos.');
        }
    },
};
