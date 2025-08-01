const {
    SlashCommandBuilder,
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    AttachmentBuilder,
    MediaGalleryItemBuilder,
    MediaGalleryBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ButtonBuilder,
    ButtonStyle,
    SectionBuilder,
    ContainerBuilder,
} = require('discord.js');

const firebase = require('../../utils/firebase');
const path = require('node:path');
const wrap = require('word-wrap');
const premiumWhitelist = require('../../utils/premiumWhitelist');

const database = firebase.firestore();

const guildId = process.env.DISCORD_SERVER_ID;
const VIPRoleId = process.env.DISCORD_VIP_ROLE_ID;

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
        const userSnapshot = await userReference.get();

        // ! If the user is not registered, returns an error message.
        if (!userSnapshot.exists) {
            const errorMessage = new TextDisplayBuilder()
                .setContent(
                    `${process.env.EMOJI_ERROR}  You are not registered! ` +
                        'Use /`card` to start playing.',
                );

            await interaction.reply({
                components: [errorMessage],
                flags: [
                    MessageFlags.IsComponentsV2,
                    MessageFlags.Ephemeral,
                ],
            });

            return;
        }

        // * Aggregation query to the database counting the number of obtained
        // * SCPs.
        const obtainingReference = database.collection('user')
            .doc(userId).collection('obtaining');
        const obtainingSnapshot = await obtainingReference.count().get();

        const SCPCount = obtainingSnapshot.data().count;

        // ! If the user has less than 5 cards, returns an error message.
        if (SCPCount < 5) {
            const errorMessage = new TextDisplayBuilder()
                .setContent(
                    `${process.env.EMOJI_ERROR}  You need at least 5 cards ` +
                        'in your possession to do this operation.',
                );

            await interaction.reply({
                components: [errorMessage],
                flags: [
                    MessageFlags.IsComponentsV2,
                    MessageFlags.Ephemeral,
                ],
            });

            return;
        }

        const isPremium = await checkingUserPremiumStatus(
            interaction.user.id,
            interaction,
        );

        // * The modal is created.
        const modal = displayModal(userId);

        await interaction.showModal(modal);

        // * The filter ensures that the modal interaction is only processed by
        // * the user who invoked the command.
        const filter = (userModal) => userModal.customId === `mdl-${userId}`;
        const time = 1000 * 60;

        // * Promise that resolves when the user submits the modal.
        interaction.awaitModalSubmit({ filter: filter, time: time })
            .then(async (modalInteraction) => {

            // * Notify the Discord API that the interaction was received
            // * successfully and set a maximun timeout of 15 minutes.
            await modalInteraction.deferReply({
                flags: [MessageFlags.Ephemeral],
            });

            const card1Value = modalInteraction.fields
                .getTextInputValue('txtCard1');
            const card2Value = modalInteraction.fields
                .getTextInputValue('txtCard2');
            const card3Value = modalInteraction.fields
                .getTextInputValue('txtCard3');
            const card4Value = modalInteraction.fields
                .getTextInputValue('txtCard4');
            const card5Value = modalInteraction.fields
                .getTextInputValue('txtCard5');

            const fieldsValidation = validateFields(
                card1Value,
                card2Value,
                card3Value,
                card4Value,
                card5Value,
            );

            // ! If the fields have wrong data, returns an error message.
            if (fieldsValidation.errorState) {
                const errorMessage = new TextDisplayBuilder()
                    .setContent(fieldsValidation.errorMessage);

                await modalInteraction.editReply({
                    components: [errorMessage],
                    flags: [MessageFlags.IsComponentsV2],
                });

                return;
            }

            try {
                let foundCard1 = null;
                let foundCard2 = null;
                let foundCard3 = null;
                let foundCard4 = null;
                let foundCard5 = null;

                let crystals = null;

                let cardId = null;   
                let cardClass = null;
                let cardFile = null;
                let cardName = null;

                // * The holographic probability is calculated.
                // * It's not restricted from non-premium users.
                const holographicValue = holographicProbability();
                const holographicFeature = getHolographicFeature(
                    holographicValue,
                );
                const holographicEmoji = holographicFeature.holographicEmoji;
                const containerColor = holographicFeature.containerColor;

                await database.runTransaction(async (transaction) => {
                    // * This array will store the document's ID of the cards
                    // * found in the user's collection. If 2 queries find the
                    // * same card, it will not be repeated.
                    // * The new values of the array are being pushed inside the
                    // * 'findCard' function.
                    const cards = ['decoy'];

                    foundCard1 = await findCard(
                        userId,
                        fieldsValidation.fixedCard1Value,
                        cards,
                        transaction,
                    );
                    foundCard2 = await findCard(
                        userId,
                        fieldsValidation.fixedCard2Value,
                        foundCard1.cards,
                        transaction,
                    );
                    foundCard3 = await findCard(
                        userId,
                        fieldsValidation.fixedCard3Value,
                        foundCard2.cards,
                        transaction,
                    );
                    foundCard4 = await findCard(
                        userId,
                        fieldsValidation.fixedCard4Value,
                        foundCard3.cards,
                        transaction,
                    );
                    foundCard5 = await findCard(
                        userId,
                        fieldsValidation.fixedCard5Value,
                        foundCard4.cards,
                        transaction,
                    );

                    // * The cards are being validated if they exist so the
                    // * function prepares error messages and the command can
                    // * display them if necessary.
                    const existingValidation = validateExistence(
                        foundCard1,
                        fieldsValidation.fixedCard1Value,
                        foundCard2,
                        fieldsValidation.fixedCard2Value,
                        foundCard3,
                        fieldsValidation.fixedCard3Value,
                        foundCard4,
                        fieldsValidation.fixedCard4Value,
                        foundCard5,
                        fieldsValidation.fixedCard5Value,
                    );

                    // ! If one or more cards are not found in the user's 
                    // ! collection, returns an error message.
                    if (existingValidation.errorState) {
                        throw new Error(existingValidation.errorMessage);
                    }

                    // * The card classes are being validated to ensure that
                    // * they are not Thaumiel or Apollyon.
                    const classesValidation = validateClasses(
                        foundCard1.collection,
                        fieldsValidation.fixedCard1Value,
                        foundCard2.collection,
                        fieldsValidation.fixedCard2Value,
                        foundCard3.collection,
                        fieldsValidation.fixedCard3Value,
                        foundCard4.collection,
                        fieldsValidation.fixedCard4Value,
                        foundCard5.collection,
                        fieldsValidation.fixedCard5Value,
                    );

                    // ! If one or more cards are Thaumiel or Apollyon, returns
                    // ! an error message.
                    if (classesValidation.errorState) {
                        throw new Error(classesValidation.errorMessage);
                    }

                    /**
                     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
                     * * The command passes all validations and the operation *
                     * * is performed.* * * * * * * * * * * * * * * * * * * * *
                     * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
                     */

                    // * In this section, the cards are being categorized by
                    // * their class.
                    const foundCards = [
                        foundCard1,
                        foundCard2,
                        foundCard3,
                        foundCard4,
                        foundCard5,
                    ];

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

                    // * In this section, there is a comparison to determine
                    // * which class is the highest. If there's a tie, it will
                    // * be managed too.
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

                    // * Retrieves through Aggregation Query the numbers of
                    // * documents contained in the collection.
                    const cardReference = database.collection('card')
                        .doc(resultingClass)
                        .collection(resultingClass.toLowerCase());
                    const cardSnapshot = await transaction
                        .get(cardReference.count());

                    const classCount = cardSnapshot.data().count;

                    // * Using the Math object, a random number is obtained
                    // * based on the number of cards, and a random card is
                    // * selected matching the random number with the 'random'
                    // * field in the document. We add 1 to the result in case
                    // * it returns 0.
                    const randomNumber = Math
                        .floor(Math.random() * classCount) + 1;

                    const selectedCardReference = database.collection('card')
                        .doc(resultingClass)
                        .collection(resultingClass.toLowerCase());
                    const selectedCardQuery = selectedCardReference
                        .where('random', '==', randomNumber);
                    const selectedCardSnapshot = await selectedCardQuery.get();

                    const cardDocument = selectedCardSnapshot.docs[0];
                    const selectedCardDocument = cardDocument.data();

                    // * Card data.
                    cardId = cardDocument.id;   
                    cardClass = resultingClass;
                    cardFile = selectedCardDocument.file;
                    cardName = selectedCardDocument.name;

                    // * With the references, the user's cards are deleted.
                    await transaction.delete(foundCard1.obtentionReference);
                    await transaction.delete(foundCard2.obtentionReference);
                    await transaction.delete(foundCard3.obtentionReference);
                    await transaction.delete(foundCard4.obtentionReference);
                    await transaction.delete(foundCard5.obtentionReference);

                    // * The entry of obtaining the card is inserted.
                    const obtainingEntry = database.collection('user')
                        .doc(userId).collection('obtaining').doc();

                    await transaction.set(obtainingEntry, {
                        card: database.collection('card')
                            .doc(cardClass)
                            .collection(cardClass.toLowerCase())
                            .doc(cardId),
                        holographic: holographicValue,
                    });

                    // * The user's crystals are incremented depending on the
                    // * class obtained and the premium status.
                    if (isPremium) {
                        crystals = premiumCrystals[cardClass];
                    } else {
                        crystals = normalCrystals[cardClass];
                    }

                    await transaction.update(userReference, {
                        crystals: firebase.firestore.FieldValue
                            .increment(crystals),
                    });
                });

                // * The image is fetched from the local path.
                const imagePath = path
                    .join(__dirname, `../../images/scp/${cardId}.jpg`);
                const image = new AttachmentBuilder(imagePath);

                // * The card container is created.
                const cardContainer = createCardContainer(
                    holographicEmoji,
                    containerColor,
                    cardId,
                    cardClass,
                    cardFile,
                    cardName,
                );

                // * The merge summary container is created.
                const mergeSummaryContainer = createMergeSummaryContainer(
                    holographicValue,
                    holographicEmoji,
                    crystals,
                    fieldsValidation.fixedCard1Value,
                    foundCard1.collection,
                    fieldsValidation.fixedCard2Value,
                    foundCard2.collection,
                    fieldsValidation.fixedCard3Value,
                    foundCard3.collection,
                    fieldsValidation.fixedCard4Value,
                    foundCard4.collection,
                    fieldsValidation.fixedCard5Value,
                    foundCard5.collection,
                    cardId,
                    cardClass,
                );

                const mergeMessage1 = new TextDisplayBuilder()
                    .setContent(
                        `${process.env.EMOJI_MISTERY_BOX}  Merging your ` +
                            `cards **.** ${process.env.EMOJI_MERGE}`,
                    );

                const mergeMessage2 = new TextDisplayBuilder()
                    .setContent(
                        `${process.env.EMOJI_MISTERY_BOX}  Merging your ` +
                            `cards **.** **.** ${process.env.EMOJI_MERGE}`,
                    );

                const mergeMessage3 = new TextDisplayBuilder()
                    .setContent(
                        `${process.env.EMOJI_MISTERY_BOX}  Merging your ` +
                            'cards **.** **.** **.** ' +
                            `${process.env.EMOJI_MERGE}`,
                    );

                const mergeMessage4 = new TextDisplayBuilder()
                    .setContent(
                        `${process.env.EMOJI_MISTERY_BOX}  Merging your ` +
                            'cards **.** **.** **.** **.** ' +
                            `${process.env.EMOJI_MERGE}`,
                    );

                const mergeMessage5 = new TextDisplayBuilder()
                    .setContent(
                        `${process.env.EMOJI_MISTERY_BOX}  Merging your ` +
                            'cards **.** **.** **.** **.** **.** ' +
                            `${process.env.EMOJI_MERGE}`,
                    );

                // * The edited replies are sent with a delay to simulate the
                // * merging process.
                await modalInteraction.editReply({
                    components: [mergeMessage1],
                    flags: [MessageFlags.IsComponentsV2],
                });

                setTimeout(async () => {
                    await modalInteraction.editReply({
                        components: [mergeMessage2],
                        flags: [MessageFlags.IsComponentsV2],
                    });
                }, 1000);

                setTimeout(async () => {
                    await modalInteraction.editReply({
                        components: [mergeMessage3],
                        flags: [MessageFlags.IsComponentsV2],
                    });
                }, 2000);

                setTimeout(async () => {
                    await modalInteraction.editReply({
                        components: [mergeMessage4],
                        flags: [MessageFlags.IsComponentsV2],
                    });
                }, 3000);

                setTimeout(async () => {
                    await modalInteraction.editReply({
                        components: [mergeMessage5],
                        flags: [MessageFlags.IsComponentsV2],
                    });
                }, 4000);

                setTimeout(async () => {
                    await modalInteraction.editReply({
                        components: [cardContainer, mergeSummaryContainer],
                        files: [image],
                        flags: [MessageFlags.IsComponentsV2],
                    });
                }, 5000);
            } catch (error) {
                if (error.message.includes('The following cards were not ' +
                        'found in your collection:') ||
                    error.message.includes('The following cards are Thaumiel ' +
                        'or Apollyon:')) {

                    const errorMessage = new TextDisplayBuilder()
                        .setContent(
                            `${process.env.EMOJI_ERROR}  Card Merge ` +
                                `cancelled! ${error.message}`,
                        );

                    await modalInteraction.editReply({
                        components: [errorMessage],
                        flags: [MessageFlags.IsComponentsV2],
                    });
                } else {
                    console.log(`${new Date()} >>> *** ERROR: merge.js *** ` +
                        `by ${userId} (${interaction.user.username})`);
                    console.error(error);

                    const errorMessage = new TextDisplayBuilder()
                        .setContent(
                            `${process.env.EMOJI_ERROR}  An error has ` +
                                'occurred while trying to do the merge. ' +
                                'Please try again.',
                        );

                    await modalInteraction.editReply({
                        components: [errorMessage],
                        flags: [MessageFlags.IsComponentsV2],
                    });
                }
            }
        }).catch(async (error) => {
            console.log(
                `${new Date()} >>> *** WARNING: merge.js *** by ${userId} ` +
                    `(${interaction.user.username})`,
            );
            console.error(error);

            const errorMessage = new TextDisplayBuilder()
                .setContent(
                    `${process.env.EMOJI_ERROR}  Card Merge cancelled due to ` +
                        'inactivity.',
                );

            await interaction.followUp({
                components: [errorMessage],
                flags: [
                    MessageFlags.IsComponentsV2,
                    MessageFlags.Ephemeral,
                ],
            });
        });
    },
};

