const {
    SlashCommandBuilder,
    MessageFlags,
    TextDisplayBuilder,
} = require('discord.js');

const firebase = require('../../utils/firebase');

const database = firebase.firestore();

module.exports = {
    cooldown: 20,
    data: new SlashCommandBuilder()
        .setName('enabletrades')
        .setDescription(
            'Use it if you want to receive trade offers (enabled by default).',
        ),
    async execute(interaction) {
        // * Notify the Discord API that the interaction was received
        // * successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply({
            flags: [MessageFlags.Ephemeral],
        });

        const userId = interaction.user.id;

        const userReference = database.collection('user').doc(userId);
        const userSnapshot = await userReference.get();

        // ! If the user is not registered, returns an error message.
        if (!userSnapshot.exists) {
            const errorMessage = new TextDisplayBuilder()
                .setContent(
                    `${process.env.EMOJI_ERROR}  You are not registered! ` +
                        'Use /`card` to start playing.',
                );

            await interaction.editReply({
                components: [errorMessage],
                flags: [MessageFlags.IsComponentsV2],
            });

            return;
        }

        const document = userSnapshot.data();

        // ! If the user already enabled the trade offers, the command won't
        // ! update the document.
        if (document.acceptTradeOffers) {
            const errorMessage = new TextDisplayBuilder()
                .setContent(
                    `${process.env.EMOJI_ERROR}  You already enabled trade ` +
                        'offers!',
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

        await userReference.update({
            acceptTradeOffers: true,
        });

        const message = new TextDisplayBuilder()
            .setContent(
                `${process.env.EMOJI_CHECK}  You will receive trade offers ` +
                    'from now on.',
            );

        await interaction.editReply({
            components: [message],
            flags: [MessageFlags.IsComponentsV2],
        });
    },
};
