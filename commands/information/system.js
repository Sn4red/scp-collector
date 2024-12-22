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
            .setTitle('<a:white_chart:1230351617736446022>   Progress System')
            .setDescription('<a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694><a:white_line:1228541666131185694>\n' +
                            'Each user has a rank, level, and XP. The ranks are as follows:\n\n' +
                            '- Class D  <:class_d:1230353704972976128>  (50 XP per level)\n' +
                            '- Security Officer  <:security_officer:1230354487559061504>  (100 XP per level)\n' +
                            '- Investigator  <:investigator:1230354913780039793>  (250 XP per level)\n' +
                            '- Containment Specialist  <:containment_specialist:1230355217607037040>  (500 XP per level)\n' +
                            '- Field Agent  <:field_agent:1230356442913968128>  (1500 XP per level)\n' +
                            '- Site Director  <:site_director:1230357575644479539>  (5000 XP per level)\n' +
                            '- O5 Council Member  <:o5_council_member:1230357613049286797>  (10000 XP per level / Unlimited levels)\n\n' +
                            'When you start playing, you begin with the rank of Class D at level 1. Each rank consists of 500 levels to ascend to the next. XP is what makes you level up, and consequently, rank up. ' +
                            'This is obtained by capturing SCPs. The rarity (class) and texture (holographic) of the SCP influences the amount of XP you will receive. You can use /`card` to see your progress in the game, ' +
                            'such as your rank, level, XP, the number of SCPs captured, and more. Note that once you reach the rank of O5 Council Member, the levels are unlimited.')
            .setThumbnail('attachment://system-thumbnail.jpg')
            .setTimestamp()
            .setFooter({ text: 'Use /commands to see the full list of available commands.', iconURL: 'attachment://system-iconFooter.gif' });

        await interaction.editReply({ embeds: [embed], files: [thumbnail, iconFooter] });
    },
};
