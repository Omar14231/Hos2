const { Client, GatewayIntentBits, AuditLogEvent, REST, Routes, SlashCommandBuilder } = require('discord.js');
const http = require('http');

http.createServer((req, res) => res.end('Security Bot Active! 🛡️')).listen(process.env.PORT || 3000);

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]
});

const OWNER_ID = "1344009623887151155";
let allowedUsers = [OWNER_ID];
let logChannelId = null;

// تسجيل أوامر Slash
const commands = [
    new SlashCommandBuilder()
        .setName('منشن')
        .setDescription('إرسال رسالة خاصة لجميع الأعضاء')
        .addStringOption(option => option.setName('وصف').setDescription('نص الرسالة').setRequired(true))
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
});

// 🛡️ [الحماية]
async function sendAlert(guild, message) {
    if (logChannelId) {
        const channel = guild.channels.cache.get(logChannelId);
        if (channel) channel.send(`🛡️ **تنبيه أمني:** ${message}`);
    }
}

client.on('channelDelete', async (channel) => {
    const auditLogs = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelDelete });
    const entry = auditLogs.entries.first();
    if (!entry || entry.executor.id === client.user.id || allowedUsers.includes(entry.executor.id)) return;

    await channel.guild.channels.create({
        name: channel.name,
        type: channel.type,
        parent: channel.parent,
        permissionOverwrites: channel.permissionOverwrites.cache,
        position: channel.position
    });
    sendAlert(channel.guild, `قام <@${entry.executor.id}> بحذف روم وتم استعادته.`);
});

client.on('roleDelete', async (role) => {
    const auditLogs = await role.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleDelete });
    const entry = auditLogs.entries.first();
    if (!entry || entry.executor.id === client.user.id || allowedUsers.includes(entry.executor.id)) return;
    
    role.guild.roles.create({ name: role.name, color: role.color, permissions: role.permissions });
    sendAlert(role.guild, `قام <@${entry.executor.id}> بحذف رتبة وتم استعادتها.`);
});

client.on('roleUpdate', async (oldRole, newRole) => {
    if (oldRole.name !== newRole.name) {
        const auditLogs = await newRole.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleUpdate });
        const entry = auditLogs.entries.first();
        if (entry && !allowedUsers.includes(entry.executor.id)) {
            await newRole.setName(oldRole.name);
            sendAlert(newRole.guild, `قام <@${entry.executor.id}> بتغيير اسم رتبة وتم التراجع.`);
        }
    }
});

// 🎮 التعامل مع الأوامر
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'منشن') {
        if (interaction.user.id !== OWNER_ID) return interaction.reply({ content: "للمالك فقط!", ephemeral: true });
        
        const text = interaction.options.getString('وصف');
        await interaction.reply({ content: "جاري الإرسال...", ephemeral: true });
        
        interaction.guild.members.cache.forEach(async member => {
            if (!member.user.bot) {
                try { await member.send(text); } catch (e) { console.log(`Cannot DM ${member.user.tag}`); }
            }
        });
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.id !== OWNER_ID) return;
    if (message.content === '!يلا') { logChannelId = message.channel.id; message.reply("✅ تم تفعيل الحماية والتبليغ هنا!"); }
});

client.login(process.env.DISCORD_TOKEN);
