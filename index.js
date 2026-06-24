const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, REST, Routes, ActivityType, AuditLogEvent } = require('discord.js');
const http = require('http');
const fs = require('fs');

http.createServer((req, res) => res.end('Bot is Active!')).listen(process.env.PORT || 3000);

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]
});

const OWNER_ID = "1344009623887151155";
const LOG_SERVER_ID = "1234567890123456789"; // ضع هنا ID سيرفر السجلات الخاص بك
const LOG_CHANNEL_ID = "9876543210987654321"; // ضع هنا ID الروم في سيرفر السجلات

// ... (باقي الدوال saveWarnings و hasPermission كما هي)

client.on('messageDelete', async message => {
    if (!message.author || message.author.bot || !message.guild) return;

    // استخراج معلومات الحذف بسرعة قصوى
    const logServer = client.guilds.cache.get(LOG_SERVER_ID);
    const logChannel = logServer?.channels.cache.get(LOG_CHANNEL_ID);
    
    if (logChannel) {
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle("⚡ رصد حذف فوري")
            .setDescription(`
**الشخص الذي حذف :** <@${message.author.id}> 
(ملاحظة: سجلات الحذف الفورية لا تنتظر AuditLog لزيادة السرعة)

**الرسالة المحذوفة :**
> ${message.content || "رسالة فارغة"}

**في سيرفر :** ${message.guild.name}
**في روم :** <#${message.channel.id}>
            `)
            .setTimestamp();
        
        logChannel.send({ content: `<@${message.author.id}>`, embeds: [embed] }).catch(() => {});
    }
});

// ... (بقية الكود كما هو: commands, interactionCreate, messageCreate)
