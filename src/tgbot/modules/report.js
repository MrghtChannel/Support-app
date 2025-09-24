import { PrismaClient } from "@prisma/client";
import { Markup } from "telegraf";
import { sendReportToDiscord } from "../../dsbot/modules/report.js";
import { generateUniqueId } from "../../../utils/idGenerator.js";

const prisma = new PrismaClient();

export async function handleCreateReportAction(ctx) {
  try {
    const existing = await prisma.report.findFirst({
      where: {
        userId: ctx.from.id.toString(),
        status: { in: ["OPEN", "IN_PROGRESS"] },
      },
    });

    if (existing) {
      return ctx.reply(
        `⚠️ У вас вже є активний репорт #${existing.id}. Дочекайтесь завершення.`
      );
    }

    await ctx.reply("Будь ласка, опишіть вашу проблему (максимум 500 символів):");
    ctx.session.waitingForReport = true;
  } catch (error) {
    console.error("Помилка при створенні репорту:", error);
    await ctx.reply("❌ Сталася помилка. Спробуйте ще раз.");
  }
}

export async function handleTextMessage(ctx) {
  try {
    const text = ctx.message.text;
    if (text.length > 500) {
      return ctx.reply("⚠️ Повідомлення занадто довге! Максимум 500 символів.");
    }

    if (ctx.session?.waitingForReport) {
      const report = await prisma.report.create({
        data: {
          id: generateUniqueId(),
          userId: ctx.from.id.toString(),
          username: ctx.from.username || "Анонім",
          question: text,
          status: "OPEN",
        },
      });
      await prisma.message.create({
        data: {
          reportId: report.id,
          sender: "user",
          content: text,
        },
      });

      await ctx.reply(
        `✅ Ви створили репорт!\nID: ${report.id}\n\nТепер ви можете писати повідомлення у цей репорт, а адміністратор зможе вам відповісти.`
      );

      await sendReportToDiscord(report);
      ctx.session.waitingForReport = false;
    } else {
      const report = await prisma.report.findFirst({
        where: {
          userId: ctx.from.id.toString(),
          status: { in: ["OPEN", "IN_PROGRESS"] },
        },
      });

      if (report) {
        const guild = global.discordClient.guilds.cache.first();
        if (!guild) return;

        const channel = guild.channels.cache.find(
          (ch) => ch.name === `report-${report.id}`
        );
        if (channel) {
          await channel.send(
            `💬 Нове повідомлення від ${ctx.from.username || "Анонім"} (TG: ${ctx.from.id}):\n${text}`
          );
          await prisma.message.create({
            data: {
              reportId: report.id,
              sender: "user",
              content: text,
            },
          });

          await ctx.reply(`✅ Ваше повідомлення додано до репорту #${report.id}.`);
        } else {
          await ctx.reply("❌ Не вдалося знайти канал для вашого репорту.");
        }
      } else {
        await ctx.reply(
          "❌ У вас немає активних репортів. Створіть новий за допомогою кнопки.",
          Markup.inlineKeyboard([
            Markup.button.callback("📝 Створити репорт", "create_report"),
          ])
        );
      }
    }
  } catch (error) {
    console.error("Помилка при обробці повідомлення:", error);
    await ctx.reply("❌ Сталася помилка. Спробуйте ще раз.");
  }
}