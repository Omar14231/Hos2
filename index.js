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
    // حالة النقطة
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

// متغير لتتبع حالة المراقبة
const watchList = new Set();

client.on('messageDelete', async message => {
    if (message.author.bot || !message.guild) return;
    if (watchList.has(message.guild.id)) {
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle("⚠️ تم حذف رسالة")
            .addFields(
                { name: "العضو:", value: `${message.author.tag}`, inline: true },
                { name: "الروم:", value: `${message.channel.name}`, inline: true },
                { name: "الرسالة:", value: `${message.content || "رسالة فارغة"}` }
            )
            .setTimestamp();
        message.channel.send({ embeds: [embed] });
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

        await interaction.reply({ content: "<a:emoji_7:1519294675180195910> جاري معالجة التحذير...", fetchReply: true });

        setTimeout(async () => {
            try {
                if (!warnings[target.id]) warnings[target.id] = [];
                warnings[target.id].push({ reason: reason, adminName: sender.username });
                saveWarnings();

                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle(`<a:emoji_2:1519115296961466500> تحذير شديد اللهجة <a:emoji_2:1519115296961466500>`)
                    .setDescription(`**تم تحذيرك من قبل الإدارة!**\n\n**الشخص المسؤول:** ${sender}\n**السبب:** \`${reason}\``)
                    .setTimestamp();

                await target.send({ content: `<a:emoji_2:1519115296961466500> <@${target.id}> **عليك الانتباه!**`, embeds: [embed] }).catch(() => {});
                await interaction.editReply({ content: `تم تحذير ${target.username} بنجاح!` });
            } catch (e) { console.error(e); }
        }, 5000);
    }

    if (interaction.commandName === 'شيل') {
        if (!hasPermission(interaction.member)) return interaction.reply({ content: "ليس لديك صلاحية!", ephemeral: true });
        const target = interaction.options.getUser('الشخص');
        await interaction.reply({ content: "جاري المسح...", fetchReply: true });
        setTimeout(async () => {
            warnings[target.id] = []; 
            saveWarnings();
            await interaction.editReply({ content: `تم مسح تحذيرات ${target.username} بنجاح!` });
        }, 5000);
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if (message.content === "!الحذف" && message.author.id === OWNER_ID) {
        if (watchList.has(message.guild.id)) {
            watchList.delete(message.guild.id);
            message.reply("تم إيقاف مراقبة الحذف.");
        } else {
            watchList.add(message.guild.id);
            message.reply("تم تفعيل مراقبة الحذف.");
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
            target.send(`يطلبك ${message.author.username} في الروم: **${message.channel.name}**\nالرابط: ${message.channel.url}`)
                .then(msg => setTimeout(() => msg.delete().catch(() => {}), 120000))
                .catch(() => message.reply("لم أستطع الإرسال."));
        }
    }

    if (message.content.startsWith("-تحذيرات")) {
        const target = message.mentions.users.first();
        const list = target ? (warnings[target.id]?.map((r, i) => `${i + 1}- ${r.reason}`).join('\n') || "لا يوجد") : "استخدم -تحذيرات @عضو";
        message.reply(`التحذيرات:\n${list}`);
    }
});

client.login(process.env.DISCORD_TOKEN);
                .catch(() => message.reply("عذراً، لم أستطع الإرسال، ربما الشخص مغلق الرسائل الخاصة 🔒"));
        } else {
            message.reply("يرجى عمل منشن للشخص أو للجميع! ⚠️");
        }
    }

    if (message.content.startsWith("-تحذيرات")) {
        const loadingMsg = await message.reply("<a:emoji_7:1519294675180195910> جاري جلب السجلات، يرجى الانتظار...");
        setTimeout(async () => {
            try {
                const target = message.mentions.users.first();
                if (target) {
                    const list = (warnings[target.id] && warnings[target.id].length > 0) 
                        ? warnings[target.id].map((r, i) => `${i + 1}- ${r.reason || r}`).join('\n') 
                        : "لا يوجد تحذيرات.";
                    await loadingMsg.edit(`قائمة تحذيرات ${target.username}:\n${list} 📋`);
                } else {
                    const recentWarnings = Object.entries(warnings)
                        .slice(-10)
                        .map(([id, data], i) => {
                            const lastWarning = data && data.length > 0 ? data[data.length - 1] : null;
                            const adminName = lastWarning && lastWarning.adminName ? lastWarning.adminName : "تم حذف التحذير";
                            return `${i + 1}- العضو: <@${id}> | بواسطة: ${adminName}`;
                        })
                        .join('\n');
                    await loadingMsg.edit(`آخر 10 أشخاص تم تحذيرهم:\n${recentWarnings || "لا توجد تحذيرات حالياً."} 📋`);
                }
            } catch (error) {
                console.error("Error in -تحذيرات:", error);
                await loadingMsg.edit("<a:emoji_3:1519115319040413859> حدث خطأ أثناء جلب البيانات.").catch(() => {});
            }
        }, 2000);
    }
});

client.login(process.env.DISCORD_TOKEN);
