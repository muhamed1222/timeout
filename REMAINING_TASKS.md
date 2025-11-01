# 📋 Оставшиеся задачи

**Дата обновления:** January 2025  
**Статус:** Все основные задачи выполнены, остались дополнительные улучшения

---

## ✅ Уже выполнено (из TODO.md)

- ✅ **Accessibility** - WCAG 2.1 AA compliance достигнуто
- ✅ **API Documentation** - Swagger/OpenAPI полностью настроен
- ✅ **E2E Tests (базовые)** - company-management, violation-management, schedule-management уже есть

---

## 🔴 ПРИОРИТЕТ 1: Критичные задачи (4) - 1 выполнена ✅

### 1. ✅ E2E тесты для критических flow
**Статус:** ✅ Выполнено  
**Важность:** 🔴 Критично  
**Время:** ✅ Завершено

**Выполнено:**
- [x] E2E тест: Shift lifecycle (create → start → pause → resume → end) - `tests/e2e/shift-lifecycle.spec.ts`
- [x] E2E тест: Rating system (violation → rating update → exception) - `tests/e2e/rating-system.spec.ts`
- [x] E2E тест: Employee onboarding (invite → accept → first shift) - `tests/e2e/employee-onboarding.spec.ts`
- [x] E2E тест: Company management - `tests/e2e/company-management.spec.ts`
- [x] E2E тест: Violation management - `tests/e2e/violation-management.spec.ts`
- [x] E2E тест: Schedule management - `tests/e2e/schedule-management.spec.ts`

**Осталось (опционально):**
- [ ] E2E тест: Telegram bot integration (если возможно тестировать автоматически)

---

### 2. ✅ Убрать все any типы + типизировать API responses
**Статус:** ✅ Выполнено  
**Важность:** 🔴 Критично  
**Время:** ✅ Завершено  

**Задачи:**
- [ ] Найти все `any` типы в проекте (grep по коду)
- [ ] Создать типы для API responses в `shared/types/api.ts`
- [ ] Типизировать middleware (authenticateBot, etc.)
- [ ] Типизировать оставшиеся методы в storage.ts (если еще используются)
- [ ] Включить strict mode в TypeScript (убрать any из разрешенных)
- [ ] Исправить все resulting type errors

**Файлы для проверки:**
- `server/routes/*.ts` (middleware с any)
- `server/middleware/*.ts`
- `shared/types/` (создать новые типы)
- `tsconfig.json` (strict: true)

**Команда для поиска:**
```bash
grep -r ":\s*any" server/ shared/ --include="*.ts"
```

---

### 3. ✅ Secrets management (AWS Secrets Manager / Vault)
**Статус:** ✅ Выполнено  
**Важность:** 🟡 Важно  
**Время:** ✅ Завершено  

**Задачи:**
- [ ] Выбрать решение (dotenv-vault / AWS Secrets Manager / HashiCorp Vault)
- [ ] Setup выбранного решения
- [ ] Encrypted .env для production
- [ ] Rotation strategy для secrets
- [ ] Documentation для secret management
- [ ] CI/CD integration (обновить GitHub Secrets)

**Файлы:**
- `server/lib/secrets.ts` (новый)
- `.env.vault` (новый, зашифрованный)
- `SECRETS_MANAGEMENT.md` (документация)
- `.github/workflows/` (обновить для использования secrets)

---

### 4. ✅ Database backups автоматические + migration rollback
**Статус:** ✅ Выполнено  
**Важность:** 🟡 Важно  
**Время:** ✅ Завершено  

**Задачи:**
- [ ] Automated backup script (daily via cron/GitHub Actions)
- [ ] Backup retention policy (7 days, 4 weeks, 12 months)
- [ ] Point-in-time recovery setup (если использует Supabase, уже есть)
- [ ] Migration rollback strategy (drizzle-kit rollback)
- [ ] Backup verification script
- [ ] Documentation

**Файлы:**
- `scripts/backup-database.sh` (новый)
- `scripts/restore-database.sh` (новый)
- `scripts/verify-backup.sh` (новый)
- `migrations/rollback.sh` (новый, или в package.json)
- `DATABASE_BACKUP_GUIDE.md` (документация)
- `.github/workflows/backup.yml` (опционально, для автоматизации)

