const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, REST, Routes } = require('discord.js');
const http = require('http');
const fs = require('fs');

http.createServer((req, res) => res.end('Bot is Active!')).listen(process.env.PORT || 3000);

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]
});

const OWNER_ID = "1344009623887151155";
const ADMIN_ROLES = ["1508200281429770412", "1509306208517881866", "1509740495486587073", "1517511232867930112"];

let warnings = {};
if (fs.existsSync('./warnings.json')) {
    warnings = JSON.parse(fs.readFileSync('./warnings.json', 'utf8'));
}

function saveWarnings() {
    fs.writeFileSync('./warnings.json', JSON.stringify(warnings, null, 4));
}

function hasPermission(member) {
    if (member.id === OWNER_ID) return true;
    return member.roles.cache.some(role => ADMIN_ROLES.includes(role.id));
}

client.on('ready', async () => {
    const commands = [
        new SlashCommandBuilder().setName('تحذير').setDescription('تحذير عضو')
            .addUserOption(o => o.setName('الشخص').setDescription('الشخص المراد تحذيره').setRequired(true))
            .addStringOption(o => o.setName('السبب').setDescription('سبب التحذير').setRequired(true)),
        new SlashCommandBuilder().setName('شيل').setDescription('إزالة تحذيرات الشخص')
            .addUserOption(o => o.setName('الشخص').setDescription('الشخص المراد مسح تحذيراته').setRequired(true)),
        new SlashCommandBuilder().setName('منشن').setDescription('رسالة للكل (للمالك)')
            .addStringOption(o => o.setName('وصف').setDescription('نص الرسالة').setRequired(true))
    ];
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'منشن') {
        if (interaction.user.id !== OWNER_ID) return interaction.reply({ content: "للمالك فقط!", ephemeral: true });
        await interaction.reply({ content: "جاري الإرسال...", ephemeral: true });
        interaction.guild.members.cache.forEach(async m => { if (!m.user.bot) m.send(interaction.options.getString('وصف')).catch(() => {}); });
    }

    if (interaction.commandName === 'تحذير') {
        if (!hasPermission(interaction.member)) return interaction.reply({ content: "ليس لديك صلاحية!", ephemeral: true });
        const target = interaction.options.getUser('الشخص');
        const reason = interaction.options.getString('السبب');
        if (!warnings[target.id]) warnings[target.id] = [];
        warnings[target.id].push(reason);
        saveWarnings();

        const embed = new EmbedBuilder().setColor(0xFF0000).setTitle('⚠🚨 تم تحذيرك').setDescription(`السبب: ${reason}`);
        target.send({ embeds: [embed] }).catch(() => {});
        interaction.reply({ content: `تم تحذير ${target.username} 🚨` });
    }

    if (interaction.commandName === 'شيل') {
        if (!hasPermission(interaction.member)) return interaction.reply({ content: "ليس لديك صلاحية!", ephemeral: true });
        const target = interaction.options.getUser('الشخص');
        warnings[target.id] = []; saveWarnings();
        interaction.reply(`تم مسح تحذيرات ${target.username} ✅`);
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (message.content.includes("السلام عليكم")) message.reply("وعليكم السلام ارحب 👋");
    
            if (message.content.startsWith("-تعال")) {
        const target = message.mentions.members.first();
        if (target) {
            // هنا قمنا باستخدام <@${target.id}> لعمل المنشن الفعلي
            target.send(`يطلبك ${message.author.username} في الروم: **${message.channel.name}**\nالرابط: ${message.channel.url} 🔗\n\nإليك المنشن: <@${target.id}>`)
                .then(() => message.reply("تم إرسال الطلب مع المنشن للشخص في الخاص 📩"))
                .catch(() => message.reply("عذراً، لم أستطع الإرسال، ربما الشخص مغلق الرسائل الخاصة 🔒"));
        } else {
            message.reply("يرجى عمل منشن للشخص الذي تريد دعوته! ⚠️");
        }
    }



    if (message.content.startsWith("#تحذيرات")) {
        const target = message.mentions.users.first() || message.author;
        const list = warnings[target.id] ? warnings[target.id].map((r, i) => `${i + 1}- ${r}`).join('\n') : "لا يوجد تحذيرات.";
        message.reply(`قائمة تحذيرات ${target.username}:\n${list} 📋`);
    }

    if (message.mentions.has(client.user) && !message.mentions.everyone && !message.mentions.here) {
        message.react('👀');
    }
});

client.login(process.env.DISCORD_TOKEN);
