const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, REST, Routes, ActivityType, AuditLogEvent } = require('discord.js');
const http = require('http');
const fs = require('fs');

http.createServer((req, res) => res.end('Bot is Active!')).listen(process.env.PORT || 3000);

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]
});

const OWNER_ID = "1344009623887151155";
const AUTHORIZED_USER = "1306034100544737461";
const ADMIN_ROLES = ["1508200281429770412", "1509306208517881866", "1509740495486587073", "1517511232867930112"];

// نظام مراقبة مفتوح لجميع الرومات عند تفعيل الأمر
let isWatching = false;
let warnings = {};

if (fs.existsSync('./warnings.json')) {
    warnings = JSON.parse(fs.readFileSync('./warnings.json', 'utf8'));
}

function saveWarnings() { fs.writeFileSync('./warnings.json', JSON.stringify(warnings, null, 4)); }
function hasPermission(member) { return member.id === OWNER_ID || member.roles.cache.some(r => ADMIN_ROLES.includes(r.id)); }

client.on('ready', async () => {
    client.user.setActivity('بث مباشر الآن!', { type: ActivityType.Streaming, url: 'https://www.twitch.tv/adsqwertt11' });
    
    const commands = [
        new SlashCommandBuilder().setName('تحذير').setDescription('تحذير عضو')
            .addUserOption(o => o.setName('الشخص').setDescription('الشخص المراد تحذيره').setRequired(true))
            .addStringOption(o => o.setName('السبب').setDescription('سبب التحذير').setRequired(true)),
        new SlashCommandBuilder().setName('شيل').setDescription('إزالة تحذيرات الشخص')
            .addUserOption(o => o.setName('الشخص').setDescription('الشخص المراد مسح تحذيراته').setRequired(true))
    ];
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log(`Bot is Ready: ${client.user.tag}`);
});

// نظام رصد الحذف الفوري (لا يحتاج انتظار - سرعة قصوى)
client.on('messageDelete', async message => {
    if (!message.author || message.author.bot || !isWatching) return;
    
    // تنفيذ سريع لكل عملية حذف في أي روم
    try {
        const auditLogs = await message.guild.fetchAuditLogs({ type: AuditLogEvent.MessageDelete, limit: 1 }).catch(() => {});
        const entry = auditLogs?.entries.first();
        const deleter = (entry && entry.target.id === message.author.id && entry.createdTimestamp > Date.now() - 5000) ? entry.executor : message.author;

        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle("🚨 تم كشف عملية حذف")
            .setDescription(`
**الشخص الذي حذف :** <@${deleter.id}>
**الشخص الذي انحذفت رسالته :** <@${message.author.id}>
**في روم :** <#${message.channel.id}>

**الرسالة التي حُذفت :**
> ${message.content || "رسالة فارغة"}
            `)
            .setTimestamp();
        
        message.channel.send({ content: `<@${deleter.id}> <@${message.author.id}>`, embeds: [embed] }).catch(() => {});
    } catch (e) { console.error("Error in fast delete log:", e); }
});

// أوامر السلاش
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'تحذير') {
        if (!hasPermission(interaction.member)) return interaction.reply({ content: "ليس لديك صلاحية!", ephemeral: true });
        const target = interaction.options.getUser('الشخص');
        const reason = interaction.options.getString('السبب');
        if (!warnings[target.id]) warnings[target.id] = [];
        warnings[target.id].push({ reason, admin: interaction.user.username });
        saveWarnings();
        await target.send({ content: `⚠️ تم تحذيرك! السبب: ${reason}` }).catch(() => {});
        await interaction.reply({ content: `تم تحذير ${target.username}`, ephemeral: true });
    }
    if (interaction.commandName === 'شيل') {
        if (!hasPermission(interaction.member)) return interaction.reply({ content: "ليس لديك صلاحية!", ephemeral: true });
        const target = interaction.options.getUser('الشخص');
        warnings[target.id] = [];
        saveWarnings();
        await interaction.reply({ content: `تم مسح تحذيرات ${target.username}`, ephemeral: true });
    }
});

// أوامر النص
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // تفعيل المراقبة في كل السيرفر (بدل الروم الواحد)
    if (message.content === "!الحذف" && (message.author.id === OWNER_ID || message.author.id === AUTHORIZED_USER)) {
        isWatching = !isWatching;
        message.reply(isWatching ? "✅ تم تفعيل المراقبة الفورية في جميع رومات السيرفر." : "❌ تم إيقاف المراقبة.");
    }

    // أمر المسح في الخاص (لرسائل البوت فقط)
    if (message.content === "امسح" && !message.guild) {
        const fetched = await message.channel.messages.fetch({ limit: 100 });
        fetched.filter(m => m.author.id === client.user.id).forEach(m => m.delete().catch(() => {}));
    }

    // أمر -تعال
    if (message.content.startsWith("-تعال")) {
        const target = message.mentions.members.first();
        if (target) {
            target.send(`يطلبك ${message.author.username} في الروم: ${message.channel.name}`)
                .then(() => message.reply("تم الإرسال للخاص 📩"))
                .catch(() => message.reply("تعذر الإرسال للخاص."));
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
