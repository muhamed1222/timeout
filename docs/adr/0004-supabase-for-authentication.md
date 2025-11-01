# 4. Supabase for Authentication and Database Hosting

Date: 2025-10-30

## Status

Accepted

## Context

Our application needs:
- **Authentication**: Secure user authentication with JWT tokens
- **Database Hosting**: Managed PostgreSQL hosting
- **Row-Level Security**: Fine-grained access control
- **Real-time Updates**: Live data synchronization (future feature)
- **Storage**: File uploads for documents and images (future feature)

We need a solution that:
- Reduces development time for auth infrastructure
- Provides production-ready security
- Scales automatically
- Integrates well with PostgreSQL
- Has reasonable pricing

### Options Considered

1. **Custom Auth + Self-hosted PostgreSQL**
   - Full control
   - High development cost
   - Infrastructure management overhead
   
2. **Auth0 + AWS RDS**
   - Mature auth solution
   - Expensive at scale
   - Complex setup
   
3. **Firebase**
   - Easy to use
   - NoSQL (doesn't fit our needs)
   - Vendor lock-in
   
4. **Supabase**
   - PostgreSQL-based
   - Built-in auth
   - Real-time capabilities
   - Open source core

## Decision

We will use **Supabase** for:
- Authentication (JWT tokens, social login ready)
- PostgreSQL database hosting
- Row-Level Security (RLS) policies
- Future real-time features

### Why Supabase?

- **PostgreSQL Native**: Built on PostgreSQL, not abstracted away
- **Open Source**: Can self-host if needed
- **Auth Built-in**: JWT authentication out of the box
- **Row-Level Security**: PostgreSQL RLS for fine-grained access
- **Developer Experience**: Excellent dashboard and tooling
- **Pricing**: Generous free tier, reasonable paid tiers
- **Scalability**: Auto-scaling infrastructure
- **Real-time**: Built-in real-time subscriptions (for future use)

## Consequences

### Positive

- **Faster Development**: Don't need to build auth from scratch
- **Security**: Battle-tested auth implementation
- **Managed Infrastructure**: No server management
- **Scalability**: Automatic scaling with usage
- **Type Safety**: Auto-generated TypeScript types
- **Dashboard**: Visual database management
- **Backups**: Automatic backups included
- **Real-time Ready**: Can add live updates when needed

### Negative

- **Vendor Dependency**: Tied to Supabase ecosystem
- **Cost at Scale**: Can get expensive with high usage
- **Limited Customization**: Some auth flows are opinionated
- **Migration Effort**: Moving away would require work

### Mitigation

- Use standard PostgreSQL features (can migrate if needed)
- Keep business logic in our codebase, not in Supabase Functions
- Abstract Supabase client behind our own interfaces where possible
- Monitor costs and optimize queries
- Use Drizzle ORM (works with any PostgreSQL)

## Implementation Details

### Database Connection

```typescript
// Using standard PostgreSQL connection string
const DATABASE_URL = process.env.DATABASE_URL; // From Supabase

// Works with any PostgreSQL, not Supabase-specific
const client = postgres(DATABASE_URL);
const db = drizzle(client);
```

### Authentication

```typescript
// Client-side Supabase auth
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

// Get user
const { data: { user } } = await supabase.auth.getUser();
```

### Row-Level Security

```sql
-- Example RLS policy
CREATE POLICY "Users can only see their company's employees"
ON employee
FOR SELECT
USING (
  company_id IN (
    SELECT company_id
    FROM employee
    WHERE id = auth.uid()
  )
);
```

## Migration Path

If we ever need to move away from Supabase:

1. **Database**: Already using standard PostgreSQL + Drizzle ORM
   - Can connect to any PostgreSQL server
   - No Supabase-specific SQL features
   
2. **Authentication**: 
   - Implement JWT verification independently
   - User table already in our database
   - Can switch to Auth0, Clerk, or custom solution
   
3. **Infrastructure**:
   - Database: Migrate to AWS RDS, DigitalOcean, etc.
   - Auth: Standalone auth service

## Pricing Estimate

**Free Tier** (sufficient for MVP):
- 500MB database
- 1GB file storage
- 50,000 monthly active users
- Unlimited API requests

**Pro Tier** ($25/month per project):
- 8GB database
- 100GB file storage
- 100,000 monthly active users
- Daily backups
- Email support

**Scale as needed**: Additional resources at reasonable rates

## References

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [PostgreSQL Row-Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase Pricing](https://supabase.com/pricing)





