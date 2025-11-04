/**
 * Утилиты для работы с аналитикой эффективности
 */

import type { EmployeeEfficiency } from "@/hooks/features/useEfficiencyAnalytics";

/**
 * Типы иконок для изменения эффективности
 */
export type ChangeIconType = "up" | "down" | "none";

/**
 * Получает тип иконки изменения эффективности
 */
export function getChangeIconType(change?: number): ChangeIconType {
  if (change === undefined || change === 0) {
    return "none";
  }
  return change > 0 ? "up" : "down";
}

/**
 * Получает класс цвета для изменения эффективности
 */
export function getChangeColor(change?: number): string {
  if (change === undefined) {
    return "text-muted-foreground";
  }
  if (change > 0) {
    return "text-green-500";
  }
  return "text-destructive";
}

/**
 * Форматирует значение эффективности для отображения
 */
export function formatEfficiency(efficiency: number): string {
  return `${efficiency}%`;
}
