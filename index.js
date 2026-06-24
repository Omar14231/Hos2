const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, REST, Routes, ActivityType } = require('discord.js');
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
    if (message.author?.bot || !message.guild) return;
    if (watchList.has(message.guild.id)) {
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle("⚠️ تم حذف رسالة")
            .addFields(
                { name: "العضو:", value: `${message.author.tag}`, inline: true },
                { name: "الروم:", value: `${message.channel.name}`, inline: true },
                { name: "الرسالة:", value: `${message.content || "لا يوجد نص"}` }
            )
            .setTimestamp();
        message.channel.send({ embeds: [embed] }).catch(() => {});
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'منشن') {
        if (interaction.user.id !== OWNER_ID) return interaction.reply({ content: "للمالك فقط!", ephemeral: true });
        await interaction.reply({ content: "جاري الإرسال...", ephemeral: true });
        interaction.guild.members.cache.forEach(async m => { 
            if (!m.user.bot) {
                m.send(interaction.options.getString('وصف'))
                .then(msg => setTimeout(() => msg.delete().catch(() => {}), 120000))
                .catch(() => {});
            }
        });
    }

    if (interaction.commandName === 'تحذير') {
        if (!hasPermission(interaction.member)) return interaction.reply({ content: "ليس لديك صلاحية!", ephemeral: true });
        const target = interaction.options.getUser('الشخص');
        const reason = interaction.options.getString('السبب');
        const sender = interaction.user;

        await interaction.reply({ content: "جاري المعالجة...", fetchReply: true });
        setTimeout(async () => {
            if (!warnings[target.id]) warnings[target.id] = [];
            warnings[target.id].push({ reason: reason, adminName: sender.username });
            saveWarnings();
            const embed = new EmbedBuilder().setColor(0xFF0000).setTitle("تحذير").setDescription(`السبب: ${reason}`);
            await target.send({ content: "لديك تحذير:", embeds: [embed] }).catch(() => {});
            await interaction.editReply({ content: "تم التحذير بنجاح." });
        }, 5000);
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if (message.content === "!الحذف" && message.author.id === OWNER_ID) {
        if (watchList.has(message.guild.id)) {
            watchList.delete(message.guild.id);
            message.reply("تم إيقاف المراقبة.");
        } else {
            watchList.add(message.guild.id);
            message.reply("تم تفعيل المراقبة.");
        }
    }

    if (message.content === "امسح" && !message.guild) {
        const fetched = await message.channel.messages.fetch({ limit: 100 });
        const botMessages = fetched.filter(m => m.author.id === client.user.id);
        botMessages.forEach(m => m.delete().catch(() => {}));
    }

    if (message.content.startsWith("-تعال")) {
        const target = message.mentions.members.first();
        if (target) {
            target.send(`يطلبك ${message.author.username} في الروم: ${message.channel.name}`)
                .then(msg => setTimeout(() => msg.delete().catch(() => {}), 120000))
                .catch(() => message.reply("لم أستطع الإرسال."));
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
