const {
    SlashCommandBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ContainerBuilder,
    MessageFlags,
} = require('discord.js');

const path = require('path');
const fs = require('fs');
const firebase = require('../../utils/firebase');

const database = firebase.firestore();

module.exports = {
    cooldown: 1,
    data: new SlashCommandBuilder()
        .setName('uploadcards')
        .setDescription(
            'Upload the cards stored in JSON files to the database.',
        )
        .setContexts(['Guild']),
    async execute(interaction) {
        const userId = interaction.user.id;
        const adminId = process.env.DISCORD_ADMINISTRATOR_ID;

        // * Notify the Discord API that the interaction was received
        // * successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply({
            flags: [MessageFlags.Ephemeral],
        });

        // ! If the user is not the administrator, returns an error message.
        if (userId !== adminId) {
            const errorMessage = new TextDisplayBuilder()
                .setContent(
                    `${process.env.EMOJI_ERROR}  You are not the ` +
                        'administrator!',
                );

            await interaction.editReply({
                components: [errorMessage],
                flags: [MessageFlags.IsComponentsV2],
            });

            return;
        }

        /**
         * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
         * * The command passes all validations and the operation is performed.*
         * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
         */

        // * Defines the file paths for the JSON files to be uploaded.
        const safeFilePath = path
            .join(__dirname, '../../administration/cards-json/safe.json');
        const euclidFilePath = path
            .join(__dirname, '../../administration/cards-json/euclid.json');
        const keterFilePath = path
            .join(__dirname, '../../administration/cards-json/keter.json');
        const thaumielFilePath = path
            .join(__dirname, '../../administration/cards-json/thaumiel.json');
        const apollyonFilePath = path
            .join(__dirname, '../../administration/cards-json/apollyon.json');

        await uploadJSON(interaction, safeFilePath, 'Safe');
        await uploadJSON(interaction, euclidFilePath, 'Euclid', false);
        await uploadJSON(interaction, keterFilePath, 'Keter', false);
        await uploadJSON(interaction, thaumielFilePath, 'Thaumiel', false);
        await uploadJSON(interaction, apollyonFilePath, 'Apollyon', false);
    },
};

// * The function uploads the JSON data to the Firestore database through
// * parsing.
async function uploadJSON(interaction, filePath, collection, first = true) {
    // * Starts the timer to measure the time taken to upload the data.
    const startTime = process.hrtime();

    try {
        // * Checks if the file exists.
        if (!fs.existsSync(filePath)) {
            throw new Error(`The file in ${filePath} does not exist.`);
        }

        // * Reads the JSON file and parses it.
        const rawData = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(rawData);

        // * Each card object is uploaded to the Firestore database.
        for (const card of jsonData) {
            const cardId = card.id;
            const { ...cardData } = card;

            const cardReference = database.collection('card').doc(collection)
                .collection(collection.toLowerCase()).doc(cardId);
            await cardReference.set(cardData);

            console.log(card);
        }

        // * The timer is stopped and the elapsed time is calculated.
        const endTime = process.hrtime(startTime);
        const elapsedTime = (endTime[0] * 1000) + (endTime[1] / 1000000);
        const elapsedTimeInSeconds = elapsedTime / 1000;

        // * Header.
        const header = new TextDisplayBuilder()
            .setContent('### Card Uploading');

        // * Separator.
        const separator = new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Small);

        // * Text.
        const text = new TextDisplayBuilder()
            .setContent(
                `${collection} cards uploaded successfully in ` +
                    `${elapsedTimeInSeconds.toFixed(2)}s!`,
            );

        // * Container.
        const container = new ContainerBuilder()
            .setAccentColor(0x010101)
            .addTextDisplayComponents(header)
            .addSeparatorComponents(separator)
            .addTextDisplayComponents(text);

        // * If the 'first' parameter is true, the interaction is edited,
        // * otherwise, a follow-up message is sent.
        if (first) {
            console.log(
                `*** uploadcards.js *** ${collection} cards uploaded ` +
                    `successfully in ${elapsedTimeInSeconds.toFixed(2)}s!`,
            );
            
            await interaction.editReply({
                components: [container],
                flags: [MessageFlags.IsComponentsV2],
            });
        } else {
            console.log(
                `*** uploadcards.js *** ${collection} cards uploaded ` +
                    `successfully in ${elapsedTimeInSeconds.toFixed(2)}s!`,
            );

            await interaction.followUp({
                components: [container],
                flags: [
                    MessageFlags.IsComponentsV2,
                    MessageFlags.Ephemeral,
                ],
            });
        }
    } catch (error) {
        console.error(error);
    }
}
