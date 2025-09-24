import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export function handleCommands(client, telegramBot) {
  client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (message.content.startsWith("/відповідь")) {
      const args = message.content.split(" ");
      if (args.length < 3) {
        return message.reply("❌ Використання: /відповідь <id> <текст>");
      }
      const reportId = args[1];
      const replyText = args.slice(2).join(" ");
      if (replyText.length > 500) {
        return message.reply("⚠️ Відповідь занадто довга! Максимум 500 символів.");
      }

      try {
        const member = await message.guild.members.fetch(message.author.id);
        const isAdmin = member.roles.cache.has(process.env.DISCORD_ADMIN_ROLE);
        if (!isAdmin) {
          return message.reply("❌ У вас немає прав адміністратора для виконання цієї команди.");
        }

        const report = await prisma.report.findUnique({
          where: { id: reportId },
        });

        if (!report) {
          return message.reply("❌ Репорт не знайдено.");
        }

        if (report.status !== "IN_PROGRESS" || !report.assignedTo) {
          return message.reply("⚠️ Цей репорт ще ніхто не взяв. Спочатку адміністратор має натиснути кнопку 'Взяти репорт'.");
        }

        await telegramBot.telegram.sendMessage(
          report.userId,
          `📬 Відповідь на ваш репорт #${report.id}:\n${replyText}`
        );

        await prisma.message.create({
          data: {
            reportId: report.id,
            sender: "admin",
            content: replyText,
          },
        });

        await message.channel.send(`✅ Відповідь відправлена для репорту #${report.id}`);
      } catch (error) {
        console.error("Помилка при обробці відповіді:", error);
        await message.reply("❌ Сталася помилка при відправці відповіді.");
      }
    }
    if (message.content.startsWith("/перегляд")) {
      const args = message.content.split(" ");
      if (args.length < 2) {
        return message.reply("❌ Використання: /перегляд <id>");
      }

      const reportId = args[1];

      try {
        const member = await message.guild.members.fetch(message.author.id);
        const isHeadAdmin = member.roles.cache.has(process.env.DISCORD_HEADADMIN_ROLE);

        if (!isHeadAdmin) {
          return message.reply("❌ Ця команда доступна лише для головних адміністраторів.");
        }
        const report = await prisma.report.findUnique({
          where: { id: reportId },
          include: { messages: { orderBy: { createdAt: "asc" } } }, 
        });

        if (!report) {
          return message.reply("❌ Репорт не знайдено.");
        }
        let conversation = `📜 **Переписка для репорту #${reportId}**\n`;
        conversation += `👤 Користувач: ${report.username} (TG: ${report.userId})\n`;
        conversation += `❓ Питання: ${report.question.substring(0, 500)}\n`;
        conversation += `📅 Створено: ${new Date(report.createdAt).toLocaleString()}\n\n`;

        if (!report.messages.length) {
          conversation += `⚠️ Для репорту #${reportId} немає повідомлень у базі даних.`;
        } else {
          conversation += `**Переписка:**\n`;
          for (const msg of report.messages) {
            const sender = msg.sender === "admin" ? "🛡️ Адмін" : "👤 Гравець";
            conversation += `${sender} (${new Date(msg.createdAt).toLocaleString()}):\n${msg.content}\n\n`;
          }
        }

        const maxMessageLength = 2000;
        if (conversation.length <= maxMessageLength) {
          await message.channel.send({ content: conversation });
        } else {
          const messagesToSend = [];
          let currentMessage = "";
          const lines = conversation.split("\n");

          for (const line of lines) {
            if (currentMessage.length + line.length + 1 > maxMessageLength) {
              messagesToSend.push(currentMessage);
              currentMessage = line + "\n";
            } else {
              currentMessage += line + "\n";
            }
          }
          if (currentMessage) messagesToSend.push(currentMessage);

          for (const msg of messagesToSend) {
            await message.channel.send({ content: msg });
          }
        }

        await message.reply(`✅ Переписку для репорту #${reportId} відображено.`);
      } catch (error) {
        console.error("Помилка при перегляді репорту:", error);
        await message.reply("❌ Сталася помилка при відображенні переписки репорту.");
      }
    }
  });
}