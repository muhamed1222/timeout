// Оптимизированный хук для определения мобильного устройства

import { useState, useEffect, useRef } from 'react';

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    // Проверяем сразу при монтировании
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    checkIsMobile();

    // Используем ResizeObserver для более эффективного отслеживания
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserverRef.current = new ResizeObserver(entries => {
        for (const entry of entries) {
          const width = entry.contentRect.width;
          setIsMobile(width < MOBILE_BREAKPOINT);
        }
      });

      resizeObserverRef.current.observe(document.body);
    } else {
      // Fallback для старых браузеров
      const handleResize = () => {
        setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, []);

  return isMobile;
}

// Экспорт для обратной совместимости
export const useMobile = useIsMobile;
