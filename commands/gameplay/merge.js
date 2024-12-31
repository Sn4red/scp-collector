const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const firebase = require('../../utils/firebase');
const path = require('node:path');

const database = firebase.firestore();

// * The crystals obtained based on the SCP class by a normal user.
const normalCrystals = {
    'Safe': 10,
    'Euclid': 20,
    'Keter': 30,
    'Thaumiel': 50,
    'Apollyon': 100,
};

// * The crystals obtained based on the SCP class by a premium user.
const premiumCrystals = {
    'Safe': 20,
    'Euclid': 40,
    'Keter': 60,
    'Thaumiel': 100,
    'Apollyon': 200,
};

module.exports = {
    cooldown: 60 * 2,
    data: new SlashCommandBuilder()
        .setName('merge')
        .setDescription('Merges 5 cards to turn it into a higher class card.'),
    async execute(interaction) {
        const userId = interaction.user.id;

        const userReference = database.collection('user').doc(userId);
        let userSnapshot = await userReference.get();

        // ! If the user is not registered, returns an error message.
        if (!userSnapshot.exists) {
            await interaction.reply({ content: '<a:error:1229592805710762128>  You are not registered! Use /`card` to start playing.', ephemeral: true });
            return;
        }

        // * Aggregation query to the database counting the number of obtained SCPs.
        const obtainingReference = database.collection('user').doc(userId).collection('obtaining');
        const obtainingSnapshot = await obtainingReference.count().get();

        const SCPCount = obtainingSnapshot.data().count;

        // ! If the user has less than 5 cards, returns an error message.
        if (SCPCount < 5) {
            await interaction.reply({ content: '<a:error:1229592805710762128>  You need at least 5 cards in your possession to do this operation.', ephemeral: true });
            return;
        }

        const modal = displayModal(userId);

        await interaction.showModal(modal);

        const filter = (userModal) => userModal.customId === `modal-${userId}`;
        const time = 1000 * 50;

        interaction.awaitModalSubmit({ filter: filter, time: time }).then(async (modalInteraction) => {
            const card1Value = modalInteraction.fields.getTextInputValue('txtCard1');
            const card2Value = modalInteraction.fields.getTextInputValue('txtCard2');
            const card3Value = modalInteraction.fields.getTextInputValue('txtCard3');
            const card4Value = modalInteraction.fields.getTextInputValue('txtCard4');
            const card5Value = modalInteraction.fields.getTextInputValue('txtCard5');

            // * Notify the Discord API that the interaction was received successfully and set a maximun timeout of 15 minutes.
            await modalInteraction.deferReply({ ephemeral: true });

            const fieldsValidation = validateFields(card1Value, card2Value, card3Value, card4Value, card5Value);

            // ! If the fields have wrong data, returns an error message.
            if (fieldsValidation.errorState) {
                await modalInteraction.editReply(fieldsValidation.errorMessage);
                return;
            }

            try {
                let foundCard1 = null;
                let foundCard2 = null;
                let foundCard3 = null;
                let foundCard4 = null;
                let foundCard5 = null;

                let cardId = null;   
                let classCard = null;
                let file = null;
                let name = null;

                let image = null;

                let holographicEmojiLeft = null;
                let holographicEmojiRight = null;
                let embedColor = null;

                await database.runTransaction(async (transaction) => {
                    // * Retrieves the user data from the database. This is used below to validate if the user is premium or not.
                    userSnapshot = await transaction.get(userReference);

                    // * This is performed to get the premium status and give the correct
                    // * number of crystals accordingly.
                    const userDocument = userSnapshot.data();
                    const isPremium = userDocument.premium;

                    // * This array will store the document's ID of the cards found in the user's collection. If 2 queries find the same card, it will not be repeated.
                    // * The new values of the array are being pushed inside the findCard function.
                    const cards = ['decoy'];

                    foundCard1 = await findCard(userId, fieldsValidation.fixedCard1Value, cards, transaction);
                    foundCard2 = await findCard(userId, fieldsValidation.fixedCard2Value, foundCard1.cards, transaction);
                    foundCard3 = await findCard(userId, fieldsValidation.fixedCard3Value, foundCard2.cards, transaction);
                    foundCard4 = await findCard(userId, fieldsValidation.fixedCard4Value, foundCard3.cards, transaction);
                    foundCard5 = await findCard(userId, fieldsValidation.fixedCard5Value, foundCard4.cards, transaction);

                    const existingValidation = validateExistence(foundCard1, fieldsValidation.fixedCard1Value, foundCard2, fieldsValidation.fixedCard2Value, foundCard3, fieldsValidation.fixedCard3Value, foundCard4, fieldsValidation.fixedCard4Value, foundCard5, fieldsValidation.fixedCard5Value);

                    // ! If one or more cards are not found in the user's collection, returns an error message.
                    if (existingValidation.errorState) {
                        throw new Error(existingValidation.errorMessage);
                    }

                    const classesValidation = validateClasses(foundCard1.collection, fieldsValidation.fixedCard1Value, foundCard2.collection, fieldsValidation.fixedCard2Value, foundCard3.collection, fieldsValidation.fixedCard3Value, foundCard4.collection, fieldsValidation.fixedCard4Value, foundCard5.collection, fieldsValidation.fixedCard5Value);

                    // ! If one or more cards are Thaumiel or Apollyon, returns an error message.
                    if (classesValidation.errorState) {
                        throw new Error(classesValidation.errorMessage);
                    }

                    /**
                     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
                     * * The command passes all validations and the operation is performed. *
                     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
                     */

                    // * In this section, the cards are being categorized by their class.
                    const foundCards = [foundCard1, foundCard2, foundCard3, foundCard4, foundCard5];

                    let safe = 0;
                    let euclid = 0;
                    let keter = 0;

                    for (let i = 0; i < foundCards.length; i++) {
                        if (foundCards[i].collection === 'Safe') {
                            safe++;
                        } else if (foundCards[i].collection === 'Euclid') {
                            euclid++;
                        } else if (foundCards[i].collection === 'Keter') {
                            keter++;
                        }
                    }

                    // * In this section, there is a comparison to determine which class is the highest.
                    // * If there's a tie, it will be managed too.
                    let resultingClass = null;

                    if (safe > euclid && safe > keter) {
                        // * Safe is the highest.
                        resultingClass = 'Euclid';
                    } else if (euclid > safe && euclid > keter) {
                        // * Euclid is the highest.
                        resultingClass = 'Keter';
                    } else if (keter > safe && keter > euclid) {
                        // * Keter is the highest.
                        resultingClass = 'Thaumiel';
                    } else {
                        if (safe === euclid) {
                            // * Tie for Safe and Euclid.
                            resultingClass = disputeClassTie('Safe', 'Euclid');
                        } else if (safe === keter) {
                            // * Tie for Safe and Keter.
                            resultingClass = disputeClassTie('Safe', 'Keter');
                        } else {
                            // * Tie for Euclid and Keter.
                            resultingClass = disputeClassTie('Euclid', 'Keter');
                        }
                    }

                    // * Retrieves through Aggregation Query the numbers of documents contained in the collection.
                    const cardReference = database.collection('card').doc(resultingClass).collection(resultingClass.toLowerCase());
                    const cardSnapshot = await transaction.get(cardReference.count());

                    const classCount = cardSnapshot.data().count;

                    // * Using the Math object, a random number is obtained based on the number of cards,
                    // * and a random card is selected matching the random number with the 'random' field in the document.
                    // * We add 1 to the result in case it returns 0.
                    const randomNumber = Math.floor(Math.random() * classCount) + 1;

                    const selectedCardReference = database.collection('card').doc(resultingClass).collection(resultingClass.toLowerCase());
                    const selectedCardQuery = selectedCardReference.where('random', '==', randomNumber);
                    const selectedCardSnapshot = await selectedCardQuery.get();

                    const cardDocument = selectedCardSnapshot.docs[0];
                    const selectedCardDocument = cardDocument.data();

                    // * Card data.
                    cardId = cardDocument.id;   
                    classCard = resultingClass;
                    file = selectedCardDocument.file;
                    name = selectedCardDocument.name;

                    const holograhicValue = holographicProbability();

                    await transaction.delete(foundCard1.obtentionReference);
                    await transaction.delete(foundCard2.obtentionReference);
                    await transaction.delete(foundCard3.obtentionReference);
                    await transaction.delete(foundCard4.obtentionReference);
                    await transaction.delete(foundCard5.obtentionReference);

                    const tradeEntry = database.collection('user').doc(userId).collection('obtaining').doc();

                    await transaction.set(tradeEntry, {
                        card: database.collection('card').doc(classCard).collection(classCard.toLowerCase()).doc(cardId),
                        holographic: holograhicValue,
                    });

                    let crystals = null;

                    if (isPremium) {
                        crystals = premiumCrystals[classCard];
                    } else {
                        crystals = normalCrystals[classCard];
                    }

                    await transaction.update(userReference, {
                        crystals: firebase.firestore.FieldValue.increment(crystals),
                    });

                    const imagePath = path.join(__dirname, `../../images/scp/${cardId}.jpg`);
                    image = new AttachmentBuilder(imagePath);

                    switch (holograhicValue) {
                        case 'Emerald':
                            holographicEmojiLeft = '<a:emerald:1228923470239367238>';
                            holographicEmojiRight = holographicEmojiLeft;
                            embedColor = 0x00b65c;

                            break;
                        case 'Golden':
                            holographicEmojiLeft = '<a:golden:1228925086690443345>';
                            holographicEmojiRight = holographicEmojiLeft;
                            embedColor = 0xffd700;

                            break;
                        case 'Diamond':
                            holographicEmojiLeft = '<a:diamond:1228924014479671439>';
                            holographicEmojiRight = holographicEmojiLeft;
                            embedColor = 0x00bfff;

                            break;
                        default:
                            holographicEmojiLeft = '      ';
                            holographicEmojiRight = ' ';
                            embedColor = 0x010101;

                            break;
                    }
                });

                await modalInteraction.editReply('<a:mistery_box:1260631628229640253>  Merging your cards **.** <a:merge:1262543042364051529>');

                setTimeout(async () => {
                    await modalInteraction.editReply('<a:mistery_box:1260631628229640253>  Merging your cards **.** **.** <a:merge:1262543042364051529>');
                }, 1000);

                setTimeout(async () => {
                    await modalInteraction.editReply('<a:mistery_box:1260631628229640253>  Merging your cards **.** **.** **.** <a:merge:1262543042364051529>');
                }, 2000);

                setTimeout(async () => {
                    await modalInteraction.editReply('<a:mistery_box:1260631628229640253>  Merging your cards **.** **.** **.** **.** <a:merge:1262543042364051529>');
                }, 3000);

                setTimeout(async () => {
                    await modalInteraction.editReply('<a:mistery_box:1260631628229640253>  Merging your cards **.** **.** **.** **.** **.** <a:check:1235800336317419580>');
                }, 4000);

                const cardName = limitCardName(name);

                setTimeout(async () => {
                    const cardEmbed = new EmbedBuilder()
                        .setColor(embedColor)
                        .setTitle(`${holographicEmojiLeft}  Item #: \`${cardId}\` // \`${cardName}\``)
                        .addFields(
                            { name: '<:invader:1228919814555177021>  Class', value: `\`${classCard}\``, inline: true },
                            { name: '<:files:1228920361723236412>  File', value: `**[View Document](${file})**`, inline: true },
                        )
                        .setImage(`attachment://${cardId}.jpg`)
                        .setTimestamp();

                    await modalInteraction.editReply({
                        embeds: [cardEmbed],
                        files: [image],
                    });
                }, 5000);

                setTimeout(async () => {
                    await modalInteraction.followUp({ content: '<:summary:1262544727786651688>  Merge Summary:\n' +
                                                                `<:small_white_dash:1247247464172355695><:open_bracket:1262546369793491014>\`${fieldsValidation.fixedCard1Value}\`<:close_bracket:1262546397840801912>// ${foundCard1.collection}\n` +
                                                                `<:small_white_dash:1247247464172355695><:open_bracket:1262546369793491014>\`${fieldsValidation.fixedCard2Value}\`<:close_bracket:1262546397840801912>// ${foundCard2.collection}\n` +
                                                                `<:small_white_dash:1247247464172355695><:open_bracket:1262546369793491014>\`${fieldsValidation.fixedCard3Value}\`<:close_bracket:1262546397840801912>// ${foundCard3.collection}\n` +
                                                                `<:small_white_dash:1247247464172355695><:open_bracket:1262546369793491014>\`${fieldsValidation.fixedCard4Value}\`<:close_bracket:1262546397840801912>// ${foundCard4.collection}\n` +
                                                                `<:small_white_dash:1247247464172355695><:open_bracket:1262546369793491014>\`${fieldsValidation.fixedCard5Value}\`<:close_bracket:1262546397840801912>// ${foundCard5.collection}\n` +
                                                                `${holographicEmojiLeft}<:parenthesis_left:1262547567795900497>**\`${cardId}\`**<:parenthesis_right:1262547494202769470>${holographicEmojiRight}// **${classCard}**`,
                                                        ephemeral: true });
                }, 6000);
            } catch (error) {
                if (error.message.includes('The following cards were not found in your collection:') ||
                    error.message.includes('The following cards are Thaumiel or Apollyon:')) {

                    await modalInteraction.editReply(`<a:error:1229592805710762128>  Card Merge cancelled! ${error.message}`);
                } else {
                    console.log(`${new Date()} >>> *** ERROR: merge.js *** by ${userId} (${interaction.user.username})`);
                    console.error(error);

                    await modalInteraction.editReply('<a:error:1229592805710762128>  An error has occurred while trying to do the merge. Please try again.');
                }
            }
        }).catch(async (error) => {
            console.log(`${new Date()} >>> *** WARNING: merge.js *** by ${userId} (${interaction.user.username})`);
            console.error(error);

            await interaction.followUp({ content: '<a:error:1229592805710762128>  Card Merge cancelled due to inactivity.', ephemeral: true });
        });
    },
};

