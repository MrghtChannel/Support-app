import { setupSession } from "./modules/session.js";
import { handleStartCommand } from "./modules/start.js";
import { handleCreateReportAction, handleTextMessage } from "./modules/report.js";

export function startTelegramBot(bot) {
  bot.use(setupSession());
  bot.start(handleStartCommand);
  bot.action("create_report", handleCreateReportAction);
  bot.on("text", handleTextMessage);
}