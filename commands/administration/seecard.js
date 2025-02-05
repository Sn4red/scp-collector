const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const path = require('node:path');
const firebase = require('../../utils/firebase');

const database = firebase.firestore();

module.exports = {
    cooldown: 1,
    data: new SlashCommandBuilder()
        .setName('seecard')
        .setDescription('Shows the card from the database.')
        .addStringOption(option =>
            option.setName('card')
                .setDescription('Card ID to inquire about.')
                .setRequired(true)),
    async execute(interaction) {
        const userId = interaction.user.id;
        const adminId = '402580354936078336';

        // * Notify the Discord API that the interaction was received successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply();

        // ! If the user is not the administrator, returns an error message.
        if (userId !== adminId) {
            await interaction.editReply('<a:error:1229592805710762128>  You are not the administrator!');
            return;
        }

        const cardId = interaction.options.getString('card');

        const fixedCardId = cardId.toUpperCase();
        const cardIdValidation = /^scp-\d{3,4}$/i.test(fixedCardId);

        // ! If the field has wrong data, returns an error message.
        if (!cardIdValidation) {
            await interaction.editReply('<a:error:1229592805710762128>  Invalid card ID format. Please use the following format: `SCP-XXXX`.');
            return;
        }
        
        const foundCard = await findCard(fixedCardId);

        // ! If the card is not found, returns an error message.
        if (!foundCard.wasFound) {
            await interaction.editReply(`<a:magnifying:1232095150935642214>  Card \`${fixedCardId}\` not found!`);
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

        const holographicEmoji = ' ';
        const cardName = limitCardName(cardData.name);

        const cardEmbed = new EmbedBuilder()
            .setColor(0x010101)
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

// * This function searches for the card data through all the card collections.
async function findCard(cardId) {
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
            const cardData = snapshot.data();

            const pathSegments = snapshot.ref.path.split('/');
            const className = pathSegments[1];

            // * If the card exist, it returns the card data and the class name.
            return {
                wasFound: true,
                cardData: cardData,
                class: className,
            };
        }
    }

    // * If the card is not found in any collection, in other words, the card does not exist, it returns false.
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