// * This function validates through fetching if the user has the Patreon role.
// * That means is Premium. Also, if the user is not in the server, it will
// * return false.
async function checkingUserPremiumStatus(userId, interaction) {
    let isPremium = false;

    try {
        const guild = interaction.client.guilds.cache.get(guildId);
        const member = await guild.members.fetch(userId);

        const hasRole = member.roles.cache.has(VIPRoleId);

        isPremium = hasRole ? true : false;
    } catch {
        isPremium = false;
    }

    // * If the user it's in the premium whitelist, it will be considered as
    // * premium.
    if (premiumWhitelist.includes(userId)) {
        isPremium = true;
    }

    return isPremium;
}

// * Function that builds the modal.
function displayModal(userId) {
    const modal = new ModalBuilder()
        .setCustomId(`mdl-${userId}`)
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
function validateFields(
    card1Value,
    card2Value,
    card3Value,
    card4Value,
    card5Value,
) {
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

    let errorMessage = `${process.env.EMOJI_ERROR}  The following data was ` +
        'entered incorrectly:\n';
    let errorState = false;

    if (!card1Validation) {
        errorMessage += `${process.env.EMOJI_SMALL_WHITE_DASH}Card 1. Card ` +
            'ID format is `SCP-XXXX`.\n';
        errorState = true;
    }

    if (!card2Validation) {
        errorMessage += `${process.env.EMOJI_SMALL_WHITE_DASH}Card 2. Card ` +
            'ID format is `SCP-XXXX`.\n';
        errorState = true;
    }

    if (!card3Validation) {
        errorMessage += `${process.env.EMOJI_SMALL_WHITE_DASH}Card 3. Card ` +
            'ID format is `SCP-XXXX`.\n';
        errorState = true;
    }

    if (!card4Validation) {
        errorMessage += `${process.env.EMOJI_SMALL_WHITE_DASH}Card 4. Card ` +
            'ID format is `SCP-XXXX`.\n';
        errorState = true;
    }

    if (!card5Validation) {
        errorMessage += `${process.env.EMOJI_SMALL_WHITE_DASH}Card 5. Card ` +
            'ID format is `SCP-XXXX`.';
        errorState = true;
    }

    return {
        fixedCard1Value,
        fixedCard2Value,
        fixedCard3Value,
        fixedCard4Value,
        fixedCard5Value,
        errorState,
        errorMessage,
    };
}

// * This function searches for the card data through all the card collections,
// * and then with the reference it checks if the user has the card in the
// * collection.
async function findCard(userId, cardId, cards, transaction) {
    const cardReferences = [
        database.collection('card')
            .doc('Safe').collection('safe').doc(cardId),
        database.collection('card')
            .doc('Euclid').collection('euclid').doc(cardId),
        database.collection('card')
            .doc('Keter').collection('keter').doc(cardId),
        database.collection('card')
            .doc('Thaumiel').collection('thaumiel').doc(cardId),
        database.collection('card')
            .doc('Apollyon').collection('apollyon').doc(cardId),
    ];

    const cardPromises = cardReferences.map(reference => reference.get());

    const snapshots = await Promise.all(cardPromises);
    
    for (const snapshot of snapshots) {
        if (snapshot.exists) {
            const obtentionReference = database.collection('user')
                .doc(userId).collection('obtaining');
            // * The query checks if the user has the card by the reference. It
            // * also checks if the card is not holographic, and that it is not
            // * already in the 'cards' array, because it cannot be repeated.
            // * The limit is set to 1 because 1 document is enough to prove
            // * that the user has the card.
            const obtentionQuery = obtentionReference
                .where('card', '==', snapshot.ref)
                .where('holographic', '==', 'Normal')
                .where(
                    firebase.firestore.FieldPath.documentId(),
                    'not-in',
                    cards,
                )
                .limit(1);
            const obtentionSnapshot = await transaction.get(obtentionQuery);

            if (!obtentionSnapshot.empty) {
                cards.push(obtentionSnapshot.docs[0].id);

                // * It splits the reference path in an array to get the class
                // * name of the card.
                const pathSegments = snapshot.ref.path.split('/');
                const collectionName = pathSegments[1];

                // * If the card exist and the user has it in the collection.
                return {
                    wasFound: true,
                    cards: cards,
                    collection: collectionName,
                    cardId: cardId,
                    obtentionReference: obtentionSnapshot.docs[0].ref,
                };
            } else {
                // * If the card exist but the user does not have it in the
                // * collection.
                return {
                    wasFound: false,
                    cards: cards,
                };
            }
        }
    }

    // * If the card is not found in any collection, in other words, the card
    // * does not exist.
    return {
        wasFound: false,
        cards: cards,
    };
}

// * This function validates that the cards entered by the user were found.
function validateExistence(
    card1,
    card1Id,
    card2,
    card2Id,
    card3,
    card3Id,
    card4,
    card4Id,
    card5,
    card5Id,
) {
    let errorMessage = 'The following cards were not found in your ' +
        'collection:\n';
    let errorState = false;

    if (!card1.wasFound) {
        errorMessage += `${process.env.EMOJI_SMALL_WHITE_DASH}**${card1Id}**\n`;
        errorState = true;
    }

    if (!card2.wasFound) {
        errorMessage += `${process.env.EMOJI_SMALL_WHITE_DASH}**${card2Id}**\n`;
        errorState = true;
    }

    if (!card3.wasFound) {
        errorMessage += `${process.env.EMOJI_SMALL_WHITE_DASH}**${card3Id}**\n`;
        errorState = true;
    }

    if (!card4.wasFound) {
        errorMessage += `${process.env.EMOJI_SMALL_WHITE_DASH}**${card4Id}**\n`;
        errorState = true;
    }

    if (!card5.wasFound) {
        errorMessage += `${process.env.EMOJI_SMALL_WHITE_DASH}**${card5Id}**`;
        errorState = true;
    }

    return {
        errorState,
        errorMessage,
    };
}

// * This function validates that the cards entered by the user are not Thaumiel
// * or Apollyon.
function validateClasses(
    cardClass1,
    cardName1,
    cardClass2,
    cardName2,
    cardClass3,
    cardName3,
    cardClass4,
    cardName4,
    cardClass5,
    cardName5,
) {
    let errorMessage = 'The following cards are Thaumiel or Apollyon:\n';
    let errorState = false;

    if (cardClass1 === 'Thaumiel' || cardClass1 === 'Apollyon') {
        errorMessage += `${process.env.EMOJI_SMALL_WHITE_DASH}` +
            `**${cardName1}** (${cardClass1})\n`;
        errorState = true;
    }

    if (cardClass2 === 'Thaumiel' || cardClass2 === 'Apollyon') {
        errorMessage += `${process.env.EMOJI_SMALL_WHITE_DASH}` +
            `**${cardName2}** (${cardClass2})\n`;
        errorState = true;
    }

    if (cardClass3 === 'Thaumiel' || cardClass3 === 'Apollyon') {
        errorMessage += `${process.env.EMOJI_SMALL_WHITE_DASH}` +
            `**${cardName3}** (${cardClass3})\n`;
        errorState = true;
    }

    if (cardClass4 === 'Thaumiel' || cardClass4 === 'Apollyon') {
        errorMessage += `${process.env.EMOJI_SMALL_WHITE_DASH}` +
            `**${cardName4}** (${cardClass4})\n`;
        errorState = true;
    }

    if (cardClass5 === 'Thaumiel' || cardClass5 === 'Apollyon') {
        errorMessage += `${process.env.EMOJI_SMALL_WHITE_DASH}` +
            `**${cardName5}** (${cardClass5})`;
        errorState = true;
    }

    return {
        errorState,
        errorMessage,
    };
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
     * * This algorithm sets the probability of drawing holographic cards as
     * * follows:
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

// * This function returns the holographic emoji and container color for the
// * card, based on the holographic type.
function getHolographicFeature(cardHolographic) {
    let holographicEmoji = null;
    let containerColor = null;

    switch (cardHolographic) {
        case 'Emerald':
            holographicEmoji = `${process.env.EMOJI_EMERALD}`;
            containerColor = 0x00b65c;

            break;
        case 'Golden':
            holographicEmoji = `${process.env.EMOJI_GOLDEN}`;
            containerColor = 0xffd700;

            break;
        case 'Diamond':
            holographicEmoji = `${process.env.EMOJI_DIAMOND}`;
            containerColor = 0x00bfff;

            break;
        default:
            holographicEmoji = ' ';
            containerColor = 0x010101;

            break;
    }

    return {
        holographicEmoji: holographicEmoji,
        containerColor: containerColor,
    };
}

// * Creates the container for the card.
function createCardContainer(
    holographicEmoji,
    containerColor,
    cardId,
    cardClass,
    cardFile,
    cardName,
) {
    // * Through the word-wrap library, the card name is wrapped to a
    // * maximum of 46 characters per line, with no indentation. This
    // * is to ensure that the container size doesn't get longer.
    const fixedCardName = wrap(cardName, {
        indent: '',
        width: 46,
    });

    // * Card ID.
    const textCardId = new TextDisplayBuilder()
        .setContent(`## ${holographicEmoji}  Item #: \`${cardId}\``);

    // * Separator.
    const separator = new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small);

    // * Section.
    // * Class.
    const textClass = new TextDisplayBuilder()
        .setContent(
            `${process.env.EMOJI_INVADER}  Class\n` +
                `\`${cardClass}\``,
        );

    // * File.
    const buttonFile = new ButtonBuilder()
        .setURL(cardFile)
        .setLabel('File')
        .setEmoji(process.env.EMOJI_FILES)
        .setStyle(ButtonStyle.Link);

    const section = new SectionBuilder()
        .addTextDisplayComponents(textClass)
        .setButtonAccessory(buttonFile);

    // * Image.
    const mediaGalleryItemComponent = new MediaGalleryItemBuilder()
        .setURL(`attachment://${cardId}.jpg`);

    const mediaGallery = new MediaGalleryBuilder()
        .addItems(mediaGalleryItemComponent);

    // * Name.
    const textName = new TextDisplayBuilder()
        .setContent(`*${fixedCardName}*`);

    // * Container.
    const container = new ContainerBuilder()
        .setAccentColor(containerColor)
        .addTextDisplayComponents(textCardId)
        .addSeparatorComponents(separator)
        .addSectionComponents(section)
        .addMediaGalleryComponents(mediaGallery)
        .addTextDisplayComponents(textName);

    return container;
}

function createMergeSummaryContainer(
    holographicValue,
    holographicEmoji,
    crystals,
    cardId1,
    cardClass1,
    cardId2,
    cardClass2,
    cardId3,
    cardClass3,
    cardId4,
    cardClass4,
    cardId5,
    cardClass5,
    cardId,
    cardClass,
) {
    // * Header.
    const header = new TextDisplayBuilder()
        .setContent(`### ${process.env.EMOJI_SUMMARY}  Merge Summary`);

    // * Separator.
    const separator = new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small);

    // * Classes Summary.
    let classesSummaryText = `Crystals: +\`${crystals}\`` +
        `${process.env.EMOJI_CRYSTAL}\n\n` +
        `${process.env.EMOJI_SMALL_WHITE_DASH}[\`${cardId1}\`] ` +
        `\`${cardClass1}\`\n` +
        `${process.env.EMOJI_SMALL_WHITE_DASH}[\`${cardId2}\`] ` +
        `\`${cardClass2}\`\n` +
        `${process.env.EMOJI_SMALL_WHITE_DASH}[\`${cardId3}\`] ` +
        `\`${cardClass3}\`\n` +
        `${process.env.EMOJI_SMALL_WHITE_DASH}[\`${cardId4}\`] ` +
        `\`${cardClass4}\`\n` +
        `${process.env.EMOJI_SMALL_WHITE_DASH}[\`${cardId5}\`] ` +
        `\`${cardClass5}\`\n\n`;
            
    if (holographicValue === 'Normal') {
        classesSummaryText += `**Result: [\`${cardId}\`] \`${cardClass}\`**`;
    } else {
        classesSummaryText += `**Result:  ${holographicEmoji}  ` +
            `[\`${cardId}\`]  ${holographicEmoji}  \`${cardClass}\`**`;
    }

    const textClassesSummary = new TextDisplayBuilder()
        .setContent(classesSummaryText);

    // * Container.
    const container = new ContainerBuilder()
        .setAccentColor(0x010101)
        .addTextDisplayComponents(header)
        .addSeparatorComponents(separator)
        .addTextDisplayComponents(textClassesSummary);

    return container;
}
