# Deprecated Architecture Patterns

This document tracks unused or incomplete architecture patterns that have been removed.

## Removed Directories

### `/server/api/`
- **Status**: Removed
- **Reason**: Alternative API layer not used by main entry points
- **Replacement**: Use `/server/routes/` which is the active routing layer

### `/server/presentation/`
- **Status**: Removed  
- **Reason**: Controllers only used by unused `/server/api/`
- **Replacement**: Controllers/route handlers are in `/server/routes/`

### `/server/infrastructure/repositories/`
- **Status**: Removed
- **Reason**: Duplicate repository implementations. Active repositories are in `/server/repositories/`
- **Replacement**: Use `/server/repositories/` which follows the Repository Pattern

### `/server/application/`
- **Status**: Partially removed (kept only essential parts)
- **Reason**: Incomplete CQRS/DDD implementation not integrated into main application
- **Kept**: 
  - `/server/application/queues/handlers/ShiftMonitoringHandler.ts` - Used by shift monitoring
- **Removed**: Everything else in `/server/application/` (commands, queries, handlers, services, events, saga, etc.)
- **Replacement**: 
  - Business logic is in `/server/services/`
  - Routing is in `/server/routes/`
  - Repositories are in `/server/repositories/`

## Active Architecture

The project uses a simpler, more maintainable architecture:

```
server/
├── routes/          # Express route handlers (replaces api/ + presentation/)
├── services/        # Business logic services
├── repositories/    # Data access layer (Repository Pattern)
├── middleware/      # Express middleware
├── lib/             # Shared utilities
└── telegram/        # Telegram bot integration
```

## Migration Notes

If you find references to removed code:
1. Replace `presentation/controllers` → `routes/` handlers
2. Replace `infrastructure/repositories` → `repositories/`
3. Replace `application/services` → `services/`



