import { bot } from "./bot.js";
import { logger } from "../lib/logger.js";
import type { Update } from "telegraf/types";

export async function handleTelegramWebhook(update: Update) {
  try {
    await bot.handleUpdate(update);
  } catch (error) {
    logger.error("Error handling Telegram webhook", error);
    throw error;
  }
}
