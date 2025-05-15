const { SlashCommandBuilder } = require('discord.js');
const firebase = require('../../utils/firebase');

const database = firebase.firestore();

module.exports = {
    cooldown: 1,
    data: new SlashCommandBuilder()
        .setName('countcards')
        .setDescription('Shows the card from the database.')
        .setContexts(['Guild']),
    async execute(interaction) {
        const userId = interaction.user.id;
        const adminId = process.env.DISCORD_ADMINISTRATOR_ID;

        // * Notify the Discord API that the interaction was received successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply();

        // ! If the user is not the administrator, returns an error message.
        if (userId !== adminId) {
            await interaction.editReply(`${process.env.EMOJI_ERROR}  You are not the administrator!`);
            return;
        }
        
        /**
         * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
         * * The command passes all validations and the operation is performed. *
         * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
         */
        
        // * Retrieves through Aggregation Query the numbers of documents contained in the collection.
        const safeCardReference = database.collection('card').doc('Safe').collection('safe');
        const safeCardSnapshot = await safeCardReference.count().get();

        const euclidCardReference = database.collection('card').doc('Euclid').collection('euclid');
        const euclidCardSnapshot = await euclidCardReference.count().get();

        const keterCardReference = database.collection('card').doc('Keter').collection('keter');
        const keterCardSnapshot = await keterCardReference.count().get();

        const thaumielCardReference = database.collection('card').doc('Thaumiel').collection('thaumiel');
        const thaumielCardSnapshot = await thaumielCardReference.count().get();

        const apollyonCardReference = database.collection('card').doc('Apollyon').collection('apollyon');
        const apollyonCardSnapshot = await apollyonCardReference.count().get();

        const safeClassCount = safeCardSnapshot.data().count;
        const euclidClassCount = euclidCardSnapshot.data().count;
        const keterClassCount = keterCardSnapshot.data().count;
        const thaumielClassCount = thaumielCardSnapshot.data().count;
        const apollyonClassCount = apollyonCardSnapshot.data().count;

        await interaction.editReply(`**Safe:** ${safeClassCount}\n**Euclid:** ${euclidClassCount}\n**Keter:** ${keterClassCount}\n**Thaumiel:** ${thaumielClassCount}\n**Apollyon:** ${apollyonClassCount}`);
    },
};
