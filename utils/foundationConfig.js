// * Default accent color for containers.
const defaultAccentColor = 0x010101;

// * User ranks.
const ranks = [
    'Class D',
    'Security Officer',
    'Investigator',
    'Containment Specialist',
    'Field Agent',
    'Site Director',
    'O5 Council Member',
];

// * Probability of obtaining a certain SCP class for a normal user.
const normalClassProbabilities = [
    { name: 'Safe', probability: 45 },
    { name: 'Euclid', probability: 30 },
    { name: 'Keter', probability: 21 },
    { name: 'Thaumiel', probability: 3 },
    { name: 'Apollyon', probability: 1 },
];

// * Probability of obtaining a certain SCP class for a premium user.
const premiumClassProbabilities = [
    { name: 'Safe', probability: 40 },
    { name: 'Euclid', probability: 31 },
    { name: 'Keter', probability: 22 },
    { name: 'Thaumiel', probability: 4 },
    { name: 'Apollyon', probability: 3 },
];

// * Probability of obtaining a holographic card.
const holographicProbabilities = {
    'Emerald': 0.07,
    'Golden': 0.02,
    'Diamond': 0.007,
};

// * Market probability of obtaining a certain SCP class.
const marketClassProbabilities = [
    { name: 'Safe', probability: 43 },
    { name: 'Euclid', probability: 30 },
    { name: 'Keter', probability: 21 },
    { name: 'Thaumiel', probability: 4 },
    { name: 'Apollyon', probability: 2 },
];

// * Market probability of obtaining a holographic card.
const marketHolographicProbabilities = {
    'Emerald': 0.20,
    'Golden': 0.10,
    'Diamond': 0.05,
};

// * Features to display for the containers.
// * Normal cards don't have a specific emoji.
const holographicFeatures = {
    'Normal': {
        color: 0x010101,
    },
    'Emerald': {
        emoji: `${process.env.EMOJI_EMERALD}`,
        color: 0x00b65c,
    },
    'Golden': {
        emoji: `${process.env.EMOJI_GOLDEN}`,
        color: 0xffd700,
    },
    'Diamond': {
        emoji: `${process.env.EMOJI_DIAMOND}`,
        color: 0x00bfff,
    },
};

// * The XP obtained based on the SCP class by a normal user.
const normalXP = {
    'Safe': 5,
    'Euclid': 15,
    'Keter': 30,
    'Thaumiel': 100,
    'Apollyon': 200,
};

// * The XP obtained based on the SCP class by a premium user.
const premiumXP = {
    'Safe': 10,
    'Euclid': 30,
    'Keter': 60,
    'Thaumiel': 200,
    'Apollyon': 400,
};

// * The additional XP obtained based on the holographic type.
const holographicXP = {
    'Normal': 0,
    'Emerald': 40,
    'Golden': 70,
    'Diamond': 100,
};

// * Maximum XP required per level (500 levels per rank) based on the user's
// * rank.
const userMaxXP = {
    'Class D': 50,
    'Security Officer': 100,
    'Investigator': 250,
    'Containment Specialist': 500,
    'Field Agent': 1500,
    'Site Director': 5000,
    'O5 Council Member': 10000,
};

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

// * The prices for each SCP class.
const cardClassPrices = {
    'Safe': 1000,
    'Euclid': 2000,
    'Keter': 3000,
    'Thaumiel': 5000,
    'Apollyon': 10000,
};

// * The additional price for a holographic feature on a card.
const cardHolographicPrices = {
    'Normal': 0,
    'Emerald': 200,
    'Golden': 300,
    'Diamond': 500,
};

module.exports = {
    defaultAccentColor,
    ranks,
    normalClassProbabilities,
    premiumClassProbabilities,
    holographicProbabilities,
    marketClassProbabilities,
    marketHolographicProbabilities,
    holographicFeatures,
    normalXP,
    premiumXP,
    holographicXP,
    userMaxXP,
    normalCrystals,
    premiumCrystals,
    cardClassPrices,
    cardHolographicPrices,
};
