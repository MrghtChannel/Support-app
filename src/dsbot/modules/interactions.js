import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export function handleInteractions(client, telegramBot) {
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === "take_report") {
      try {
        const member = await interaction.guild.members.fetch(interaction.user.id);
        const isAdmin = member.roles.cache.has(process.env.DISCORD_ADMIN_ROLE);
        if (!isAdmin) {
          return interaction.reply({
            content: "❌ У вас немає прав адміністратора для взяття репорту.",
            ephemeral: true,
          });
        }

        const reportId = interaction.channel.name.split("-")[1];
        const report = await prisma.report.findUnique({ where: { id: reportId } });
        if (!report) {
          return interaction.reply({ content: "❌ Репорт не знайдено.", ephemeral: true });
        }

        await prisma.report.update({
          where: { id: reportId },
          data: { status: "IN_PROGRESS", assignedTo: interaction.user.tag },
        });

        await interaction.channel.permissionOverwrites.create(interaction.user, {
          ViewChannel: true,
          SendMessages: true,
        });

        await telegramBot.telegram.sendMessage(
          report.userId,
          `📢 Ваш репорт #${report.id} взято в роботу адміністратором ${interaction.user.tag}.`
        );
        const closeButton = new ButtonBuilder()
          .setCustomId("close_report")
          .setLabel("Закрити репорт")
          .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(closeButton);

        await interaction.channel.send({
          content: `ℹ️ Коли робота з репортом #${report.id} завершена, натисніть кнопку нижче:`,
          components: [row],
        });

        await interaction.reply({
          content: `✅ Ви взяли репорт #${report.id}.`,
          ephemeral: true,
        });
      } catch (error) {
        console.error("Помилка при взятті репорту:", error);
        await interaction.reply({
          content: "❌ Сталася помилка при взятті репорту.",
          ephemeral: true,
        });
      }
    }
    if (interaction.customId === "close_report") {
      try {
        const reportId = interaction.channel.name.split("-")[1];
        const report = await prisma.report.findUnique({ where: { id: reportId } });
        if (!report) {
          return interaction.reply({ content: "❌ Репорт не знайдено.", ephemeral: true });
        }
        const member = await interaction.guild.members.fetch(interaction.user.id);
        const isAdmin = member.roles.cache.has(process.env.DISCORD_ADMIN_ROLE);
        if (!isAdmin) {
          return interaction.reply({
            content: "❌ У вас немає прав адміністратора для закриття репорту.",
            ephemeral: true,
          });
        }

        await prisma.report.update({
          where: { id: reportId },
          data: { status: "CLOSED" },
        });

        await telegramBot.telegram.sendMessage(
          report.userId,
          `✅ Ваш репорт #${report.id} було закрито. Дякуємо за звернення!`
        );

        await interaction.reply({
          content: `🛑 Репорт #${report.id} було закрито.`,
        });

        setTimeout(() => {
          interaction.channel.delete().catch(() => {});
        }, 2000);
      } catch (error) {
        console.error("Помилка при закритті репорту:", error);
        await interaction.reply({
          content: "❌ Сталася помилка при закритті репорту.",
          ephemeral: true,
        });
      }
    }
  });
}
