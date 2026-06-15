const { Client, GatewayIntentBits, AuditLogEvent, REST, Routes, SlashCommandBuilder } = require('discord.js');
const http = require('http');

http.createServer((req, res) => res.end('Security Bot Active! 🛡️')).listen(process.env.PORT || 3000);

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]
});

const OWNER_ID = "1344009623887151155";
let allowedUsers = [OWNER_ID];
let newsChannelId = null;

// 🛡️ [حماية حذف الرومات] مع استعادة المكان (Position)
client.on('channelDelete', async (channel) => {
    const auditLogs = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelDelete });
    const entry = auditLogs.entries.first();
    if (!entry || entry.executor.id === client.user.id || allowedUsers.includes(entry.executor.id)) return;

    const newChannel = await channel.guild.channels.create({
        name: channel.name,
        type: channel.type,
        parent: channel.parent,
        permissionOverwrites: channel.permissionOverwrites.cache,
        position: channel.position // 🔄 استعادة الترتيب الأصلي
    });

    if (newsChannelId) {
        client.channels.cache.get(newsChannelId).send(`⚠️ تم كشف تخريب! قام <@${entry.executor.id}> بحذف الروم. تم استعادته: <#${newChannel.id}>`);
    }
});

// 🛡️ [حماية حذف الرتب]
client.on('roleDelete', async (role) => {
    const auditLogs = await role.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleDelete });
    const entry = auditLogs.entries.first();
    if (!entry || entry.executor.id === client.user.id || allowedUsers.includes(entry.executor.id)) return;

    role.guild.roles.create({
        name: role.name,
        color: role.color,
        permissions: role.permissions,
        reason: 'تم حذف الرتبة من قبل مخرب، تم استعادتها.'
    });
});

// 🛡️ [حماية تغييرات الرومات والسيرفر]
client.on('channelUpdate', async (oldChannel, newChannel) => {
    // إذا تم تغيير الاسم أو المكان (بواسطة غير مسموح)
    if (oldChannel.name !== newChannel.name || oldChannel.position !== newChannel.position) {
        const auditLogs = await newChannel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelUpdate });
        const entry = auditLogs.entries.first();
        if (entry && !allowedUsers.includes(entry.executor.id)) {
            await newChannel.setName(oldChannel.name);
            await newChannel.setPosition(oldChannel.position);
        }
    }
});

// 🎮 الأوامر
client.on('messageCreate', async (message) => {
    if (message.author.bot || message.author.id !== OWNER_ID) return;
    const args = message.content.split(' ');
    if (message.content === '!يلا') { newsChannelId = message.channel.id; message.reply("✅ تم تفعيل الحماية الشاملة! 🛡️"); }
    else if (args[0] === 'مسموح') { const user = message.mentions.users.first(); if (user) allowedUsers.push(user.id); }
    else if (args[0] === 'غير' && args[1] === 'مسموح') { const user = message.mentions.users.first(); if (user) allowedUsers = allowedUsers.filter(id => id !== user.id); }
});

client.login(process.env.DISCORD_TOKEN);
