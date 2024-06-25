const { SlashCommandBuilder } = require('discord.js');
const firebase = require('../../utils/firebase');

const database = firebase.firestore();

module.exports = {
    cooldown: 20,
    data: new SlashCommandBuilder()
        .setName('enabletrades')
        .setDescription('Use it if you want to receive trade offers (enabled by default).'),
    async execute(interaction) {
        // * Notify the Discord API that the interaction was received successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply({ ephemeral: true });

        const userId = interaction.user.id;

        const userReference = database.collection('user').doc(userId);
        const userSnapshot = await userReference.get();

        if (userSnapshot.exists) {
            const document = userSnapshot.data();

            // * If the user already enabled the trade offers, the command won't update the document.
            if (document.acceptTradeOffers) {
                await interaction.editReply('<a:error:1229592805710762128>  You already enabled trade offers!');

                return;
            }

            await userReference.update({
                acceptTradeOffers: true,
            });

            await interaction.editReply('<a:check:1235800336317419580>  You will receive trade offers from now on.');
        } else {
            await interaction.editReply('<a:error:1229592805710762128>  You are not registered! Use /`card` to start playing.');
        }
    },
};
