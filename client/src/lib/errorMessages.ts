/**
 * Localized Error Messages
 * 
 * Provides user-friendly, localized error messages for different error types
 */

import { ErrorType } from './errorHandling';

/**
 * Error message translations (Russian by default, can be extended for i18n)
 */
export const errorMessages: Record<ErrorType, Record<string, string>> = {
  [ErrorType.NETWORK]: {
    title: 'Ошибка сети',
    message: 'Не удалось подключиться к серверу. Проверьте подключение к интернету и попробуйте снова.',
    action: 'Проверить подключение',
  },
  [ErrorType.AUTHENTICATION]: {
    title: 'Требуется авторизация',
    message: 'Ваша сессия истекла. Пожалуйста, войдите снова.',
    action: 'Войти',
  },
  [ErrorType.AUTHORIZATION]: {
    title: 'Доступ запрещен',
    message: 'У вас нет прав для выполнения этого действия.',
    action: 'Вернуться назад',
  },
  [ErrorType.VALIDATION]: {
    title: 'Ошибка валидации',
    message: 'Проверьте введенные данные и попробуйте снова.',
    action: 'Исправить',
  },
  [ErrorType.NOT_FOUND]: {
    title: 'Ресурс не найден',
    message: 'Запрашиваемый ресурс не существует или был удален.',
    action: 'Вернуться назад',
  },
  [ErrorType.SERVER]: {
    title: 'Ошибка сервера',
    message: 'Произошла ошибка на сервере. Мы уже работаем над её устранением.',
    action: 'Попробовать снова',
  },
  [ErrorType.UNKNOWN]: {
    title: 'Произошла ошибка',
    message: 'Произошла непредвиденная ошибка. Попробуйте обновить страницу.',
    action: 'Обновить страницу',
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
export const contextErrors = {
  employees: {
    fetch: 'Не удалось загрузить список сотрудников',
    create: 'Не удалось создать сотрудника',
    update: 'Не удалось обновить данные сотрудника',
    delete: 'Не удалось удалить сотрудника',
    notFound: 'Сотрудник не найден',
  },
  shifts: {
    fetch: 'Не удалось загрузить смены',
    create: 'Не удалось создать смену',
    update: 'Не удалось обновить смену',
    delete: 'Не удалось удалить смену',
    notFound: 'Смена не найдена',
  },
  ratings: {
    fetch: 'Не удалось загрузить рейтинг',
    update: 'Не удалось обновить рейтинг',
    adjust: 'Не удалось изменить рейтинг',
  },
  violations: {
    fetch: 'Не удалось загрузить нарушения',
    create: 'Не удалось добавить нарушение',
    delete: 'Не удалось удалить нарушение',
  },
  invites: {
    fetch: 'Не удалось загрузить приглашения',
    create: 'Не удалось создать приглашение',
    delete: 'Не удалось удалить приглашение',
    notFound: 'Приглашение не найдено',
  },
  company: {
    fetch: 'Не удалось загрузить данные компании',
    update: 'Не удалось обновить данные компании',
  },
  dashboard: {
    fetch: 'Не удалось загрузить данные дашборда',
    stats: 'Не удалось загрузить статистику',
  },
};

/**
 * Get context-specific error message
 */
export function getContextErrorMessage(
  context: keyof typeof contextErrors,
  action: string
): string {
  const contextError = contextErrors[context];
  return (
    contextError[action as keyof typeof contextError] ||
    `Ошибка при выполнении действия: ${action}`
  );
}

