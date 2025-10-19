import { PrismaClient } from "@prisma/client";
import { Markup } from "telegraf";
import { sendReportToDiscord } from "../../dsbot/modules/report.js";
import { generateUniqueId } from "../../../utils/idGenerator.js";

const prisma = new PrismaClient();

export async function handleCreateReportAction(ctx) {
  try {
    const userId = ctx.from.id.toString();
    const activeBan = await prisma.ban.findFirst({
      where: {
        userId,
        OR: [
          { expiresAt: null }, 
          { expiresAt: { gt: new Date() } }, 
        ],
      },
      orderBy: { bannedAt: "desc" },
    });

    if (activeBan) {
      const reasonText = activeBan.reason ? `\nПричина: ${activeBan.reason}` : "";
      const expiresText = activeBan.expiresAt
        ? `\n⏳ Бан діє до: ${activeBan.expiresAt.toLocaleString()}`
        : "\n⛔ Бан безстроковий.";

      return ctx.reply(
        `🚫 Ви не можете створити репорт, оскільки маєте активний бан.${reasonText}${expiresText}`
      );
    }

    const existingReport = await prisma.report.findFirst({
      where: {
        userId,
        status: { in: ["OPEN", "IN_PROGRESS"] },
      },
    });

    if (existingReport) {
      return ctx.reply(
        `⚠️ У вас вже є активний репорт #${existingReport.id}. Дочекайтесь завершення.`
      );
    }

    const lastPause = await prisma.pause.findFirst({
      where: { userId },
      orderBy: { pausedAt: "desc" },
    });

    if (lastPause) {
      const now = new Date();
      const pauseDuration = 30 * 60 * 1000; 
      const timeSincePause = now - new Date(lastPause.pausedAt);
      const timeLeft = pauseDuration - timeSincePause;

      if (timeSincePause < pauseDuration) {
        const minutesLeft = Math.ceil(timeLeft / 1000 / 60);
        return ctx.reply(
          `⏳ Ви зможете створити новий репорт через ${minutesLeft} хвилин.`
        );
      }
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
    const userId = ctx.from.id.toString();

    if (text.length > 500) {
      return ctx.reply("⚠️ Повідомлення занадто довге! Максимум 500 символів.");
    }

    const activeBan = await prisma.ban.findFirst({
      where: {
        userId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    if (activeBan) {
      return ctx.reply("🚫 Ви не можете писати повідомлення, поки у вас активний бан.");
    }

    if (ctx.session?.waitingForReport) {
      const report = await prisma.report.create({
        data: {
          id: generateUniqueId(),
          userId,
          username: ctx.from.username || "Анонім",
          question: text,
          status: "OPEN",
        },
      });

      await prisma.pause.create({
        data: {
          userId,
          reason: "Report creation cooldown",
          pausedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
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
          userId,
          status: { in: ["OPEN", "IN_PROGRESS"] },
        },
      });

      if (report) {
        const guild = global.discordClient?.guilds?.cache?.first();
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
