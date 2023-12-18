const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const firebase = require('../../utils/firebase');

const database = firebase.firestore();

module.exports = {
    cooldown: 20,
    data: new SlashCommandBuilder()
        .setName('vertradeo')
        .setDescription('Muestra el detalle de un tradeo.')
        .addStringOption(option =>
            option.setName('solicitud')
            .setDescription('ID solicitud del tradeo a consultar.')
            .setRequired(true)),
    async execute(interaction) {
        // Notify the Discord API that the interaction was received successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply({ ephemeral: true });

        const userReference = database.collection('usuario').doc(interaction.user.id);
        const userSnapshot = await userReference.get();

        if (userSnapshot.exists) {
            const tradeId = interaction.options.getString('solicitud');

            const tradeReference = database.collection('tradeo').doc(tradeId);
            const tradeSnapshot = await tradeReference.get();

            if (tradeSnapshot.exists) {
                const tradeDocument = tradeSnapshot.data();

                const tradeObject = await formattingValues(tradeDocument);

                const tradeEmbed = new EmbedBuilder()
                    .setColor(0x000000)
                    .setTitle(`Tradeo #: ${tradeSnapshot.id}`)
                    .addFields(
                        { name: 'Emisor', value: `${tradeObject.issuerNickname} (${tradeObject.issuerId})` },
                        { name: 'Carta', value: `${tradeObject.issuerCardId} / ${tradeObject.issuerCardName}` },
                        { name: 'Receptor', value: `${tradeObject.recipientNickname} (${tradeObject.recipientId})` },
                        { name: 'Carta', value: `${tradeObject.recipientCardId} / ${tradeObject.recipientCardName}` },
                        { name: 'Fecha de Creación', value: `${tradeObject.creationDate}` },
                        { name: 'Estado', value: `${tradeObject.tradeStatus}` },
                    )
                    .setTimestamp();

                if (tradeObject.tradeDate != null) {
                    tradeEmbed.addFields({ name: 'Fecha de Tradeo', value: `${tradeObject.tradeDate}` });
                }

                await interaction.editReply({ embeds: [tradeEmbed] });
            } else {
                await interaction.editReply('¡No existe un tradeo con esa ID!');
            }
        } else {
            await interaction.editReply('¡No estás registrado(a)! Usa /tarjeta para guardar tus datos.');
        }
    },
};

async function formattingValues(tradeDocument) {
    const issuerReference = database.collection('usuario').doc(tradeDocument.emisor);
    const issuerSnapshot = await issuerReference.get();
    const issuerDocument = issuerSnapshot.data();
    const issuerNickname = issuerDocument.nick;
    const issuerId = issuerSnapshot.id;

    const issuerCardReference = tradeDocument.cartaEmisor;
    const issuerCardSnapshot = await issuerCardReference.get();
    const issuerCardDocument = issuerCardSnapshot.data();
    const issuerCardId = issuerCardSnapshot.id;
    const issuerCardName = issuerCardDocument.nombre;

    const recipientReference = database.collection('usuario').doc(tradeDocument.receptor);
    const recipientSnapshot = await recipientReference.get();
    const recipientDocument = recipientSnapshot.data();
    const recipientNickname = recipientDocument.nick;
    const recipientId = recipientSnapshot.id;

    const recipientCardReference = tradeDocument.cartaReceptor;
    const recipientCardSnapshot = await recipientCardReference.get();
    const recipientCardDocument = recipientCardSnapshot.data();
    const recipientCardId = recipientCardSnapshot.id;
    const recipientCardName = recipientCardDocument.nombre;

    const creationDate = new Date(tradeDocument.cooldownSeguridad._seconds * 1000 + tradeDocument.cooldownSeguridad._nanoseconds / 1000000).toLocaleString();

    let tradeStatus = false;
    let tradeDate = null;

    if (tradeDocument.confirmacionTradeo == false) {
        tradeStatus = 'Pendiente';
    } else {
        tradeStatus = 'Realizado';
        tradeDate = new Date(tradeDocument.fechaTradeo._seconds * 1000 + tradeDocument.fechaTradeo._nanoseconds / 1000000).toLocaleString();
    }

    return { issuerNickname, issuerId, issuerCardId, issuerCardName, recipientNickname, recipientId, recipientCardId, recipientCardName, creationDate, tradeStatus, tradeDate };
}