// * Function that builds the modal.
function displayModal(userId) {
    const modal = new ModalBuilder()
        .setCustomId(`modal-${userId}`)
        .setTitle('Card Merge  📑');

    const txtCard1 = new TextInputBuilder()
        .setCustomId('txtCard1')
        .setLabel('📄  Card 1:')
        .setStyle(TextInputStyle.Short)
        .setMinLength(7)
        .setMaxLength(8)
        .setPlaceholder('SCP-000')
        .setRequired(true);

    const txtCard2 = new TextInputBuilder()
        .setCustomId('txtCard2')
        .setLabel('📄  Card 2:')
        .setStyle(TextInputStyle.Short)
        .setMinLength(7)
        .setMaxLength(8)
        .setPlaceholder('SCP-000')
        .setRequired(true);

    const txtCard3 = new TextInputBuilder()
        .setCustomId('txtCard3')
        .setLabel('📄  Card 3:')
        .setStyle(TextInputStyle.Short)
        .setMinLength(7)
        .setMaxLength(8)
        .setPlaceholder('SCP-000')
        .setRequired(true);

    const txtCard4 = new TextInputBuilder()
        .setCustomId('txtCard4')
        .setLabel('📄  Card 4:')
        .setStyle(TextInputStyle.Short)
        .setMinLength(7)
        .setMaxLength(8)
        .setPlaceholder('SCP-000')
        .setRequired(true);

    const txtCard5 = new TextInputBuilder()
        .setCustomId('txtCard5')
        .setLabel('📄  Card 5:')
        .setStyle(TextInputStyle.Short)
        .setMinLength(7)
        .setMaxLength(8)
        .setPlaceholder('SCP-000')
        .setRequired(true);

    const card1Row = new ActionRowBuilder().addComponents(txtCard1);
    const card2Row = new ActionRowBuilder().addComponents(txtCard2);
    const card3Row = new ActionRowBuilder().addComponents(txtCard3);
    const card4Row = new ActionRowBuilder().addComponents(txtCard4);
    const card5Row = new ActionRowBuilder().addComponents(txtCard5);

    modal.addComponents(card1Row, card2Row, card3Row, card4Row, card5Row);

    return modal;
}

