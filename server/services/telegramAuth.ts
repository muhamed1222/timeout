import { createHmac } from "crypto";
import { logger } from "../lib/logger.js";
import type { TelegramUser } from "@outcasts/shared/types/api.js";

// Re-export for backward compatibility
export type { TelegramUser };

export function validateTelegramWebAppData(initData: string, botToken: string): TelegramUser | null {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get("hash");
    urlParams.delete("hash");
    
    if (!hash) {
      return null;
    }

    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
    const calculatedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

    if (calculatedHash !== hash) {
      return null;
    }

    const userParam = urlParams.get("user");
    if (!userParam) {
      return null;
    }

    const user = JSON.parse(userParam) as TelegramUser;
    return user;
  } catch (error) {
    logger.error("Error validating Telegram WebApp data", error);
    return null;
  }
}

export function extractTelegramUserFromInitData(initData: string): TelegramUser | null {
  try {
    const urlParams = new URLSearchParams(initData);
    const userParam = urlParams.get("user");
    
    if (!userParam) {
      return null;
    }

    return JSON.parse(userParam) as TelegramUser;
  } catch (error) {
    return null;
  }
}
