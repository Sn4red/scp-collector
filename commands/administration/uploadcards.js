const { SlashCommandBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');
const firebase = require('../../utils/firebase');

const database = firebase.firestore();

module.exports = {
    cooldown: 1,
    data: new SlashCommandBuilder()
        .setName('uploadcards')
        .setDescription('Upload the cards stored in json files to the database.')
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

        const safeFilePath = path.join(__dirname, '../../administration/cards-json/safe.json');
        const euclidFilePath = path.join(__dirname, '../../administration/cards-json/euclid.json');
        const keterFilePath = path.join(__dirname, '../../administration/cards-json/keter.json');
        const thaumielFilePath = path.join(__dirname, '../../administration/cards-json/thaumiel.json');
        const apollyonFilePath = path.join(__dirname, '../../administration/cards-json/apollyon.json');

        await uploadJSON(interaction, safeFilePath, 'Safe');
        await uploadJSON(interaction, euclidFilePath, 'Euclid', false);
        await uploadJSON(interaction, keterFilePath, 'Keter', false);
        await uploadJSON(interaction, thaumielFilePath, 'Thaumiel', false);
        await uploadJSON(interaction, apollyonFilePath, 'Apollyon', false);
    },
};

async function uploadJSON(interaction, filePath, collection, first = true) {
    const startTime = process.hrtime();

    try {
        if (!fs.existsSync(filePath)) {
            throw new Error(`The file in ${filePath} does not exist.`);
        }

        const rawData = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(rawData);

        for (const card of jsonData) {
            const cardId = card.id;
            const { ...cardData } = card;

            const cardReference = database.collection('card').doc(collection).collection(collection.toLowerCase()).doc(cardId);
            await cardReference.set(cardData);

            console.log(card);
        }

        const endTime = process.hrtime(startTime);
        const elapsedTime = (endTime[0] * 1000) + (endTime[1] / 1000000);
        const elapsedTimeInSeconds = elapsedTime / 1000;

        if (first) {
            console.log(`*** uploadcards.js *** ${collection} cards uploaded successfully in ${elapsedTimeInSeconds.toFixed(2)}s!`);
            await interaction.editReply(`${collection} cards uploaded successfully in ${elapsedTimeInSeconds.toFixed(2)}s!`);
        } else {
            console.log(`*** uploadcards.js *** ${collection} cards uploaded successfully in ${elapsedTimeInSeconds.toFixed(2)}s!`);
            await interaction.followUp(`${collection} cards uploaded successfully in ${elapsedTimeInSeconds.toFixed(2)}s!`);
        }
    } catch (error) {
        console.error(error);
    }
}
