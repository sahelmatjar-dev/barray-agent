import { IntegrationNotConfiguredError } from "../errors";

export interface TelegramConfig {
  botToken: string;
}

export function loadTelegramConfigFromEnv(env: NodeJS.ProcessEnv = process.env): TelegramConfig {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  if (!botToken) throw new IntegrationNotConfiguredError("Telegram", ["TELEGRAM_BOT_TOKEN"]);
  return { botToken };
}

/** Used for owner alerts (ETA slip, CRITICAL fraud freeze, pending approvals digest). */
export async function sendTelegramMessage(config: TelegramConfig, chatId: string, text: string): Promise<void> {
  const response = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
  if (!response.ok) {
    throw new Error(`Telegram sendMessage failed: ${response.status} ${await response.text()}`);
  }
}
