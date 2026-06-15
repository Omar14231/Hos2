const { Client, GatewayIntentBits, AuditLogEvent } = require('discord.js');
const http = require('http');
const config = require('./config.json');

// 🛡️ حل مشكلة البورت لضمان عدم توقف البوت في رندر
http.createServer((req, res) => res.end('Bot is running safely! 🚀')).listen(process.env.PORT || 3000);

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]
});

const OWNER_ID = "1344009623887151155";
let allowedUsers = [OWNER_ID];
let newsChannelId = null;

client.on('ready', () => console.log(`✅ تم تشغيل البوت بنجاح: ${client.user.tag} 🤖`));

// 🛡️ نظام الحماية من حذف الرومات
client.on('channelDelete', async (channel) => {
    const auditLogs = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelDelete });
    const entry = auditLogs.entries.first();
    
    if (!entry || entry.executor.id === client.user.id || allowedUsers.includes(entry.executor.id)) return;

    // استعادة الروم 🔄
    const newChannel = await channel.guild.channels.create({
        name: channel.name, type: channel.type, parent: channel.parent, permissionOverwrites: channel.permissionOverwrites.cache
    });
    
    if (newsChannelId) {
        client.channels.cache.get(newsChannelId).send(`⚠️ تم كشف محاولة تخريب! قام <@${entry.executor.id}> بحذف الروم. تم استعادته فوراً: <#${newChannel.id}> 🛡️`);
    }
});

// 🎮 نظام الأوامر للمالك
client.on('messageCreate', async (message) => {
    if (message.author.bot || message.author.id !== OWNER_ID) return;
    const args = message.content.split(' ');
    
    if (message.content === '!يلا') {
        newsChannelId = message.channel.id;
        message.reply("✅ تم تفعيل نظام الحماية في هذا الروم بنجاح! 🛡️");
    } else if (args[0] === 'مسموح') {
        const user = message.mentions.users.first();
        if (user) { allowedUsers.push(user.id); message.reply(`✅ تم السماح لـ ${user.username} بالتحكم! 👑`); }
    } else if (args[0] === 'غير' && args[1] === 'مسموح') {
        const user = message.mentions.users.first();
        if (user) { allowedUsers = allowedUsers.filter(id => id !== user.id); message.reply("🚫 تم إلغاء التصريح عن العضو! 🔐"); }
    } else if (message.content === '!اوامر') {
        message.reply("📜 **قائمة الأوامر المتاحة:**\n!يلا - تفعيل الحماية 🛡️\nمسموح @user - إضافة شخص ➕\nغير مسموح @user - إزالة شخص ➖");
    }
});

client.login(process.env.DISCORD_TOKEN);
