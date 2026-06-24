const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, REST, Routes, ActivityType, AuditLogEvent } = require('discord.js');
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
    client.user.setActivity('...', { type: ActivityType.Watching });
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

const watchList = new Set();

client.on('messageDelete', async message => {
    if (!message.author || message.author.bot || !message.guild) return;
    if (watchList.has(message.guild.id)) {
        try {
            const auditLogs = await message.guild.fetchAuditLogs({ type: AuditLogEvent.MessageDelete, limit: 1 });
            const entry = auditLogs.entries.first();
            const deleter = (entry && entry.target.id === message.author.id && entry.createdTimestamp > Date.now() - 5000) ? entry.executor : message.author;
            
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("🚨 تم كشف عملية حذف")
                .setDescription(`
**الشخص الذي حذف :** <@${deleter.id}>
**صاحب الرسالة :** <@${message.author.id}>

**الرسالة التي حُذفت :**
> ${message.content || "رسالة فارغة (صورة أو ملف)"}

**في روم :** <#${message.channel.id}>
                `)
                .setTimestamp();
            
            message.channel.send({ content: `<@${deleter.id}>`, embeds: [embed] });
        } catch (e) { console.error(e); }
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'منشن') {
        if (interaction.user.id !== OWNER_ID) return interaction.reply({ content: "للمالك فقط!", ephemeral: true });
        await interaction.reply({ content: "جاري الإرسال...", ephemeral: true });
        interaction.guild.members.cache.forEach(async m => { 
            if (!m.user.bot) m.send(interaction.options.getString('وصف')).then(msg => setTimeout(() => msg.delete().catch(() => {}), 120000)).catch(() => {});
        });
    }
    if (interaction.commandName === 'تحذير') {
        if (!hasPermission(interaction.member)) return interaction.reply({ content: "ليس لديك صلاحية!", ephemeral: true });
        const target = interaction.options.getUser('الشخص');
        const reason = interaction.options.getString('السبب');
        if (!warnings[target.id]) warnings[target.id] = [];
        warnings[target.id].push({ reason, adminName: interaction.user.username });
        saveWarnings();
        await target.send({ content: `⚠️ تم تحذيرك من قبل الإدارة!\nالسبب: ${reason}` }).catch(() => {});
        await interaction.reply({ content: `تم تحذير ${target.username} بنجاح.`, ephemeral: true });
    }
    if (interaction.commandName === 'شيل') {
        if (!hasPermission(interaction.member)) return interaction.reply({ content: "ليس لديك صلاحية!", ephemeral: true });
        const target = interaction.options.getUser('الشخص');
        warnings[target.id] = [];
        saveWarnings();
        await interaction.reply({ content: `تم مسح تحذيرات ${target.username}.`, ephemeral: true });
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (message.content === "!الحذف" && message.author.id === OWNER_ID) {
        if (watchList.has(message.guild.id)) { watchList.delete(message.guild.id); message.reply("تم إيقاف المراقبة."); }
        else { watchList.add(message.guild.id); message.reply("تم تفعيل مراقبة الحذف."); }
    }
    if (message.content === "امسح" && !message.guild) {
        const fetched = await message.channel.messages.fetch({ limit: 100 });
        fetched.filter(m => m.author.id === client.user.id).forEach(m => m.delete().catch(() => {}));
    }
    if (message.content.startsWith("-تعال")) {
        const target = message.mentions.members.first();
        if (target) {
            target.send(`يطلبك ${message.author.username} في الروم: ${message.channel.name}`).then(msg => setTimeout(() => msg.delete().catch(() => {}), 120000)).catch(() => message.reply("لا يمكن المراسلة."));
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
