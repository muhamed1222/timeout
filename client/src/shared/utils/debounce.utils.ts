// Утилиты для debounce и оптимизации производительности

import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Хук для debounce значения
 * @param value - значение для debounce
 * @param delay - задержка в миллисекундах
 * @returns debounced значение
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Хук для debounce функции
 * @param callback - функция для debounce
 * @param delay - задержка в миллисекундах
 * @param deps - зависимости
 * @returns debounced функция
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T {
  return useCallback(debounce(callback, delay) as T, deps);
}

/**
 * Утилита для создания debounced функции
 * @param func - функция для debounce
 * @param wait - задержка в миллисекундах
 * @returns debounced функция
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Хук для мемоизации тяжелых вычислений
 * @param callback - функция для мемоизации
 * @param deps - зависимости
 * @returns мемоизированная функция
 */
export function useMemoizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  return useCallback(callback, deps);
}

/**
 * Хук для мемоизации селекторов
 * @param selector - функция селектора
 * @param deps - зависимости
 * @returns мемоизированный результат
 */
export function useMemoizedSelector<T>(
  selector: () => T,
  deps: React.DependencyList
): T {
  return useMemo(selector, deps);
}

/**
 * Хук для оптимизации фильтрации списков
 * @param items - список элементов
 * @param filterFn - функция фильтрации
 * @param searchQuery - поисковый запрос
 * @param delay - задержка для debounce
 * @returns отфильтрованный список
 */
export function useFilteredList<T>(
  items: T[],
  filterFn: (item: T, query: string) => boolean,
  searchQuery: string,
  delay: number = 300
): T[] {
  const debouncedQuery = useDebounce(searchQuery, delay);

  return useMemo(() => {
    if (!debouncedQuery.trim()) return items;

    const query = debouncedQuery.toLowerCase();
    return items.filter(item => filterFn(item, query));
  }, [items, debouncedQuery, filterFn]);
}

/**
 * Хук для оптимизации сортировки списков
 * @param items - список элементов
 * @param sortFn - функция сортировки
 * @param deps - зависимости
 * @returns отсортированный список
 */
export function useSortedList<T>(
  items: T[],
  sortFn: (a: T, b: T) => number,
  deps: React.DependencyList = []
): T[] {
  return useMemo(() => {
    return [...items].sort(sortFn);
  }, [items, ...deps]);
}

/**
 * Хук для пагинации списков
 * @param items - список элементов
 * @param page - текущая страница
 * @param pageSize - размер страницы
 * @returns пагинированный список и метаданные
 */
export function usePaginatedList<T>(
  items: T[],
  page: number,
  pageSize: number
) {
  return useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedItems = items.slice(startIndex, endIndex);
    const totalPages = Math.ceil(items.length / pageSize);

    return {
      items: paginatedItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      totalItems: items.length,
    };
  }, [items, page, pageSize]);
}
