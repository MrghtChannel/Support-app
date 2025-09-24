import { Telegraf } from "telegraf";
import { Client, GatewayIntentBits } from "discord.js";
import { startTelegramBot } from "./src/tgbot/index.js";
import { startDiscordBot } from "./src/dsbot/index.js";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  try {
    const tgBot = new Telegraf(process.env.TELEGRAM_BOT);
    const dsBot = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers, 
      ],
    });

    startTelegramBot(tgBot);
    startDiscordBot(dsBot, tgBot);

    await Promise.all([
      tgBot.launch(),
      dsBot.login(process.env.DISCORD_BOT),
    ]);

    console.log("✅ Обидва боти запущені...");
  } catch (error) {
    console.error("Помилка при запуску ботів:", error);
  }
}

main();