// *The function validates that the fields of the modal are entered correctly.
function validateFields(card1Value, card2Value, card3Value, card4Value, card5Value) {
    // * The card IDs are formatted to uppercase.
    const fixedCard1Value = card1Value.toUpperCase();
    const fixedCard2Value = card2Value.toUpperCase();
    const fixedCard3Value = card3Value.toUpperCase();
    const fixedCard4Value = card4Value.toUpperCase();
    const fixedCard5Value = card5Value.toUpperCase();

    // * Validates that the card format is correct.
    const card1Validation = /^scp-\d{3,4}$/i.test(fixedCard1Value);
    const card2Validation = /^scp-\d{3,4}$/i.test(fixedCard2Value);
    const card3Validation = /^scp-\d{3,4}$/i.test(fixedCard3Value);
    const card4Validation = /^scp-\d{3,4}$/i.test(fixedCard4Value);
    const card5Validation = /^scp-\d{3,4}$/i.test(fixedCard5Value);

    let errorMessage = '<a:error:1229592805710762128>  The following data was entered incorrectly:\n';
    let errorState = false;

    if (!card1Validation) {
        errorMessage += '<:small_white_dash:1247247464172355695>Card 1. Card ID format is `SCP-XXXX`.\n';
        errorState = true;
    }

    if (!card2Validation) {
        errorMessage += '<:small_white_dash:1247247464172355695>Card 2. Card ID format is `SCP-XXXX`.\n';
        errorState = true;
    }

    if (!card3Validation) {
        errorMessage += '<:small_white_dash:1247247464172355695>Card 3. Card ID format is `SCP-XXXX`.\n';
        errorState = true;
    }

    if (!card4Validation) {
        errorMessage += '<:small_white_dash:1247247464172355695>Card 4. Card ID format is `SCP-XXXX`.\n';
        errorState = true;
    }

    if (!card5Validation) {
        errorMessage += '<:small_white_dash:1247247464172355695>Card 5. Card ID format is `SCP-XXXX`.';
        errorState = true;
    }

    return { fixedCard1Value, fixedCard2Value, fixedCard3Value, fixedCard4Value, fixedCard5Value, errorState, errorMessage };
}

