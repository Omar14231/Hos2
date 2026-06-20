const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const http = require('http');

// كود التفعيل لـ Render
http.createServer((req, res) => res.end('Bot is Active!')).listen(process.env.PORT || 3000);

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]
});

const OWNER_ID = "1344009623887151155";
const ADMIN_ROLES = ["1508200281429770412", "1509306208517881866", "1509740495486587073", "1517511232867930112"];

const commands = [
    new SlashCommandBuilder()
        .setName('منشن')
        .setDescription('رسالة للكل - للمالك فقط')
        .addStringOption(option => option.setName('وصف').setDescription('نص الرسالة').setRequired(true)),
    new SlashCommandBuilder()
        .setName('تحذير')
        .setDescription('تحذير عضو في الخاص')
        .addUserOption(option => option.setName('الشخص').setDescription('العضو المراد تحذيره').setRequired(true))
        .addStringOption(option => option.setName('السبب').setDescription('سبب التحذير').setRequired(true))
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // ردود الفعل التلقائية
    if (message.content.includes("السلام عليكم")) message.reply("وعليكم السلام ورحمة الله وبركاته، أرحب!");
    
    if (message.mentions.has(client.user)) {
        message.react('👀');
        if (message.content.includes("انت صاحي")) {
            message.reply("اي نعم انا شغال وا اعمل الان بشكل جيد");
        }
    }

    // أمر -تعال
    if (message.content.startsWith("-تعال")) {
        const target = message.mentions.members.first();
        if (target) {
            try {
                await target.send(`💡 تنبيه: الشخص ${message.author.username} يطلبك في روم: ${message.channel.name}`);
                message.reply(`✅ تم إرسال طلب القدوم لـ ${target.user.username} في الخاص.`);
            } catch (e) { message.reply("⚠️ لا يمكنني مراسلة هذا الشخص (الخاص مغلق)."); }
        }
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // منطق التحقق من الرتب
    const isOwner = interaction.user.id === OWNER_ID;
    const isAdmin = interaction.member.roles.cache.some(r => ADMIN_ROLES.includes(r.id));

    if (interaction.commandName === 'منشن') {
        if (!isOwner) return interaction.reply({ content: "للمالك فقط!", ephemeral: true });
        await interaction.reply({ content: "جاري الإرسال...", ephemeral: true });
        interaction.guild.members.cache.forEach(async member => {
            if (!member.user.bot) try { await member.send(interaction.options.getString('وصف')); } catch (e) {}
        });
    }

    if (interaction.commandName === 'تحذير') {
        if (!isOwner && !isAdmin) return interaction.reply({ content: "ليس لديك صلاحية لاستخدام هذا الأمر.", ephemeral: true });
        const member = interaction.options.getMember('الشخص');
        const reason = interaction.options.getString('السبب');
        try {
            await member.send(`⚠️ **تنبيه:** تم تحذيرك في سيرفر ${interaction.guild.name}\n**السبب:** ${reason}`);
            interaction.reply({ content: `✅ تم تحذير ${member.user.tag} بنجاح.`, ephemeral: true });
        } catch (e) { interaction.reply({ content: "⚠️ لم أستطع إرسال الرسالة، قد يكون الخاص مغلقاً.", ephemeral: true }); }
    }
});

client.login(process.env.DISCORD_TOKEN);
