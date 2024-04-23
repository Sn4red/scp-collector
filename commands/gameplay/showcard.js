const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const path = require('node:path');
const firebase = require('../../utils/firebase');

const database = firebase.firestore();

module.exports = {
    cooldown: 20,
    data: new SlashCommandBuilder()
        .setName('showcard')
        .setDescription('Shows one of your cards to the public.')
        .addStringOption(option =>
            option.setName('card')
                .setDescription('Card ID to inquire about.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('holographic')
                .setDescription('Specify the holopraphic type if needed.')
                .setRequired(false)
                .addChoices(
                    { name: 'Emerald', value: 'Emerald' },
                    { name: 'Golden', value: 'Golden' },
                    { name: 'Diamond', value: 'Diamond' },
                )),
    async execute(interaction) {
        const userId = interaction.user.id;

        // * Notify the Discord API that the interaction was received successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply();

        const userReference = database.collection('user').doc(userId);
        const userSnapshot = await userReference.get();

        if (userSnapshot.exists) {
            const cardId = interaction.options.getString('card');
            const holographic = interaction.options.getString('holographic');

            const fixedCardId = cardId.toUpperCase();
            const cardIdValidation = /^scp-\d{3,4}$/i.test(fixedCardId);

            if (cardIdValidation) {
                const foundCard = await findCard(userId, fixedCardId, holographic);

                if (foundCard.wasFound) {
                    const cardData = foundCard.cardData;

                    const imagePath = path.join(__dirname, `../../images/scp/${cardId}.jpg`);
                    const image = new AttachmentBuilder(imagePath);

                    let holographicEmoji = null;
                    let embedColor = null;

                    switch (foundCard.holographic) {
                        case 'Emerald':
                            holographicEmoji = '<a:emerald:1228923470239367238>';
                            embedColor = 0x00b65c;

                            break;
                        case 'Golden':
                            holographicEmoji = '<a:golden:1228925086690443345>';
                            embedColor = 0xffd700;

                            break;
                        case 'Diamond':
                            holographicEmoji = '<a:diamond:1228924014479671439>';
                            embedColor = 0x00bfff;

                            break;
                        default:
                            holographicEmoji = ' ';
                            embedColor = 0x010101;

                            break;
                    }

                    const cardEmbed = new EmbedBuilder()
                        .setColor(embedColor)
                        .setTitle(`${holographicEmoji}  Item #: \`${fixedCardId}\` // \`${cardData.name}\``)
                        .addFields(
                            { name: '<:invader:1228919814555177021>  Class', value: `\`${foundCard.class}\``, inline: true },
                            { name: '<:files:1228920361723236412>  File', value: `**[View Document](${cardData.file})**`, inline: true },
                        )
                        .setImage(`attachment://${fixedCardId}.jpg`)
                        .setTimestamp();

                        await interaction.editReply({
                            embeds: [cardEmbed],
                            files: [image],
                        });
                } else {
                    let formattedValue = holographic;

                    // * This conditional es performed to avoid the 'null' value to be displayed in the message (when the card type is Normal).
                    if (holographic === null) {
                        formattedValue = 'Normal';
                    }

                    await interaction.editReply(`<a:magnifying:1232095150935642214>  Card \`${fixedCardId}\` (${formattedValue}) not found in your collection!`);
                }
            } else {
                await interaction.editReply('<a:error:1229592805710762128>  Invalid card ID format. Please use the following format: `SCP-XXXX`.');
            }
        } else {
            await interaction.editReply('<a:error:1229592805710762128>  You are not registered! Use /`card` to start playing.');
        }
    },
};

async function findCard(userId, cardId, holographic) {
    let holographicValue = holographic;

    if (holographicValue === null) {
        holographicValue = 'Normal';
    }

    const cardSafeReference = database.collection('card').doc('Safe').collection('safe').doc(cardId);
    const cardSafeSnapshot = await cardSafeReference.get();

    const cardEuclidReference = database.collection('card').doc('Euclid').collection('euclid').doc(cardId);
    const cardEuclidSnapshot = await cardEuclidReference.get();

    const cardKeterReference = database.collection('card').doc('Keter').collection('keter').doc(cardId);
    const cardKeterSnapshot = await cardKeterReference.get();

    const cardThaumielReference = database.collection('card').doc('Thaumiel').collection('thaumiel').doc(cardId);
    const cardThaumielSnapshot = await cardThaumielReference.get();

    const cardApollyonReference = database.collection('card').doc('Apollyon').collection('apollyon').doc(cardId);
    const cardApollyonSnapshot = await cardApollyonReference.get();

    if (cardSafeSnapshot.exists) {
        const cardData = cardSafeSnapshot.data();
        
        const obtentionReference = database.collection('user').doc(userId).collection('obtaining');
        const obtentionQuery = obtentionReference.where('card', '==', cardSafeSnapshot.ref)
                                                    .where('holographic', '==', holographicValue).limit(1);
        const obtentionSnapshot = await obtentionQuery.get();

        if (!obtentionSnapshot.empty) {
            return {
                wasFound: true,
                cardData: cardData,
                class: 'Safe',
                holographic: holographicValue,
            };
        } else {
            return { wasFound: false };
        }
    }

    if (cardEuclidSnapshot.exists) {
        const cardData = cardEuclidSnapshot.data();
        
        const obtentionReference = database.collection('user').doc(userId).collection('obtaining');
        const obtentionQuery = obtentionReference.where('card', '==', cardEuclidSnapshot.ref)
                                                    .where('holographic', '==', holographicValue).limit(1);
        const obtentionSnapshot = await obtentionQuery.get();

        if (!obtentionSnapshot.empty) {
            return {
                wasFound: true,
                cardData: cardData,
                class: 'Euclid',
                holographic: holographicValue,
            };
        } else {
            return { wasFound: false };
        }
    }

    if (cardKeterSnapshot.exists) {
        const cardData = cardKeterSnapshot.data();
        
        const obtentionReference = database.collection('user').doc(userId).collection('obtaining');
        const obtentionQuery = obtentionReference.where('card', '==', cardKeterSnapshot.ref)
                                                    .where('holographic', '==', holographicValue).limit(1);
        const obtentionSnapshot = await obtentionQuery.get();

        if (!obtentionSnapshot.empty) {
            return {
                wasFound: true,
                cardData: cardData,
                class: 'Keter',
                holographic: holographicValue,
            };
        } else {
            return { wasFound: false };
        }
    }

    if (cardThaumielSnapshot.exists) {
        const cardData = cardThaumielSnapshot.data();
        
        const obtentionReference = database.collection('user').doc(userId).collection('obtaining');
        const obtentionQuery = obtentionReference.where('card', '==', cardThaumielSnapshot.ref)
                                                    .where('holographic', '==', holographicValue).limit(1);
        const obtentionSnapshot = await obtentionQuery.get();

        if (!obtentionSnapshot.empty) {
            return {
                wasFound: true,
                cardData: cardData,
                class: 'Thaumiel',
                holographic: holographicValue,
            };
        } else {
            return { wasFound: false };
        }
    }

    if (cardApollyonSnapshot.exists) {
        const cardData = cardApollyonSnapshot.data();
        
        const obtentionReference = database.collection('user').doc(userId).collection('obtaining');
        const obtentionQuery = obtentionReference.where('card', '==', cardApollyonSnapshot.ref)
                                                    .where('holographic', '==', holographicValue).limit(1);
        const obtentionSnapshot = await obtentionQuery.get();

        if (!obtentionSnapshot.empty) {
            return {
                wasFound: true,
                cardData: cardData,
                class: 'Apollyon',
                holographic: holographicValue,
            };
        } else {
            return { wasFound: false };
        }
    }

    return { wasFound: false };
}