// * This function searches for the card data through all the card collections, and then with the reference it checks if the user has the card in his collection.
async function findCard(userId, cardId, cards, transaction) {
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
                                                        .where('holographic', '==', 'Normal')
                                                        .where(firebase.firestore.FieldPath.documentId(), 'not-in', cards).limit(1);
            const obtentionSnapshot = await transaction.get(obtentionQuery);

            if (!obtentionSnapshot.empty) {
                cards.push(obtentionSnapshot.docs[0].id);

                const pathSegments = snapshot.ref.path.split('/');
                const collectionName = pathSegments[1];

                return {
                    wasFound: true,
                    cards: cards,
                    collection: collectionName,
                    cardId: cardId,
                    obtentionReference: obtentionSnapshot.docs[0].ref,
                };
            } else {
                return {
                    wasFound: false,
                    cards: cards,
                };
            }
        }
    }

    return {
        wasFound: false,
        cards: cards,
    };
}

// * This function validates that the cards entered by the user were found.
function validateExistence(card1, card1Id, card2, card2Id, card3, card3Id, card4, card4Id, card5, card5Id) {
    let errorMessage = 'The following cards were not found in your collection:\n';
    let errorState = false;

    if (!card1.wasFound) {
        errorMessage += `<:small_white_dash:1247247464172355695>**${card1Id}**\n`;
        errorState = true;
    }

    if (!card2.wasFound) {
        errorMessage += `<:small_white_dash:1247247464172355695>**${card2Id}**\n`;
        errorState = true;
    }

    if (!card3.wasFound) {
        errorMessage += `<:small_white_dash:1247247464172355695>**${card3Id}**\n`;
        errorState = true;
    }

    if (!card4.wasFound) {
        errorMessage += `<:small_white_dash:1247247464172355695>**${card4Id}**\n`;
        errorState = true;
    }

    if (!card5.wasFound) {
        errorMessage += `<:small_white_dash:1247247464172355695>**${card5Id}**`;
        errorState = true;
    }

    return { errorState, errorMessage };
}

