const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const config = require('./config.json');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]
});

let allowedUsers = [config.OWNER_ID];
let newsChannelId = null;

client.on('ready', () => console.log(`Logged as ${client.user.tag}`));

// نظام الحماية (استعادة الرومات والأدوار)
client.on('channelDelete', async (channel) => {
    if (allowedUsers.includes(channel.guild.members.cache.find(m => m.id === channel.guild.ownerId)?.id)) return;
    
    // إعادة إنشاء الروم بنفس المواصفات
    const newChannel = await channel.guild.channels.create({
        name: channel.name,
        type: channel.type,
        parent: channel.parent,
        permissionOverwrites: channel.permissionOverwrites.cache
    });
    
    if (newsChannelId) {
        client.channels.cache.get(newsChannelId).send(`تم حذف الروم من قبل شخص غير مصرح. تم استعادته: <#${newChannel.id}>`);
    }
});

// الأوامر
client.on('messageCreate', async (message) => {
    if (!message.content.startsWith('!') || message.author.bot) return;
    
    const args = message.content.split(' ');
    const command = args[0].slice(1);

    // أمر !يلا
    if (command === 'يلا' && message.author.id === config.OWNER_ID) {
        newsChannelId = message.channel.id;
        message.reply("تم تفعيل الحماية في هذا الروم.");
    }

    // أمر السماح
    if (command === 'مسموح' && message.author.id === config.OWNER_ID) {
        const target = message.mentions.users.first();
        if (target) { allowedUsers.push(target.id); message.reply(`تم السماح لـ ${target.tag}`); }
    }

    // أمر غير مسموح
    if (command === 'غير' && args[1] === 'مسموح' && message.author.id === config.OWNER_ID) {
        const target = message.mentions.users.first();
        allowedUsers = allowedUsers.filter(id => id !== target.id);
        message.reply("تم إلغاء التصريح.");
    }
});

// أمر المنشن (يحتاج Slash Command Handler حقيقي، هذا اختصار)
// يمكنك إضافة هذا كـ Slash Command في ديسكورد
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'منشن' && interaction.user.id === config.OWNER_ID) {
        const desc = interaction.options.getString('وصف');
        interaction.guild.members.cache.forEach(member => {
            if (!member.user.bot) member.send(desc).catch(console.error);
        });
        await interaction.reply("تم إرسال الرسالة للجميع.");
    }
});

client.login(config.TOKEN);

