/**
 * Localized Error Messages
 * 
 * Provides user-friendly, localized error messages for different error types
 */

import { ErrorType } from "./errorHandling";

/**
 * Error message translations (Russian by default, can be extended for i18n)
 */
export const errorMessages: Record<ErrorType, { title: string; message: string; action: string }> = {
  [ErrorType.NETWORK]: {
    title: "Ошибка сети",
    message: "Не удалось подключиться к серверу. Проверьте подключение к интернету и попробуйте снова.",
    action: "Проверить подключение",
  },
  [ErrorType.AUTHENTICATION]: {
    title: "Требуется авторизация",
    message: "Ваша сессия истекла. Пожалуйста, войдите снова.",
    action: "Войти",
  },
  [ErrorType.AUTHORIZATION]: {
    title: "Доступ запрещен",
    message: "У вас нет прав для выполнения этого действия.",
    action: "Вернуться назад",
  },
  [ErrorType.VALIDATION]: {
    title: "Ошибка валидации",
    message: "Проверьте введенные данные и попробуйте снова.",
    action: "Исправить",
  },
  [ErrorType.NOT_FOUND]: {
    title: "Ресурс не найден",
    message: "Запрашиваемый ресурс не существует или был удален.",
    action: "Вернуться назад",
  },
  [ErrorType.SERVER]: {
    title: "Ошибка сервера",
    message: "Произошла ошибка на сервере. Мы уже работаем над её устранением.",
    action: "Попробовать снова",
  },
  [ErrorType.UNKNOWN]: {
    title: "Произошла ошибка",
    message: "Произошла непредвиденная ошибка. Попробуйте обновить страницу.",
    action: "Обновить страницу",
  },
};

/**
 * Get user-friendly error message by error type
 */
export function getErrorMessage(errorType: ErrorType): {
  title: string;
  message: string;
  action: string;
} {
  return errorMessages[errorType] || errorMessages[ErrorType.UNKNOWN];
}

/**
 * Context-specific error messages
 */
export const contextErrors: Record<string, Record<string, { title: string; message: string; action: string }>> = {
  employees: {
    fetch: { title: "Ошибка загрузки", message: "Не удалось загрузить список сотрудников", action: "Попробовать снова" },
    create: { title: "Ошибка создания", message: "Не удалось создать сотрудника", action: "Попробовать снова" },
    update: { title: "Ошибка обновления", message: "Не удалось обновить данные сотрудника", action: "Попробовать снова" },
    delete: { title: "Ошибка удаления", message: "Не удалось удалить сотрудника", action: "Попробовать снова" },
    notFound: { title: "Не найдено", message: "Сотрудник не найден", action: "Вернуться назад" },
  },
  shifts: {
    fetch: { title: "Ошибка загрузки", message: "Не удалось загрузить смены", action: "Попробовать снова" },
    create: { title: "Ошибка создания", message: "Не удалось создать смену", action: "Попробовать снова" },
    update: { title: "Ошибка обновления", message: "Не удалось обновить смену", action: "Попробовать снова" },
    delete: { title: "Ошибка удаления", message: "Не удалось удалить смену", action: "Попробовать снова" },
    notFound: { title: "Не найдено", message: "Смена не найдена", action: "Вернуться назад" },
  },
  ratings: {
    fetch: { title: "Ошибка загрузки", message: "Не удалось загрузить рейтинг", action: "Попробовать снова" },
    update: { title: "Ошибка обновления", message: "Не удалось обновить рейтинг", action: "Попробовать снова" },
    adjust: { title: "Ошибка изменения", message: "Не удалось изменить рейтинг", action: "Попробовать снова" },
  },
  violations: {
    fetch: { title: "Ошибка загрузки", message: "Не удалось загрузить нарушения", action: "Попробовать снова" },
    create: { title: "Ошибка создания", message: "Не удалось добавить нарушение", action: "Попробовать снова" },
    delete: { title: "Ошибка удаления", message: "Не удалось удалить нарушение", action: "Попробовать снова" },
  },
  invites: {
    fetch: { title: "Ошибка загрузки", message: "Не удалось загрузить приглашения", action: "Попробовать снова" },
    create: { title: "Ошибка создания", message: "Не удалось создать приглашение", action: "Попробовать снова" },
    delete: { title: "Ошибка удаления", message: "Не удалось удалить приглашение", action: "Попробовать снова" },
    notFound: { title: "Не найдено", message: "Приглашение не найдено", action: "Вернуться назад" },
  },
  company: {
    fetch: { title: "Ошибка загрузки", message: "Не удалось загрузить данные компании", action: "Попробовать снова" },
    update: { title: "Ошибка обновления", message: "Не удалось обновить данные компании", action: "Попробовать снова" },
  },
  dashboard: {
    fetch: { title: "Ошибка загрузки", message: "Не удалось загрузить данные дашборда", action: "Попробовать снова" },
    stats: { title: "Ошибка загрузки", message: "Не удалось загрузить статистику", action: "Попробовать снова" },
  },
};

/**
 * Get context-specific error message
 */
export function getContextErrorMessage(
  context: keyof typeof contextErrors,
  action: keyof typeof contextErrors[typeof context],
): { title: string; message: string; action: string } {
  const contextError = contextErrors[context];
  return (
    contextError[action] || {
      title: "Неизвестная ошибка",
      message: `Произошла непредвиденная ошибка при выполнении действия: ${String(action)}`,
      action: "Попробовать снова",
    }
  );
}
