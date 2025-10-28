import { useState, useMemo } from 'react';

/**
 * Хук для поиска в массиве объектов
 * @param data - массив данных для поиска
 * @param searchFields - поля, по которым производится поиск
 * @returns объект с query, setQuery и filteredData
 */
export function useSearch<T extends Record<string, any>>(
  data: T[],
  searchFields: (keyof T)[]
) {
  const [query, setQuery] = useState('');

  const filteredData = useMemo(() => {
    if (!query.trim()) return data;

    const lowercaseQuery = query.toLowerCase();

    return data.filter((item) =>
      searchFields.some((field) => {
        const value = item[field];
        if (value == null) return false;
        return String(value).toLowerCase().includes(lowercaseQuery);
      })
    );
  }, [data, query, searchFields]);

  return {
    query,
    setQuery,
    filteredData,
  };
}

