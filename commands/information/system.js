const path = require('node:path');
const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    cooldown: 60 * 30,
    data: new SlashCommandBuilder()
        .setName('system')
        .setDescription('Explains how ranks, levels, and XP work.'),
    async execute(interaction) {
        // * Notify the Discord API that the interaction was received successfully and set a maximun timeout of 15 minutes.
        await interaction.deferReply();

        const thumbnailPath = path.join(__dirname, '../../images/embed/system-thumbnail.jpg');
        const iconFooterPath = path.join(__dirname, '../../images/embed/system-iconFooter.gif');

        const thumbnail = new AttachmentBuilder(thumbnailPath);
        const iconFooter = new AttachmentBuilder(iconFooterPath);

        const embed = new EmbedBuilder()
            .setColor(0x010101)
            .setTitle(`${process.env.EMOJI_WHITE_CHART}   Progress System`)
            .setDescription(`${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}${process.env.EMOJI_WHITE_LINE}\n` +
                            'Each user has a rank, level, and XP. The ranks are as follows:\n\n' +
                            `- Class D  ${process.env.EMOJI_CLASS_D}  (50 XP per level)\n` +
                            `- Security Officer  ${process.env.EMOJI_SECURITY_OFFICER}  (100 XP per level)\n` +
                            `- Investigator  ${process.env.EMOJI_INVESTIGATOR}  (250 XP per level)\n` +
                            `- Containment Specialist  ${process.env.EMOJI_CONTAINMENT_SPECIALIST}  (500 XP per level)\n` +
                            `- Field Agent  ${process.env.EMOJI_FIELD_AGENT}  (1500 XP per level)\n` +
                            `- Site Director  ${process.env.EMOJI_SITE_DIRECTOR}  (5000 XP per level)\n` +
                            `- O5 Council Member  ${process.env.EMOJI_O5_COUNCIL_MEMBER}  (10000 XP per level / Unlimited levels)\n\n` +
                            'When you start playing, you begin with the rank of Class D at level 1. Each rank consists of 500 levels to ascend to the next. XP is what makes you level up, and consequently, rank up. ' +
                            'This is obtained by capturing SCPs. The rarity (class) and texture (holographic) of the SCP influences the amount of XP you will receive. You can use /`card` to see your progress in the game, ' +
                            'such as your rank, level, XP, the number of SCPs captured, and more. Note that once you reach the rank of O5 Council Member, the levels are unlimited.')
            .setThumbnail('attachment://system-thumbnail.jpg')
            .setTimestamp()
            .setFooter({ text: 'Use /commands to see the full list of available commands.', iconURL: 'attachment://system-iconFooter.gif' });

        await interaction.editReply({ embeds: [embed], files: [thumbnail, iconFooter] });
    },
};
