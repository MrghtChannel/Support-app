import { ChannelType, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export async function sendReportToDiscord(report) {
  try {
    const guildId = process.env.DISCORD_GUILD_ID;
    if (!guildId) {
      console.error("❌ DISCORD_GUILD_ID не встановлено в .env файлі!");
      return;
    }

    let guild = global.discordClient.guilds.cache.get(guildId);
    if (!guild) {
      guild = await global.discordClient.guilds.fetch(guildId);
      if (!guild) {
        console.error(`❌ Гільдію з ID ${guildId} не знайдено. Перевірте, чи бот на цьому сервері.`);
        return;
      }
      console.log(`✅ Гільдію ${guild.name} завантажено з API.`);
    }
    const category = guild.channels.cache.get(process.env.DISCORD_CATEGORY);
    if (!category) {
      console.error("❌ Категорію не знайдено. Перевірте DISCORD_CATEGORY в .env.");
      return;
    }
    const channel = await guild.channels.create({
      name: `report-${report.id}`,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        {
          id: guild.roles.everyone,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
      ],
    });
    const button = new ButtonBuilder()
      .setCustomId("take_report")
      .setLabel("Взяти репорт")
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    await channel.send({
      content: `📩 **Новий репорт #${report.id}**\n👤 User: ${report.username} (TG: ${report.userId})\n❓ Питання: ${report.question.substring(0, 500)}\n\nНатисніть кнопку, щоб взяти репорт.\n\n**Підказка для адміна**: Щоб відповісти, використовуйте команду: \`/відповідь ${report.id} <ваш текст відповіді>\``,
      components: [row],
    });

    console.log(`✅ Репорт #${report.id} створено в каналі ${channel.name}`);
  } catch (error) {
    console.error("Помилка при створенні репорту в Discord:", error);
  }
}