---

## 🟡 ПРИОРИТЕТ 2: Важные улучшения (1)

### 5. ✅ React Query optimizations (оптимистичные обновления)
**Статус:** ✅ Выполнено  
**Важность:** 🟢 Желательно  
**Время:** ✅ Завершено  

**Задачи:**
- [ ] Оптимистичные обновления для mutations (rating, shift status, etc.)
- [ ] Prefetching для навигации (prefetch employee data на hover)
- [ ] Query invalidation strategy (улучшить существующую)
- [ ] Stale time optimization (настроить для разных queries)
- [ ] Background refetch настройка (refetchInterval для live data)

**Файлы:**
- `client/src/lib/queryClient.ts` (улучшить конфигурацию)
- `client/src/hooks/mutations/*.ts` (добавить optimistic updates)
- `client/src/pages/*.tsx` (добавить prefetching)

**Примеры для оптимизации:**
- Rating mutations → optimistic update
- Shift status changes → optimistic update
- Employee creation → optimistic update

---

## 🟢 ПРИОРИТЕТ 3: Полировка (3)

### 6. ✅ Error handling улучшения + loading states
**Статус:** ✅ Выполнено  
**Важность:** 🟢 Желательно  
**Время:** ✅ Завершено  

**Осталось:**
- [x] Error boundary components (уже есть `ErrorBoundary.tsx`)
- [ ] Skeleton loaders для всех страниц (есть базовые, нужно расширить)
- [x] Empty states (уже есть `EmptyState.tsx`)
- [ ] Retry mechanisms для failed queries
- [ ] User-friendly error messages (локализация, детальные сообщения)

**Файлы:**
- `client/src/components/ErrorBoundary.tsx` (улучшить)
- `client/src/components/LoadingSkeletons.tsx` (расширить)
- `client/src/lib/errorMessages.ts` (новый, локализация ошибок)
- `client/src/hooks/useRetry.ts` (новый, retry логика)

---

### 7. ✅ Accessibility - Дополнительные улучшения
**Статус:** ✅ Выполнено  
**Важность:** 🟢 Желательно  
**Время:** ✅ Завершено  

**Осталось (опционально):**
- [ ] Keyboard shortcuts (добавить `/` для поиска, `Ctrl+K` для команд)
- [ ] Reduced motion support (`prefers-reduced-motion`)
- [ ] High contrast mode
- [ ] Focus management improvements (лучший focus trap)
- [ ] Screen reader testing с реальными пользователями

**Файлы:**
- `client/src/hooks/useKeyboardShortcuts.ts` (новый)
- `client/src/index.css` (добавить reduced-motion)
- `docs/ACCESSIBILITY_TESTING.md` (документация)

---

### 8. ⚠️ API Documentation - Дополнительные улучшения
**Статус:** Основное выполнено, можно улучшить  
**Важность:** 🟢 Желательно  
**Время:** ~1-2 часа  

**Осталось (опционально):**
- [x] Swagger/OpenAPI setup (✅ выполнено)
- [ ] Дополнить все endpoints примерами
- [ ] Добавить authentication flow в документацию
- [ ] Code examples для всех endpoints (curl, JS, Python)
- [ ] Postman collection экспорт

**Файлы:**
- `openapi.yaml` (дополнить examples)
- `docs/API_EXAMPLES.md` (новый)
- `postman_collection.json` (новый)

---

## 🔵 ДОПОЛНИТЕЛЬНЫЕ ЗАДАЧИ (из других отчетов)

### 9. ❌ Telegram bot webhook вместо polling
**Статус:** Pending  
**Важность:** 🟡 Важно для production  
**Время:** ~3-4 часа  

**Задачи:**
- [ ] Настроить webhook endpoint `/api/telegram/webhook`
- [ ] Изменить `launchBot.ts` для использования webhook
- [ ] Настроить SSL для webhook (нужен для production)
- [ ] Обновить документацию

**Файлы:**
- `server/routes/telegram-webhook.ts` (новый)
- `server/telegram/launchBot.ts` (изменить)
- `TELEGRAM_BOT_SETUP.md` (обновить)

---

