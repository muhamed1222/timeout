/**
 * Компонент карточки сотрудника
 * Отображает информацию о сотруднике с возможностью редактирования и удаления
 */

import { memo } from "react";
import { motion } from "framer-motion";
import { Edit, Trash } from "lucide-react";
import { Button } from "@/ui/button";
import { getEmployeeAvatarUrl, getEmployeeInitials } from "@/lib/employeeAvatar";
import { fadeScale, cardHover, tapScale, getTransition } from "@/lib/motionPresets";
import type { EmployeeDisplay } from "@/types";

export interface IEmployeeCardProps {
  /** Данные сотрудника */
  employee: EmployeeDisplay;
  /** Обработчик открытия профиля */
  onEdit?: (employee: EmployeeDisplay) => void;
  /** Обработчик удаления */
  onDelete?: (employee: EmployeeDisplay) => void;
  /** Индекс для staggered анимации */
  index?: number;
}

export const EmployeeCard = memo(function EmployeeCard({
  employee,
  onEdit,
  onDelete,
  index = 0,
}: IEmployeeCardProps) {
  const avatarUrl = getEmployeeAvatarUrl(employee);
  const initials = getEmployeeInitials(employee.full_name);
  const transition = getTransition(0.25);
  const shouldReduce = typeof window !== "undefined" && 
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
      {/* Верхняя часть: Аватар, Имя, Должность, Кнопки */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={employee.full_name}
              className="size-12 rounded-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                const fallback = target.parentElement?.querySelector(
                  ".avatar-fallback"
                ) as HTMLElement;
                if (fallback) {
                  fallback.style.display = "flex";
                }
              }}
            />
          ) : null}
          <div
            className={`size-12 rounded-full bg-destructive flex items-center justify-center text-destructive-foreground font-medium avatar-fallback ${
              avatarUrl ? "hidden" : ""
            }`}
          >
            {initials}
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-base font-semibold text-foreground leading-tight">
              {employee.full_name}
            </div>
            <div className="text-sm text-primary leading-tight">
              {employee.position || "Сотрудник"}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {onEdit && (
            <Button
              onClick={() => onEdit(employee)}
              size="icon"
              variant="default"
              className="h-8 w-8 rounded-lg"
              aria-label="Открыть профиль сотрудника"
            >
              <Edit className="w-4 h-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              onClick={() => onDelete(employee)}
              size="icon"
              variant="outline"
              className="h-8 w-8 rounded-lg"
              aria-label="Удалить сотрудника"
            >
              <Trash className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Нижняя часть: ID */}
      <div className="flex flex-col gap-3">
        <div className="bg-background rounded-lg px-3 py-2 inline-flex items-center justify-center w-fit">
          <span className="text-sm text-muted-foreground leading-tight">
            ID: {employee.id.slice(0, 8)}
          </span>
        </div>
      </div>
    </>
  );

  if (shouldReduce) {
    return (
      <div
        className="bg-muted rounded-lg p-4 h-[230px] w-[267px] flex flex-col justify-between transition-shadow duration-200 hover:shadow-lg"
        data-testid={`employee-card-${employee.id}`}
      >
        {cardContent}
      </div>
    );
  }

  return (
    <motion.div
      className="bg-muted rounded-lg p-4 h-[230px] w-[267px] flex flex-col justify-between"
      data-testid={`employee-card-${employee.id}`}
      variants={variants}
      initial="hidden"
      animate="show"
      whileHover={cardHover}
      whileTap={tapScale}
      transition={transition}
    >
      {cardContent}
    </motion.div>
  );
});

