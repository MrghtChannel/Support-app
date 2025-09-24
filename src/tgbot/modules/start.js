import { Markup } from "telegraf";

export function handleStartCommand(ctx) {
  ctx.reply(
    "👋 Вітаємо у боті техпідтримки!\nМи вам допоможемо.",
    Markup.inlineKeyboard([
      [
        Markup.button.callback("📝 Створити репорт", "create_report"),
        Markup.button.url("📖 Правила", "http://localhost:3000/rules")
      ]
    ])
  );
}