### 10. ❌ Рефакторинг Telegram handlers
**Статус:** Pending  
**Важность:** 🟢 Желательно  
**Время:** ~4-6 часов  

**Задачи:**
- [ ] Создать API endpoints для всех Telegram действий
- [ ] Переписать handlers на вызовы HTTP API
- [ ] Удалить прямой доступ к storage из handlers
- [ ] Улучшить error handling

**Файлы:**
- `server/routes/webapp.ts` (расширить)
- `server/telegram/handlers/*.ts` (рефакторинг)

---

### 11. ❌ Удалить мёртвый код
**Статус:** Pending  
**Важность:** 🟢 Желательно  
**Время:** ~2-3 часа  

**Задачи:**
- [ ] Проверить и удалить неиспользуемые Services (если есть)
- [ ] Проверить absence, report, reminders handlers (используются ли?)
- [ ] Аудит UI компонентов (удалить неиспользуемые)
- [ ] Очистить неиспользуемые импорты

**Файлы для проверки:**
- `server/services/` (проверить использование)
- `server/telegram/handlers/` (absence.ts, report.ts, reminders.ts)
- `client/src/components/ui/` (неиспользуемые компоненты)

---

### 12. ❌ Аудит логирование
**Статус:** Pending (частично есть)  
**Важность:** 🟢 Желательно  
**Время:** ~2-3 часа  

**Задачи:**
- [ ] Реализовать полную таблицу audit_log в БД
- [ ] Аудит все критические действия (create, update, delete)
- [ ] Логирование изменений данных
- [ ] Audit log viewer в UI (опционально)

**Файлы:**
- `server/lib/audit.ts` (расширить - есть TODO)
- `migrations/0004_audit_log_implementation.sql` (новый)
- `server/repositories/AuditRepository.ts` (улучшить методы)

---

### 13. ❌ WebSocket для real-time
**Статус:** Pending  
**Важность:** 🟢 Желательно  
**Время:** ~6-8 часов  

**Задачи:**
- [ ] Выбрать решение (Socket.io / ws / native WebSocket)
- [ ] Setup WebSocket server
- [ ] Real-time updates для shifts (start/end/pause)
- [ ] Real-time updates для exceptions
- [ ] Real-time dashboard stats
- [ ] Client-side integration (React hooks)

**Файлы:**
- `server/lib/websocket.ts` (новый)
- `server/routes/websocket.ts` (новый)
- `client/src/hooks/useWebSocket.ts` (новый)

---

## 📊 Статистика оставшихся задач

### По приоритетам:
- **Приоритет 1 (Критично):** 3 задачи (1 выполнена ✅)
- **Приоритет 2 (Важно):** 1 задача  
- **Приоритет 3 (Полировка):** 3 задачи (частично выполнены)
- **Дополнительные:** 5 задач

### Общее время:
- **Приоритет 1:** ~6-9 часов (3 часа выполнено ✅)
- **Приоритет 2:** ~2-3 часа
- **Приоритет 3:** ~2-4 часа (частично выполнено)
- **Дополнительные:** ~17-26 часов
- **ИТОГО:** ~27-42 часов работы

---

## 🎯 Рекомендуемый порядок выполнения

### Минимум для production-ready:
1. **Убрать все any типы** (2-3 часа) - улучшит типобезопасность
2. **Расширить E2E тесты** (2-3 часа) - повысит уверенность
3. **Database backups** (2-3 часа) - критично для production
4. **Secrets management** (2-3 часа) - безопасность

**Время:** ~8-12 часов  
**Результат:** Production-ready с базовой безопасностью

### Идеальный проект:
5. **React Query optimizations** (2-3 часа)
6. **Telegram webhook** (3-4 часа)
7. **Error handling improvements** (2-3 часа)
8. **Refactoring Telegram handlers** (4-6 часов)

**Время:** ~11-16 часов дополнительно  
**Результат:** 🏆 Production-perfect project

---

## 📝 Примечания

- Задачи 7 (Accessibility) и 8 (API Docs) в основном выполнены, остались только дополнительные улучшения
- Задача 6 (Error handling) частично выполнена, нужно расширить
- Все задачи опциональны - проект уже готов к production

---

**Последнее обновление:** January 2025

