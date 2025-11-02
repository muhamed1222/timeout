// Telegram bot commands
export const TELEGRAM_COMMANDS = {
  START: '/start',
  STATUS: '/status',
} as const;

// Telegram bot messages (Russian)
export const TELEGRAM_MESSAGES = {
  // Welcome messages
  WELCOME_WITH_INVITE: (name: string) => 
    `✅ Добро пожаловать, ${name}!\n\n` +
    "Ваш аккаунт успешно активирован.\n" +
    "Используйте кнопку ниже для управления рабочими сменами.",
  
  WELCOME_DEFAULT: 
    "Добро пожаловать в систему управления сменами! 🚀\n\n" +
    "Используйте кнопку ниже для управления рабочими сменами.",

  // Error messages
  ALREADY_LINKED: 
    "❌ Ваш Telegram уже связан с аккаунтом.\n\n" +
    "Используйте /start для доступа к панели смен.",
  
  INVALID_INVITE: 
    "❌ Неверный или использованный код приглашения.\n\n" +
    "Обратитесь к администратору за новым кодом.",
  
  INVITE_PROCESSING_ERROR: 
    "❌ Ошибка при обработке приглашения.\n\n" +
    "Пожалуйста, попробуйте позже или обратитесь к администратору.",

  EMPLOYEE_NOT_FOUND: 
    "❌ Сотрудник не найден. Обратитесь к администратору.",

  // Status messages
  STATUS_WORKING: (startTime: string, endTime: string) =>
    `📊 Статус: На работе\n⏰ Смена с ${startTime} до ${endTime}`,
  
  STATUS_OFF_WORK: 
    "📊 Статус: Не на работе",
} as const;

// Button labels
export const TELEGRAM_BUTTONS = {
  OPEN_WEBAPP: "🚀 Открыть панель смен",
} as const;

// WebApp configuration
export const getWebAppUrl = () => 
  process.env.WEBAPP_URL || 'https://your-domain.replit.app';

// Inline keyboard for opening WebApp
export const getWebAppKeyboard = () => ({
  inline_keyboard: [[
    {
      text: TELEGRAM_BUTTONS.OPEN_WEBAPP,
      web_app: { url: `${getWebAppUrl()}/miniapp` }
    }
  ]]
});