// * This function validates that the cards entered by the user are not Thaumiel or Apollyon.
function validateClasses(classCard1, cardName1, classCard2, cardName2, classCard3, cardName3, classCard4, cardName4, classCard5, cardName5) {
    let errorMessage = 'The following cards are Thaumiel or Apollyon:\n';
    let errorState = false;

    if (classCard1 === 'Thaumiel' || classCard1 === 'Apollyon') {
        errorMessage += `<:small_white_dash:1247247464172355695>**${cardName1}** (${classCard1})\n`;
        errorState = true;
    }

    if (classCard2 === 'Thaumiel' || classCard2 === 'Apollyon') {
        errorMessage += `<:small_white_dash:1247247464172355695>**${cardName2}** (${classCard2})\n`;
        errorState = true;
    }

    if (classCard3 === 'Thaumiel' || classCard3 === 'Apollyon') {
        errorMessage += `<:small_white_dash:1247247464172355695>**${cardName3}** (${classCard3})\n`;
        errorState = true;
    }

    if (classCard4 === 'Thaumiel' || classCard4 === 'Apollyon') {
        errorMessage += `<:small_white_dash:1247247464172355695>**${cardName4}** (${classCard4})\n`;
        errorState = true;
    }

    if (classCard5 === 'Thaumiel' || classCard5 === 'Apollyon') {
        errorMessage += `<:small_white_dash:1247247464172355695>**${cardName5}** (${classCard5})`;
        errorState = true;
    }

    return { errorState, errorMessage };
}

// * This funtion manages the tie between classes, giving a random one.
function disputeClassTie(class1, class2) {
    const result = (Math.floor(Math.random() * 2) == 0);

    if (result) {
        switch (class1) {
            case 'Safe':
                return 'Euclid';
            case 'Euclid':
                return 'Keter';
            case 'Keter':
                return 'Thaumiel';
        }
    } else {
        switch (class2) {
            case 'Safe':
                return 'Euclid';
            case 'Euclid':
                return 'Keter';
            case 'Keter':
                return 'Thaumiel';
        }
    }
}

// * This function calculates the probability of getting a holographic card.
function holographicProbability() {
    const randomNumber = Math.random();

    /**
     * * This algorithm sets the probability of drawing holographic cards as follows:
     * * - Diamond 0.7%
     * * - Golden 2%
     * * - Emerald 7%
     */
    
    if (randomNumber < 0.007) {
        return 'Diamond';
    } else if (randomNumber < 0.02) {
        return 'Golden';
    } else if (randomNumber < 0.07) {
        return 'Emerald';
    } else {
        return 'Normal';
    }
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
