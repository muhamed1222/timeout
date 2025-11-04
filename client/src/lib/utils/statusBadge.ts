/**
 * Утилиты для работы со статусами смен
 */

import type { ShiftRow } from "@/types";

/**
 * Стили для разных статусов смен
 * Использует цвета дизайн-системы
 */
export const STATUS_STYLES = {
  active: {
    className: "bg-green-500/10 text-green-600 hover:bg-green-500/10",
    label: "Активен",
  },
  break: {
    className: "bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/10",
    label: "Обед",
  },
  completed: {
    className: "bg-red-500/10 text-red-600 hover:bg-red-500/10",
    label: "Завершил",
  },
} as const;

/**
 * Получает конфигурацию стилей для статуса смены
 */
export function getShiftStatusConfig(status: ShiftRow["status"]) {
  const statusConfig = STATUS_STYLES[status];
  
  if (!statusConfig) {
    return null;
  }

  return {
    className: `${statusConfig.className} rounded-full px-6 py-2`,
    label: statusConfig.label,
  };
}

