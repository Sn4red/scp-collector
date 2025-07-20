const {
    SlashCommandBuilder,
    AttachmentBuilder,
    MessageFlags,
    TextDisplayBuilder } = require('discord.js');
const Canvas = require('@napi-rs/canvas');
const fetch = require('node-fetch');
const { request } = require('undici');
const firebase = require('../../utils/firebase');
const premiumWhitelist = require('../../utils/premiumWhitelist');

const database = firebase.firestore();

const guildId = process.env.DISCORD_SERVER_ID;
const VIPRoleId = process.env.DISCORD_VIP_ROLE_ID;

module.exports = {
    cooldown: 60 * 7,
    data: new SlashCommandBuilder()
        .setName('card')
        .setDescription('Displays your personal card and progress details.'),
    async execute(interaction) {
        // * Notify the Discord API that the interaction was received
        // * successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply();

        const isPremium = await checkingUserPremiumStatus(
            interaction.user.id,
            interaction,
        );

        // * Database query is performed.
        const userReference = database
            .collection('user').doc(interaction.user.id);
        const userSnapshot = await userReference.get();

        // * If the user exists, the data is updated, in this case the nickame
        // * (if it was changed manually).
        if (userSnapshot.exists) {
            const document = userSnapshot.data();

            if (document.nickname !== interaction.user.username) {
                await userReference.update({
                    nickname: interaction.user.username,
                });
            }

            document.nickname = interaction.user.username;

            // * Uses the AttachmentBuilder class to process the file and be
            // * able to attach it in the reply.
            const attachment = await displayCard(
                document,
                userSnapshot.id,
                isPremium,
                interaction,
            );

            await interaction.editReply({
                files: [attachment],
            });
        } else {
            // * If the user doesn't exist, a new document is created before
            // * displaying the card.

            // * Formats the date in YYYY/MM/DD.
            const currentDate = new Date();

            const year = currentDate.getFullYear();
            const month = ('0' + (currentDate.getMonth() + 1)).slice(-2);
            const day = ('0' + currentDate.getDate()).slice(-2);

            const newUser = {
                acceptTradeOffers: true,
                dailyAttemptsRemaining: 5,
                issueDate: year + '/' + month + '/' + day,
                level: 1,
                nickname: interaction.user.username,
                crystals: 0,
                rank: 'Class D',
                xp: 0,
                card1Purchased: false,
                card2Purchased: false,
                card3Purchased: false,
                card4Purchased: false,
                card5Purchased: false,
            };

            await database.collection('user')
                .doc(interaction.user.id).set(newUser);

            // * Uses the AttachmentBuilder class to process the file and be
            // * attached in the reply.
            const attachment = await displayCard(
                newUser,
                interaction.user.id,
                isPremium,
                interaction,
            );

            await interaction.editReply({
                files: [attachment],
            });

            const message = new TextDisplayBuilder()
                .setContent(
                    `${process.env.EMOJI_WAVING_HAND}  New user! You can now ` +
                        'use commands to collect cards and more.',
                );

            await interaction.followUp({
                components: [message],
                flags: [MessageFlags.IsComponentsV2],
            });
        }
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

// * This function draws all the user's card and returns it as an attachment.
async function displayCard(document, userId, isPremium, interaction) {
    // * The numeric ID is extracted from the emoji ID to build the URL, which
    // * is then used in the canvas.
    const emojiClassD = process.env.EMOJI_CLASS_D;
    const emojiSecurityOfficer = process.env.EMOJI_SECURITY_OFFICER;
    const emojiInvestigator = process.env.EMOJI_INVESTIGATOR;
    const emojiContainmentSpecialist = process.env.EMOJI_CONTAINMENT_SPECIALIST;
    const emojiFieldAgent = process.env.EMOJI_FIELD_AGENT;
    const emojiSiteDirector = process.env.EMOJI_SITE_DIRECTOR;
    const emojiO5CouncilMember = process.env.EMOJI_O5_COUNCIL_MEMBER;
    const emojiCrystal = process.env.EMOJI_CRYSTAL;

    const emojiIdClassD = emojiClassD.match(/\d{15,}/g)[0];
    const emojiIdSecurityOfficer = emojiSecurityOfficer.match(/\d{15,}/g)[0];
    const emojiIdInvestigator = emojiInvestigator.match(/\d{15,}/g)[0];
    const emojiIdContainmentSpecialist = emojiContainmentSpecialist
        .match(/\d{15,}/g)[0];
    const emojiIdFieldAgent = emojiFieldAgent.match(/\d{15,}/g)[0];
    const emojiIdSiteDirector = emojiSiteDirector.match(/\d{15,}/g)[0];
    const emojiIdO5CouncilMember = emojiO5CouncilMember.match(/\d{15,}/g)[0];
    const emojiIdCrystal = emojiCrystal.match(/\d{15,}/g)[0];

    // * User data.
    const issueDate = document.issueDate;
    const id = userId;
    const nickname = document.nickname;
    const level = document.level;
    const rank = document.rank;
    const xp = document.xp.toString();
    const crystals = document.crystals.toString();
    const premium = isPremium;

    // * Aggregation query to the database counting the number of obtained SCPs.
    const obtainingReference = database.collection('user')
        .doc(id).collection('obtaining');
    const obtainingSnapshot = await obtainingReference.count().get();

    const SCPCount = obtainingSnapshot.data().count;
    
    // * Creates a canvas of 450x250 pixels and obtain its context.
    // * The context will be used to modify the canvas.
    const canvas = Canvas.createCanvas(450, 250);
    const context = canvas.getContext('2d');
    
    // * Loads the background image onto the canvas and uses its dimensions to
    // * stretch it.
    const background = await Canvas.loadImage('./images/card/background.png');
    context.drawImage(background, 0, 0, canvas.width, canvas.height);
    
    // * Card border.
    context.strokeStyle = '#000000';
    context.lineWidth = 10;
    context.strokeRect(0, 0, canvas.width, canvas.height);
    
    // * User photo border.
    context.strokeStyle = '#FFFFFF';
    context.lineWidth = 5;
    context.strokeRect(25, 55, 100, 100);
    
    // * Header
    context.font = 'bold 15px Roboto Condensed';
    context.fillStyle = '#FFFFFF';
    context.fillText('SCP FOUNDATION', 175, 28);
    
    // * Code name.
    context.font = 'bold 16px Roboto Condensed';
    context.fillStyle = '#FFFFFF';
    context.fillText('Agent:', 145, 65);
    
    context.font = 'bold 14px Roboto Condensed';
    context.fillText(nickname, 194, 65);
    
    // * Rank.
    context.font = 'bold 16px Roboto Condensed';
    context.fillStyle = '#FFFFFF';
    context.fillText('Rank:', 145, 91);
    
    context.font = 'bold 14px Roboto Condensed';
    context.fillText(rank, 188, 91);

    // * Loads the rank emoji according to the user's rank through an URL.
    let rankEmoji = null;

    switch (rank) {
        case 'Class D':
            rankEmoji = await loadEmoji(
                `https://cdn.discordapp.com/emojis/${emojiIdClassD}`,
            );
            break;
        case 'Security Officer':
            rankEmoji = await loadEmoji(
                `https://cdn.discordapp.com/emojis/${emojiIdSecurityOfficer}`,
            );
            break;
        case 'Investigator':
            rankEmoji = await loadEmoji(
                `https://cdn.discordapp.com/emojis/${emojiIdInvestigator}`,
            );
            break;
        case 'Containment Specialist':
            rankEmoji = await loadEmoji(
                'https://cdn.discordapp.com/emojis/' +
                    `${emojiIdContainmentSpecialist}`,
            );
            break;
        case 'Field Agent':
            rankEmoji = await loadEmoji(
                `https://cdn.discordapp.com/emojis/${emojiIdFieldAgent}`,
            );
            break;
        case 'Site Director':
            rankEmoji = await loadEmoji(
                `https://cdn.discordapp.com/emojis/${emojiIdSiteDirector}`,
            );
            break;
        case 'O5 Council Member':
            rankEmoji = await loadEmoji(
                `https://cdn.discordapp.com/emojis/${emojiIdO5CouncilMember}`,
            );
            break;
    }

    // * This section is used to calculate the position of the emoji according
    // * to the rank, and give it a margin.
    const rankTextWidth = context.measureText(rank).width;
    const emojiX = 188 + rankTextWidth + 10;

    context.drawImage(rankEmoji, emojiX, 91 - 17, 20, 20);
    
    // * Issue date.
    context.font = 'bold 10px Roboto Condensed';
    context.fillStyle = '#FFFFFF';
    context.fillText('Issue Date:', 145, 117);
    context.fillText(issueDate, 195, 117);
    
    // * Captured SCPs.
    context.font = 'bold 10px Roboto Condensed';
    context.fillStyle = '#FFFFFF';
    context.fillText('Captured SCPs:', 145, 132);
    context.fillText(SCPCount + '', 212, 132);

    // * Crystals.
    const crystalEmoji = await loadEmoji(
        `https://cdn.discordapp.com/emojis/${emojiIdCrystal}`,
    );

    context.font = 'bold 10px Roboto Condensed';
    context.fillStyle = '#FFFFFF';
    context.drawImage(crystalEmoji, 145, 140, 15, 15);
    context.fillText(crystals, 163, 151);
    
    // * Classified label.
    context.font = '13px Roboto Condensed';
    context.fillStyle = '#FF0000';
    context.fillText('[ Classified ]', 43, 28);
    
    // * User ID.
    context.font = 'bold 8px Roboto Condensed';
    context.fillStyle = '#FFFFFF';
    context.fillText(id, 367, 98);
  
    // * User progress bar.
    context.fillStyle = '#1A1A1A';
    context.fillRect(22, 210, 406, 15);
    
    // * User progress fill bar.
    const gradient = context.createLinearGradient(0, 213, 0, 222);
    gradient.addColorStop(0, '#AEE064');
    gradient.addColorStop(0.5, '#2E6C1F');
    context.fillStyle = gradient;
    
    // * Progress filling according to the rank.
    const multiplicationFactors = {
        'Class D': 8,
        'Security Officer': 4,
        'Investigator': 1.6,
        'Containment Specialist': 0.8,
        'Field Agent': 0.266,
        'Site Director': 0.08,
        'O5 Council Member': 0.04,
    };
    
    context.fillRect(25, 213, xp * multiplicationFactors[rank], 9);
    
    // * User level.
    context.font = 'bold 10px Roboto Condensed';
    context.fillStyle = '#FFFFFF';
    context.fillText(`Level: ${level}`, 25, 203);
    
    // * User XP.
    context.font = 'bold 10px Roboto Condensed';
    context.fillStyle = '#FFFFFF';
    
    const textWidth = context.measureText(xp).width;
    const xPosition = 22 + (406 - textWidth) / 2;
    
    context.fillText(xp + ' XP', xPosition, 203);
    
    // * User's next level.
    context.font = 'bold 10px Roboto Condensed';
    context.fillStyle = '#FFFFFF';
    
    let nextLevel = level;
    nextLevel++;
    
    if (rank !== 'O5 Council Member') {
        if (nextLevel === 501) {
            nextLevel = 'Rank Up!';
        }
    }

    if (nextLevel === 'Rank Up!') {
        context.fillText(`Next Level: ${nextLevel}`, 341, 203);
    } else if (nextLevel.toString().length > 3) {
        context.fillText(`Next Level: ${nextLevel}`, 355, 203);
    } else if (nextLevel.toString().length > 2) {
        context.fillText(`Next Level: ${nextLevel}`, 364, 203);
    } else {
        context.fillText(`Next Level: ${nextLevel}`, 369, 203);
    }
    
    // * Using undici to make HTTP request with better performance.
    // * Loading the user's photo.
    const { body: avatarBody } = await request(
        interaction.user.displayAvatarURL({ extension: 'jpg' }),
    );
    const avatar = await Canvas.loadImage(await avatarBody.arrayBuffer());
    
    // * Loading the logo.
    let logo = null;

    if (premium) {
        logo = await Canvas
            .loadImage('./images/card/scp-premium-logo-card.png');
    } else {
        logo = await Canvas.loadImage('./images/card/scp-normal-logo-card.png');
    }
    
    // * Loading the DataMatrix QR code.
    const qr = await Canvas.loadImage('./images/card/qr-datamatrix-card.png');
    
    // * Draws the images on the canvas.
    context.drawImage(avatar, 25, 55, 100, 100);
    context.drawImage(logo, 280, 120, 70, 70);
    context.drawImage(qr, 365, 5, 80, 80);
    
    return new AttachmentBuilder(
        await canvas.encode('png'),
        { name: `card-${nickname}.png` },
    );
}

// * This function is to convert the emoji URL into an image, to be used in the
// * canvas.
async function loadEmoji(emojiUrl) {
    const response = await fetch(emojiUrl);
    const image = await Canvas.loadImage(await response.buffer());

    return image;
}
