const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const path = require('node:path');
const firebase = require('../../utils/firebase');

const database = firebase.firestore();

module.exports = {
    cooldown: 20,
    data: new SlashCommandBuilder()
        .setName('viewcard')
        .setDescription('Privately displays one of your owned cards.')
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
        await interaction.deferReply({ ephemeral: true });

        const userReference = database.collection('user').doc(userId);
        const userSnapshot = await userReference.get();

        // ! If the user is not registered, returns an error message.
        if (!userSnapshot.exists) {
            await interaction.editReply('<a:error:1229592805710762128>  You are not registered! Use /`card` to start playing.');
            return;
        }

        const cardId = interaction.options.getString('card');
        const holographic = interaction.options.getString('holographic');

        const fixedCardId = cardId.toUpperCase();
        const cardIdValidation = /^scp-\d{3,4}$/i.test(fixedCardId);
    
        // ! If the field has wrong data, returns an error message.
        if (!cardIdValidation) {
            await interaction.editReply('<a:error:1229592805710762128>  Invalid card ID format. Please use the following format: `SCP-XXXX`.');
            return;
        }

        const foundCard = await findCard(userId, fixedCardId, holographic);

        // ! If the card is not found in the user's collection, returns an error message.
        if (!foundCard.wasFound) {
            let formattedValue = holographic;

            // * This conditional es performed to avoid the 'null' value to be displayed in the message (when the card type is Normal).
            if (holographic === null) {
                formattedValue = 'Normal';
            }

            await interaction.editReply(`<a:magnifying:1232095150935642214>  Card \`${fixedCardId}\` (${formattedValue}) not found in your collection!`);
            return;
        }

        /**
         * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
         * * The command passes all validations and the operation is performed. *
         * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
         */
        
        const cardData = foundCard.cardData;

        const imagePath = path.join(__dirname, `../../images/scp/${fixedCardId}.jpg`);
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

        const cardName = limitCardName(cardData.name);

        const cardEmbed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle(`${holographicEmoji}  Item #: \`${fixedCardId}\` // \`${cardName}\``)
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
    },
};

// * This function searches for the card data through all the card collections, and then with the reference it checks if the user has the card in his collection.
async function findCard(userId, cardId, holographic) {
    let holographicValue = holographic;

    if (holographicValue === null) {
        holographicValue = 'Normal';
    }

    const cardReferences = [
        database.collection('card').doc('Safe').collection('safe').doc(cardId),
        database.collection('card').doc('Euclid').collection('euclid').doc(cardId),
        database.collection('card').doc('Keter').collection('keter').doc(cardId),
        database.collection('card').doc('Thaumiel').collection('thaumiel').doc(cardId),
        database.collection('card').doc('Apollyon').collection('apollyon').doc(cardId),
    ];

    const cardPromises = cardReferences.map(reference => reference.get());

    const snapshots = await Promise.all(cardPromises);

    for (const snapshot of snapshots) {
        if (snapshot.exists) {            
            const obtentionReference = database.collection('user').doc(userId).collection('obtaining');
            const obtentionQuery = obtentionReference.where('card', '==', snapshot.ref)
                                                        .where('holographic', '==', holographicValue).limit(1);
            const obtentionSnapshot = await obtentionQuery.get();

            if (!obtentionSnapshot.empty) {
                const cardData = snapshot.data();

                const pathSegments = snapshot.ref.path.split('/');
                const className = pathSegments[1];

                // * If the card exist and the user has it in his collection.
                return {
                    wasFound: true,
                    cardData: cardData,
                    class: className,
                    holographic: holographicValue,
                };
            } else {
                // * If the card exist but the user does not have it in his collection.
                return { wasFound: false };
            }
        }
    }

    // * If the card is not found in any collection, in other words, the card does not exist.
    return { wasFound: false };
}

// * This function ensures that the card name with the title does not exceed the maximum character limit, which is 256.
// * To make sure that no errors occur, the function will limit the card name by 179 characters as maximum.
function limitCardName(cardName) {
    let fixedCardName = cardName;

    if (fixedCardName.length <= 179) {
        return fixedCardName;
    }

    fixedCardName = fixedCardName.slice(0, 180);

    // * If the last character is not a space, it will be removed until it finds one,
    // * to avoid cutting a word in half.
    while (fixedCardName[fixedCardName.length - 1] !== ' ') {
        fixedCardName = fixedCardName.slice(0, -1);
    }

    // * The original card name is replaced by the new one with an ellipsis.
    fixedCardName = fixedCardName.slice(0, -1) + '...';

    return fixedCardName;
}
