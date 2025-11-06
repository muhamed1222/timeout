/**
 * Компонент статистики дашборда
 * Отображает ключевые метрики компании: сотрудники, смены, нарушения
 */

import { memo, type ComponentType, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { Users, Clock, Flag, AlertTriangle, ArrowUpRight } from "lucide-react";
import { Link } from "wouter";
import {
  fadeScale,
  cardHover,
  tapScale,
  getTransition,
} from "@/lib/motionPresets";

/**
 * Пропсы для карточки статистики
 */
interface IStatCardProps {
  /** Заголовок карточки */
  title: string;
  /** Значение для отображения */
  value: string | number;
  /** Иконка для отображения */
  icon: ComponentType<{ className?: string }>;
  /** Показывать ли вторичную иконку (ссылка) */
  hasSecondaryIcon?: boolean;
  /** ID для тестирования */
  testId?: string;
  /** Обработчик клика */
  onClick?: () => void;
  /** Индекс для staggered анимации */
  index?: number;
}

const StatCard = memo(
  ({
    title,
    value,
    icon: Icon,
    hasSecondaryIcon,
    testId,
    onClick,
    index = 0,
  }: IStatCardProps) => {
    const defaultTestId = `stat-card-${title.toLowerCase().replace(/\s+/g, "-")}`;
    const cardTestId = testId ?? defaultTestId;
    const transition = getTransition(0.25);
    const shouldReduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const isClickable = typeof onClick === "function";

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      if (!isClickable) {
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onClick?.();
      }
    };

    const variants = {
      hidden: { ...fadeScale.hidden },
      show: {
        ...fadeScale.show,
        transition: {
          delay: index * 0.05,
        },
      },
    };

    const cardContent = (
      <>
        <div className="flex items-start justify-between">
          <div className="bg-background rounded-full size-12 flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary" />
          </div>
          {hasSecondaryIcon && (
            <Link
              href="/exceptions"
              aria-label="Перейти к Нарушения"
              onClick={onClick}
            >
              <div className="bg-background/50 rounded-full size-12 flex items-center justify-center cursor-pointer hover:bg-background/70 transition-colors">
                <ArrowUpRight className="w-6 h-6 text-muted-foreground" />
              </div>
            </Link>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <div className="font-semibold text-base text-foreground">{title}</div>
          <div className="bg-background rounded-lg px-3 py-2 inline-flex items-center justify-center w-fit">
            <div className="text-muted-foreground text-sm">{value}</div>
          </div>
        </div>
      </>
    );

    if (shouldReduce) {
      return (
        <div
          className={`bg-muted rounded-lg p-4 h-[180px] flex flex-col justify-between flex-1 transition-shadow duration-200 hover:shadow-lg ${
            isClickable
              ? "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring"
              : ""
          }`}
          data-testid={cardTestId}
          role={isClickable ? "button" : undefined}
          tabIndex={isClickable ? 0 : undefined}
          onClick={onClick}
          onKeyDown={handleKeyDown}
        >
          {cardContent}
        </div>
      );
    }

    return (
      <motion.div
        className={`bg-muted rounded-lg p-4 h-[180px] flex flex-col justify-between flex-1 ${
          isClickable
            ? "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring"
            : ""
        }`}
        data-testid={cardTestId}
        role={isClickable ? "button" : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        variants={variants}
        initial="hidden"
        animate="show"
        whileHover={cardHover}
        whileTap={isClickable ? tapScale : undefined}
        transition={transition}
      >
        {cardContent}
      </motion.div>
    );
  },
);

/**
 * Пропсы компонента DashboardStats
 */
export interface IDashboardStatsProps {
  /** Общее количество сотрудников */
  totalEmployees: number;
  /** Количество активных смен */
  activeShifts: number;
  /** Количество завершенных смен за сегодня */
  completedShifts: number;
  /** Количество нарушений */
  exceptions: number;
  /** Обработчик просмотра нарушений */
  onViewExceptions?: () => void;
}

const DashboardStats = memo(
  ({
    totalEmployees,
    activeShifts,
    completedShifts,
    exceptions,
    onViewExceptions,
  }: IDashboardStatsProps) => {
    const handleViewExceptions = () => {
      onViewExceptions?.();
    };

    return (
      <div className="flex gap-4">
        <StatCard
          title="Всего сотрудников"
          value={totalEmployees}
          icon={Users}
          hasSecondaryIcon
          index={0}
        />
        <StatCard
          title="Активные смены"
          value={activeShifts}
          icon={Clock}
          index={1}
        />
        <StatCard
          title="Завершено сегодня"
          value={completedShifts}
          icon={Flag}
          testId="stat-card-завершённые-смены"
          index={2}
        />
        <StatCard
          title="Нарушения"
          value={exceptions}
          icon={AlertTriangle}
          hasSecondaryIcon
          testId="stat-card-исключения"
          onClick={handleViewExceptions}
          index={3}
        />
        {/* Live region for screen reader announcements */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
          id="dashboard-announcements"
        />
      </div>
    );
  },
);

export default DashboardStats;
