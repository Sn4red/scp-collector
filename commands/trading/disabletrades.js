const { SlashCommandBuilder } = require('discord.js');
const firebase = require('../../utils/firebase');

const database = firebase.firestore();

module.exports = {
    cooldown: 20,
    data: new SlashCommandBuilder()
        .setName('disabletrades')
        .setDescription('Use it if you don\'t want to receive trade offers.'),
    async execute(interaction) {
        // * Notify the Discord API that the interaction was received successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply({ ephemeral: true });

        const userId = interaction.user.id;

        const userReference = database.collection('user').doc(userId);
        const userSnapshot = await userReference.get();

        // ! If the user is not registered, returns an error message.
        if (!userSnapshot.exists) {
            await interaction.editReply(`${process.env.EMOJI_ERROR}  You are not registered! Use /\`card\` to start playing.`);
            return;
        }

        const document = userSnapshot.data();

        // ! If the user already disabled the trade offers, the command won't update the document.
        if (!document.acceptTradeOffers) {
            await interaction.editReply(`${process.env.EMOJI_ERROR}  You already disabled trade offers!`);
            return;
        }

        /**
         * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
         * * The command passes all validations and the operation is performed. *
         * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
         */

        await userReference.update({
            acceptTradeOffers: false,
        });

        await interaction.editReply(`${process.env.EMOJI_CHECK}  You won't receive trade offers from now on.`);
    },
};
