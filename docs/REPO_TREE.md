# Repository Tree

├── .github
│   └── workflows
│       ├── backup.yml
│       ├── ci-comprehensive.yml
│       ├── ci.yml
│       ├── deploy.yml
│       ├── nightly.yml
│       ├── pr-checks.yml
│       └── test.yml
├── api
│   └── index.js
├── attached_assets
│   └── generated_images
│       ├── logotype.svg
│       └── Professional_employee_avatar_7b6fbe18.png
├── client
│   ├── public
│   │   ├── avatars
│   │   │   ├── 1_optimized.png
│   │   │   ├── 1_resized.png
│   │   │   ├── 1.png
│   │   │   ├── 1.webp
│   │   │   ├── 2_optimized.png
│   │   │   ├── 2_resized.png
│   │   │   ├── 2.png
│   │   │   ├── 2.webp
│   │   │   ├── 3_optimized.png
│   │   │   ├── 3_resized.png
│   │   │   ├── 3.png
│   │   │   ├── 3.webp
│   │   │   ├── 4_optimized.png
│   │   │   ├── 4_resized.png
│   │   │   ├── 4.png
│   │   │   ├── 4.webp
│   │   │   ├── 5_optimized.png
│   │   │   ├── 5_resized.png
│   │   │   ├── 5.png
│   │   │   ├── 5.webp
│   │   │   ├── 6_optimized.png
│   │   │   ├── 6_resized.png
│   │   │   ├── 6.png
│   │   │   ├── 6.webp
│   │   │   ├── 7_optimized.png
│   │   │   ├── 7_resized.png
│   │   │   ├── 7.png
│   │   │   ├── 7.webp
│   │   │   ├── 8_optimized.png
│   │   │   ├── 8_resized.png
│   │   │   ├── 8.png
│   │   │   ├── 8.webp
│   │   │   └── README.md
│   │   └── favicon.svg
│   ├── src
│   │   ├── components
│   │   │   ├── __tests__
│   │   │   │   ├── DashboardStats.test.tsx
│   │   │   │   ├── EmployeeAvatar.test.tsx
│   │   │   │   ├── ErrorBoundary.test.tsx
│   │   │   │   └── StatusBadge.test.tsx
│   │   │   ├── AddEmployeeModal.tsx
│   │   │   ├── AppSidebar.tsx
│   │   │   ├── CommandPalette.tsx
│   │   │   ├── DashboardSkeleton.tsx
│   │   │   ├── DashboardStats.tsx
│   │   │   ├── EditEmployeeModal.tsx
│   │   │   ├── EfficiencyAnalytics.tsx
│   │   │   ├── EmployeeAvatar.tsx
│   │   │   ├── EmployeeCalendarView.tsx
│   │   │   ├── EmployeeCard.tsx
│   │   │   ├── EmployeeList.tsx
│   │   │   ├── EmployeeProfileModal.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── ExceptionCard.tsx
│   │   │   ├── InviteCard.tsx
│   │   │   ├── LoadingSkeletons.tsx
│   │   │   ├── LogoutDialog.tsx
│   │   │   ├── NotificationsPopover.tsx
│   │   │   ├── OfflineBanner.tsx
│   │   │   ├── QRCodeModal.tsx
│   │   │   ├── RecentActivity.tsx
│   │   │   ├── ShiftCard.tsx
│   │   │   ├── ShiftDetailsModal.tsx
│   │   │   ├── ShiftsTable.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── ThemeToggle.tsx
│   │   │   ├── UserMenuPopover.tsx
│   │   │   ├── VirtualizedList.tsx
│   │   │   ├── VisuallyHidden.tsx
│   │   │   └── WebSocketStatus.tsx
│   │   ├── constants
│   │   │   └── api.constants.ts
│   │   ├── features
│   │   │   └── employees
│   │   │       ├── components
│   │   │       │   └── EmployeeList.tsx
│   │   │       └── hooks
│   │   │           └── useEmployees.ts
│   │   ├── hooks
│   │   │   ├── components
│   │   │   ├── features
│   │   │   │   ├── useDashboard.ts
│   │   │   │   ├── useDashboardData.ts
│   │   │   │   ├── useEfficiencyAnalytics.ts
│   │   │   │   ├── useEmployeeInvites.ts
│   │   │   │   ├── useEmployeeManagement.ts
│   │   │   │   └── useEmployees.ts
│   │   │   ├── use-mobile.tsx
│   │   │   ├── use-toast.ts
│   │   │   ├── useAuth.ts
│   │   │   ├── useExport.ts
│   │   │   ├── useKeyboardShortcuts.ts
│   │   │   ├── useOptimisticMutations.ts
│   │   │   ├── usePrefetch.ts
│   │   │   ├── useRetry.ts
│   │   │   ├── useSearch.ts
│   │   │   ├── useWebApp.ts
│   │   │   └── useWebSocket.ts
│   │   ├── lib
│   │   │   ├── constants
│   │   │   ├── utils
│   │   │   │   ├── clipboard.ts
│   │   │   │   ├── debounce.utils.ts
│   │   │   │   ├── efficiency.ts
│   │   │   │   ├── statusBadge.ts
│   │   │   │   └── transformShifts.ts
│   │   │   ├── accessibility.ts
│   │   │   ├── employeeAvatar.ts
│   │   │   ├── errorHandling.ts
│   │   │   ├── errorMessages.ts
│   │   │   ├── motionPresets.ts
│   │   │   ├── optimisticUpdates.ts
│   │   │   ├── queryClient.ts
│   │   │   ├── sanitize.ts
│   │   │   ├── sentry.ts
│   │   │   ├── supabase.ts
│   │   │   └── utils.ts
│   │   ├── pages
│   │   │   ├── CompanySettings.tsx
│   │   │   ├── Contacts.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Employees.tsx
│   │   │   ├── Exceptions.tsx
│   │   │   ├── FAQ.tsx
│   │   │   ├── Guides.tsx
│   │   │   ├── Help.tsx
│   │   │   ├── Legal.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── NotFound.tsx
│   │   │   ├── PrivacyPolicy.tsx
│   │   │   ├── Rating.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Reports.tsx
│   │   │   ├── Schedules.tsx
│   │   │   ├── Security.tsx
│   │   │   ├── Settings.tsx
│   │   │   ├── TermsOfService.tsx
│   │   │   └── webapp.tsx
│   │   ├── services
│   │   │   ├── api.service.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── dashboard.service.ts
│   │   │   ├── employee-management.service.ts
│   │   │   ├── employee.service.ts
│   │   │   ├── shift.service.ts
│   │   │   └── webapp.service.ts
│   │   ├── shared
│   │   │   └── hooks
│   │   │       └── useDashboard.ts
│   │   ├── types
│   │   │   └── index.ts
│   │   ├── ui
│   │   │   ├── accordion.tsx
│   │   │   ├── alert-dialog.tsx
│   │   │   ├── alert.tsx
│   │   │   ├── aspect-ratio.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── breadcrumb.tsx
│   │   │   ├── button.tsx
│   │   │   ├── calendar.tsx
│   │   │   ├── card.tsx
│   │   │   ├── carousel.tsx
│   │   │   ├── chart.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── collapsible.tsx
│   │   │   ├── command.tsx
│   │   │   ├── context-menu.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── drawer.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── form.tsx
│   │   │   ├── hover-card.tsx
│   │   │   ├── input-otp.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── menubar.tsx
│   │   │   ├── navigation-menu.tsx
│   │   │   ├── pagination.tsx
│   │   │   ├── popover.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── radio-group.tsx
│   │   │   ├── resizable.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   ├── select.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── slider.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── toaster.tsx
│   │   │   ├── toggle-group.tsx
│   │   │   ├── toggle.tsx
│   │   │   └── tooltip.tsx
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── main.tsx
│   │   ├── STRUCTURE.md
│   │   └── types.ts
│   └── index.html
├── docs
│   ├── ACCESSIBILITY_IMPROVEMENTS.md
│   ├── ACCESSIBILITY_TESTING.md
│   ├── CHECKLIST.md
│   ├── CI_CD.md
│   ├── CLEANUP_COMPLETE.md
│   ├── CLEANUP_REPORT_2025.md
│   ├── DATABASE_BACKUP_GUIDE.md
│   ├── DATABASE_OPTIMIZATION.md
│   ├── DEPRECATED_ARCHITECTURE.md
│   ├── DOCUMENTATION_CLEANUP_SUMMARY.md
│   ├── MONITORING.md
│   ├── OPTIMIZATION_RECOMMENDATIONS.md
│   ├── PROJECT-INSTRUCTIONS.md
│   ├── README.md
│   ├── REPO_TREE.md
│   ├── SECRETS_MANAGEMENT.md
│   ├── SECURITY_AUDIT.md
│   ├── SENTRY_ALERTS_SETUP.md
│   ├── TECH_STACK.md
│   ├── TECHNOLOGY_INTEGRATIONS_AUDIT.md
│   ├── TELEGRAM_BOT_ANALYSIS.md
│   └── TEST_COVERAGE.md
├── migrations
│   ├── meta
│   │   ├── _journal.json
│   │   ├── 0000_snapshot.json
│   │   └── 0001_snapshot.json
│   ├── 0000_silly_iron_monger.sql
│   ├── 0001_thin_spectrum.sql
│   ├── 0002_add_violation_id_to_exception.sql
│   ├── 0003_add_performance_indexes.sql
│   ├── 0004_add_employee_avatar_fields.sql
│   └── rollback.sh
├── scripts
│   ├── add-ip-instructions.txt
│   ├── analyze-indexes.ts
│   ├── analyze-slow-queries.ts
│   ├── backup-database.sh
│   ├── check-database-health.ts
│   ├── check-db-connection.ts
│   ├── check-deploy.cjs
│   ├── check-vercel-env.ts
│   ├── cleanup-demo-account.ts
│   ├── create-demo-admin.ts
│   ├── cron-backup.sh
│   ├── debug-query.ts
│   ├── deploy.sh
│   ├── fix-connection.ts
│   ├── force-link-employee.ts
│   ├── generate-invites.js
│   ├── generate-repo-tree.mjs
│   ├── generate-secrets.sh
│   ├── MONITORING_README.md
│   ├── optimize-images.ts
│   ├── restore-database.sh
│   ├── setup-backup-cron.sh
│   ├── test-backup-restore.sh
│   ├── test-db-connection.ts
│   ├── test-pooler.ts
│   ├── test-violations-and-ratings.cjs
│   ├── update-db-url.sh
│   ├── update-ui-imports.sh
│   ├── verify-backup.sh
│   ├── verify-deployment.ts
│   └── wait-for-db.sh
├── server
│   ├── __tests__
│   │   └── lib
│   │       └── cache.test.ts
│   ├── constants
│   │   └── telegram.ts
│   ├── handlers
│   │   └── telegramHandlers.ts
│   ├── lib
│   │   ├── __tests__
│   │   │   ├── audit.test.ts
│   │   │   ├── cache.test.ts
│   │   │   └── errorHandler.test.ts
│   │   ├── cache
│   │   │   ├── CacheAdapter.ts
│   │   │   ├── InMemoryCache.ts
│   │   │   └── RedisCache.ts
│   │   ├── di
│   │   │   ├── container.ts
│   │   │   └── services.ts
│   │   ├── schemas
│   │   │   ├── common.schemas.ts
│   │   │   ├── companies.schemas.ts
│   │   │   ├── employees.schemas.ts
│   │   │   ├── index.ts
│   │   │   ├── invites.schemas.ts
│   │   │   ├── schedules.schemas.ts
│   │   │   ├── shifts.schemas.ts
│   │   │   └── violations.schemas.ts
│   │   ├── utils
│   │   │   ├── cache.ts
│   │   │   ├── entities.ts
│   │   │   ├── index.ts
│   │   │   └── period.ts
│   │   ├── audit.ts
│   │   ├── cache.ts
│   │   ├── cors.ts
│   │   ├── env.ts
│   │   ├── errorHandler.ts
│   │   ├── errors.ts
│   │   ├── logger.ts
│   │   ├── metrics.ts
│   │   ├── sanitize.ts
│   │   ├── secrets.ts
│   │   ├── secretsManager.ts
│   │   ├── sentry.ts
│   │   ├── supabase.ts
│   │   ├── validation.ts
│   │   └── websocket.ts
│   ├── middleware
│   │   ├── __tests__
│   │   │   ├── auth.test.ts
│   │   │   ├── rate-limit.test.ts
│   │   │   ├── sanitize.test.ts
│   │   │   ├── security.middleware.test.ts
│   │   │   └── validate.test.ts
│   │   ├── auth.ts
│   │   ├── csrf.ts
│   │   ├── helmet-config.ts
│   │   ├── rate-limit.ts
│   │   ├── sanitize.ts
│   │   ├── security.middleware.ts
│   │   ├── timeout.ts
│   │   └── validate.ts
│   ├── repositories
│   │   ├── __tests__
│   │   │   ├── BaseRepository.test.ts
│   │   │   ├── CompanyRepository.test.ts
│   │   │   ├── EmployeeRepository.test.ts
│   │   │   └── ShiftRepository.test.ts
│   │   ├── AuditRepository.ts
│   │   ├── BaseRepository.ts
│   │   ├── CompanyRepository.ts
│   │   ├── EmployeeRepository.ts
│   │   ├── ExceptionRepository.ts
│   │   ├── index.ts
│   │   ├── InviteRepository.ts
│   │   ├── RatingRepository.ts
│   │   ├── ReminderRepository.ts
│   │   ├── ScheduleRepository.ts
│   │   ├── ShiftRepository.ts
│   │   └── ViolationRepository.ts
│   ├── routes
│   │   ├── __tests__
│   │   │   └── bot-api.test.ts
│   │   ├── auth-yandex.ts
│   │   ├── auth.ts
│   │   ├── bot-api.ts
│   │   ├── companies-extended.ts
│   │   ├── companies.ts
│   │   ├── cron.ts
│   │   ├── employees-extended.ts
│   │   ├── employees.ts
│   │   ├── health.ts
│   │   ├── invites.ts
│   │   ├── rating.ts
│   │   ├── schedules-extended.ts
│   │   ├── schedules.ts
│   │   ├── shifts.ts
│   │   ├── telegram-webhook.ts
│   │   ├── violation-rules.ts
│   │   ├── violations.ts
│   │   └── webapp.ts
│   ├── services
│   │   ├── __tests__
│   │   │   ├── CompanyService.test.ts
│   │   │   ├── EmployeeService.test.ts
│   │   │   ├── RatingService.test.ts
│   │   │   ├── scheduler.test.ts
│   │   │   ├── shiftMonitor.test.ts
│   │   │   └── ShiftService.test.ts
│   │   ├── CompanyService.ts
│   │   ├── EmployeeService.ts
│   │   ├── index.ts
│   │   ├── RatingService.ts
│   │   ├── scheduler.ts
│   │   ├── shiftMonitor.ts
│   │   ├── ShiftService.ts
│   │   ├── telegramAuth.ts
│   │   └── telegramBot.ts
│   ├── telegram
│   │   ├── handlers
│   │   │   ├── reminders.ts
│   │   │   ├── report.ts
│   │   │   ├── shiftActions.ts
│   │   │   └── start.ts
│   │   ├── bot.ts
│   │   ├── types.ts
│   │   └── webhook.ts
│   ├── index.ts
│   ├── launchBot.ts
│   ├── routes.ts
│   ├── run.ts
│   ├── swagger.ts
│   └── vite.ts
├── shared
│   ├── types
│   │   └── api.ts
│   ├── api-types.ts
│   └── schema.ts
├── tests
│   ├── e2e
│   │   ├── auth.spec.ts
│   │   ├── company-management.spec.ts
│   │   ├── employee-onboarding.spec.ts
│   │   ├── helpers.ts
│   │   ├── rating-system.spec.ts
│   │   ├── rating.spec.ts
│   │   ├── schedule-management.spec.ts
│   │   ├── shift-lifecycle.spec.ts
│   │   ├── shifts.spec.ts
│   │   └── violation-management.spec.ts
│   ├── integration
│   │   ├── api
│   │   │   ├── companies.integration.test.ts
│   │   │   ├── employees.integration.test.ts
│   │   │   ├── health.integration.test.ts
│   │   │   ├── invites.integration.test.ts
│   │   │   ├── rating.integration.test.ts
│   │   │   ├── schedules.integration.test.ts
│   │   │   ├── shifts.integration.test.ts
│   │   │   ├── violation-rules.integration.test.ts
│   │   │   └── violations.integration.test.ts
│   │   └── helpers
│   │       ├── fixtures.ts
│   │       ├── testDatabase.ts
│   │       └── testServer.ts
│   └── setup.ts
├── .cursorignore
├── .dockerignore
├── .editorconfig
├── .env
├── .env.example
├── .env.local
├── .gitignore
├── .npmrc
├── .nycrc.json
├── .prettierignore
├── .prettierrc
├── .vitestrc.json
├── api-examples.http
├── CHANGELOG.md
├── CODE_OF_CONDUCT.md
├── components.json
├── concurrent-dev.cjs
├── CONTRIBUTING.md
├── docker-compose.prod.yml
├── docker-compose.yml
├── Dockerfile
├── drizzle.config.ts
├── eslint.config.js
├── nginx.conf
├── openapi.yaml
├── package-lock.json
├── package.json
├── playwright.config.ts
├── postcss.config.js
├── README.md
├── START_DEV_SERVER.sh
├── tailwind.config.ts
├── test_telegram_bot.cjs
├── tsconfig.json
├── tsconfig.server.json
├── tsconfig.test.json
├── vercel.json
├── vite.config.ts
├── vitest-setup.d.ts
└── vitest.config.ts