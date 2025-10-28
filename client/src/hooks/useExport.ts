import { useCallback } from 'react';
import { useToast } from './use-toast';

/**
 * Хук для экспорта данных в CSV
 */
export function useExport() {
  const { toast } = useToast();

  const exportToCSV = useCallback(
    <T extends Record<string, any>>(
      data: T[],
      filename: string,
      columns?: { key: keyof T; label: string }[]
    ) => {
      try {
        if (!data || data.length === 0) {
          toast({
            title: 'Ошибка экспорта',
            description: 'Нет данных для экспорта',
            variant: 'destructive',
          });
          return;
        }

        // Определяем колонки
        const cols =
          columns ||
          Object.keys(data[0]).map((key) => ({
            key: key as keyof T,
            label: key,
          }));

        // Формируем заголовки CSV
        const headers = cols.map((col) => col.label).join(',');

        // Формируем строки CSV
        const rows = data.map((row) =>
          cols
            .map((col) => {
              const value = row[col.key];
              // Экранируем значения с запятыми и кавычками
              if (value == null) return '';
              const stringValue = String(value);
              if (stringValue.includes(',') || stringValue.includes('"')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
              }
              return stringValue;
            })
            .join(',')
        );

        // Объединяем все в CSV
        const csv = [headers, ...rows].join('\n');

        // Создаём Blob и скачиваем файл
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
          title: 'Экспорт завершён',
          description: `Файл ${filename}.csv успешно загружен`,
        });
      } catch (error) {
        console.error('Error exporting to CSV:', error);
        toast({
          title: 'Ошибка экспорта',
          description: 'Не удалось экспортировать данные',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  return { exportToCSV };
}

