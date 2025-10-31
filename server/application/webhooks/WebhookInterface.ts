// Интерфейсы для системы webhook
export interface WebhookPayload {
  id: string;
  type: string;
  data: Record<string, unknown>;
  timestamp: Date;
  source: string;
  signature?: string;
  headers?: Record<string, string>;
}

export interface WebhookEvent {
  id: string;
  type: string;
  payload: WebhookPayload;
  processed: boolean;
  processedAt?: Date;
  attempts: number;
  maxAttempts: number;
  error?: string;
  createdAt: Date;
}

export interface WebhookHandler {
  type: string;
  handle(payload: WebhookPayload): Promise<void>;
}

export interface IWebhookProcessor {
  registerHandler(handler: WebhookHandler): void;
  processWebhook(payload: WebhookPayload): Promise<void>;
  retryFailedWebhooks(): Promise<void>;
  getWebhookStats(): Promise<{
    total: number;
    processed: number;
    failed: number;
    pending: number;
  }>;
}

export interface TelegramWebhookData {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    date: number;
    text?: string;
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    message?: {
      message_id: number;
      chat: {
        id: number;
        type: string;
      };
    };
    data?: string;
  };
}

export interface WebhookValidationResult {
  isValid: boolean;
  error?: string;
  data?: TelegramWebhookData;
}



