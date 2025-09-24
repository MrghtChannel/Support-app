import { session } from "telegraf";

export function setupSession() {
  return session({
    defaultSession: () => ({ waitingForReport: false }),
  });
}