/**
 * Унифицированные пресеты анимаций для Framer Motion
 * Используются по всему приложению для единообразного UX
 */

import type { Variants, Transition } from "framer-motion";

/**
 * Проверка предпочтения пользователя на уменьшенную анимацию
 * @returns true если пользователь предпочитает уменьшенную анимацию
 */
export function shouldReduceMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Получить переход с учетом prefers-reduced-motion
 */
export function getTransition(
  duration: number = 0.25,
  ease: number[] = [0.16, 1, 0.3, 1]
): Transition {
  const shouldReduce = typeof window !== "undefined" && 
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  
  return shouldReduce
    ? { duration: 0 }
    : { duration, ease };
}

/**
 * Fade + Scale анимация для карточек
 */
export const fadeScale: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] }
  },
  exit: { 
    opacity: 0, 
    scale: 0.97,
    transition: { duration: 0.15, ease: [0.16, 1, 0.3, 1] }
  },
};

/**
 * Slide Up анимация для страниц
 */
export const slideUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] }
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: { duration: 0.15, ease: [0.16, 1, 0.3, 1] }
  },
};

/**
 * Fade анимация (только прозрачность)
 */
export const fade: Variants = {
  hidden: { opacity: 0 },
  show: { 
    opacity: 1,
    transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.15, ease: [0.16, 1, 0.3, 1] }
  },
};

/**
 * Hover эффект для карточек
 */
export const cardHover = {
  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
  transition: { duration: 0.2, ease: "easeOut" },
};

/**
 * Tap эффект для интерактивных элементов
 */
export const tapScale = {
  scale: 0.97,
  transition: { duration: 0.1 },
};

/**
 * Hover scale эффект для кнопок и карточек
 */
export const hoverScale = {
  scale: 1.02,
  transition: { duration: 0.2, ease: "easeOut" },
};

