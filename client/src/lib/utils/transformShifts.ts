/**
 * Утилиты для трансформации данных смен
 */

import type { ActiveShift, ShiftRow } from "@/types";

/**
 * Определяет статус смены на основе данных
 * 
 * @param shift - Активная смена с данными о статусе
 * @returns Статус смены: "active" | "break" | "completed"
 * 
 * @example
 * ```ts
 * const status = getShiftStatus(shift);
 * // Возвращает "active" если смена активна, "completed" если завершена
 * ```
 */
export function getShiftStatus(
  shift: ActiveShift
): "active" | "break" | "completed" {
  if (shift.status === "completed") {
    return "completed";
  }
  if (shift.status === "active") {
    return "active";
  }
  // По умолчанию считаем активной (можно расширить логику для "break")
  return "active";
}

/**
 * Форматирует время начала смены в читаемый формат
 * 
 * Использует actual_start_at если доступно, иначе planned_start_at.
 * Для фактического времени показывает секунды, для запланированного - только часы и минуты.
 * 
 * @param shift - Активная смена с данными о времени начала
 * @returns Отформатированная строка времени в формате "ЧЧ:ММ" или "ЧЧ:ММ:СС"
 * 
 * @example
 * ```ts
 * const time = formatShiftStartTime(shift);
 * // Возвращает "09:30" или "09:30:15" в зависимости от наличия actual_start_at
 * ```
 */
export function formatShiftStartTime(
  shift: ActiveShift
): string {
  const time = shift.actual_start_at
    ? new Date(shift.actual_start_at)
    : new Date(shift.planned_start_at);

  // Если есть actual_start_at, показываем секунды
  if (shift.actual_start_at) {
    return time.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  // Иначе только часы и минуты
  return time.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Трансформирует массив активных смен в формат данных для отображения в таблице
 * 
 * Преобразует данные смен из формата API в формат, удобный для отображения в таблице.
 * Включает информацию о сотруднике, времени начала, статусе и рейтинге.
 * 
 * @param shifts - Массив активных смен с данными сотрудников
 * @returns Массив строк таблицы с отформатированными данными смен
 * 
 * @example
 * ```ts
 * const tableData = transformActiveShiftsToTableData(activeShifts);
 * // Возвращает массив ShiftRow для отображения в таблице
 * ```
 */
export function transformActiveShiftsToTableData(
  shifts: ActiveShift[]
): ShiftRow[] {
  return shifts.map((shift) => ({
    id: shift.id,
    employeeName: shift.employee.full_name,
    position: shift.employee.position || "Сотрудник",
    startedAt: formatShiftStartTime(shift),
    rating: "100%", // TODO: получать из рейтингов
    status: getShiftStatus(shift),
  }));
}

/**
 * Трансформирует завершенные смены в данные для таблицы
 */
export function transformCompletedShiftsToTableData(
  shifts: ActiveShift[]
): ShiftRow[] {
  return shifts.map((shift) => ({
    id: shift.id,
    employeeName: shift.employee.full_name,
    position: shift.employee.position || "Сотрудник",
    startedAt: formatShiftStartTime(shift),
    rating: "66%", // TODO: получать из рейтингов
    status: "completed" as const,
  }));
}

