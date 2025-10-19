import { Markup } from "telegraf";

export function handleStartCommand(ctx) {
  ctx.reply(
    "👋 Вітаємо у боті техпідтримки!\nМи вам допоможемо.",
    Markup.inlineKeyboard([
      [
        Markup.button.callback("📝 Створити репорт", "create_report"),
      ]
    ])
  );
}
