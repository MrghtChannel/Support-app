import { handleCommands } from "./modules/commands.js";
import { handleInteractions } from "./modules/interactions.js";

export function startDiscordBot(client, tgBot) {
  global.discordClient = client;
  client.on("clientReady", () => {
    console.log(`🤖 Discord bot logged in as ${client.user.tag}`);
    console.log("Доступні гільдії:", client.guilds.cache.map(g => `${g.name} (${g.id})`));
  });

  handleCommands(client, tgBot);
  handleInteractions(client, tgBot);
}