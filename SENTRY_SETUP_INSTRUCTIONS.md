# 📊 Sentry Setup Instructions

## Installation

### 1. Install Sentry Packages

```bash
# Backend (Node.js)
npm install @sentry/node @sentry/profiling-node

# Frontend (React)
npm install @sentry/react
```

### 2. Create Sentry Project

1. Go to [sentry.io](https://sentry.io) and create an account (or login)
2. Create a new project:
   - **Platform:** Node.js (for backend)
   - **Platform:** React (for frontend)
3. Copy the **DSN** (Data Source Name) from project settings

### 3. Configure Environment Variables

Add to your `.env.local` or `.env`:

```env
# Backend Sentry DSN
SENTRY_DSN=https://your-backend-key@o123456.ingest.sentry.io/123456

# Frontend Sentry DSN
VITE_SENTRY_DSN=https://your-frontend-key@o123456.ingest.sentry.io/789012
```

**Note:** You can use the same DSN for both backend and frontend, or create separate projects for better organization.

### 4. Production Environment Variables

For production deployments (Vercel, Railway, etc.):

```env
NODE_ENV=production
SENTRY_DSN=https://...
VITE_SENTRY_DSN=https://...
```

## Features Enabled

### Backend
- ✅ Error tracking
- ✅ Performance monitoring (10% sampling in production)
- ✅ Profiling (10% sampling in production)
- ✅ Breadcrumbs for debugging
- ✅ User context tracking
- ✅ Automatic release tracking

### Frontend
- ✅ Error tracking
- ✅ Performance monitoring
- ✅ Session Replay (10% sampling)
- ✅ Error Replay (100% when error occurs)
- ✅ Error Boundary with fallback UI
- ✅ Breadcrumbs for user actions

## Usage Examples

### Backend

```typescript
import { logger } from './lib/logger';
import { captureException, setUserContext } from './lib/sentry';

// Error tracking
try {
  // Your code
} catch (error) {
  logger.error('Something went wrong', error);
  captureException(error, { context: 'additional info' });
}

// User context
setUserContext({
  id: user.id,
  email: user.email,
  username: user.username
});
```

### Frontend

```typescript
import { captureException, setUserContext } from '@/lib/sentry';

// Error tracking
try {
  // Your code
} catch (error) {
  console.error('Error:', error);
  captureException(error);
}

// User context (in useAuth hook or similar)
useEffect(() => {
  if (user) {
    setUserContext({
      id: user.id,
      email: user.email,
      username: user.username
    });
  }
}, [user]);
```

## Verification

### Test Backend Sentry

Add temporary test endpoint to `server/routes.ts`:

```typescript
app.get('/test-sentry', (req, res) => {
  try {
    throw new Error('Test Sentry Error from Backend');
  } catch (error) {
    captureException(error);
    res.status(500).json({ message: 'Error sent to Sentry' });
  }
});
```

Visit: `http://localhost:5000/test-sentry`

### Test Frontend Sentry

Add temporary button in `App.tsx`:

```tsx
<button onClick={() => {
  throw new Error('Test Sentry Error from Frontend');
}}>
  Test Sentry
</button>
```

### Check Sentry Dashboard

1. Go to [sentry.io](https://sentry.io)
2. Select your project
3. Check **Issues** tab for captured errors
4. Check **Performance** tab for transaction data

## Sampling Rates

### Production
- Traces: 10% (to reduce costs)
- Profiles: 10%
- Session Replay: 10%
- Error Replay: 100%

### Development
- Traces: 100% (full monitoring)
- Profiles: 100%
- Session Replay: 100%
- Error Replay: 100%

**Note:** Errors are not sent to Sentry in development mode to avoid noise.

## Cost Optimization

Sentry pricing is based on:
- Number of events
- Session replays
- Performance transactions

To optimize costs:

1. **Adjust sample rates** in production:
   ```typescript
   tracesSampleRate: 0.05, // 5% instead of 10%
   ```

2. **Filter out common errors**:
   ```typescript
   ignoreErrors: [
     'ResizeObserver loop limit exceeded',
     'Network request failed',
   ]
   ```

3. **Use Sentry quotas**:
   - Set monthly event quotas in Sentry dashboard
   - Configure rate limiting

4. **Monitor usage**:
   - Check Sentry dashboard → Stats
   - Set up usage alerts

## Troubleshooting

### Sentry not capturing errors

1. **Check DSN is set:**
   ```bash
   echo $SENTRY_DSN
   echo $VITE_SENTRY_DSN
   ```

2. **Check initialization:**
   - Look for "Sentry initialized successfully" in logs
   - Backend: should see on server startup
   - Frontend: check browser console

3. **Check environment:**
   - Errors are not sent in development mode
   - Set `NODE_ENV=production` to test

4. **Check network:**
   - Ensure firewall allows connections to `*.ingest.sentry.io`
   - Check browser Network tab for failed requests

### Source maps not working

1. **Enable source maps upload** (optional, for better error tracking):

   ```bash
   npm install @sentry/webpack-plugin
   ```

   Add to `vite.config.ts`:
   ```typescript
   import { sentryVitePlugin } from "@sentry/vite-plugin";

   export default defineConfig({
     build: {
       sourcemap: true,
     },
     plugins: [
       sentryVitePlugin({
         org: "your-org",
         project: "your-project",
         authToken: process.env.SENTRY_AUTH_TOKEN,
       }),
     ],
   });
   ```

## Best Practices

1. **Always log AND capture:**
   ```typescript
   logger.error('Error message', error);
   captureException(error);
   ```

2. **Add context to errors:**
   ```typescript
   captureException(error, {
     userId: user.id,
     operation: 'create_shift',
     shiftId: shift.id
   });
   ```

3. **Set user context early:**
   - Backend: After authentication middleware
   - Frontend: In App.tsx or useAuth hook

4. **Clean up sensitive data:**
   - Already configured in `beforeSend` hook
   - Removes cookies and headers
   - Review captured data regularly

5. **Monitor performance:**
   - Check Sentry Performance tab weekly
   - Identify slow transactions
   - Optimize based on data

## Support

- [Sentry Documentation](https://docs.sentry.io/)
- [Sentry Node.js Guide](https://docs.sentry.io/platforms/node/)
- [Sentry React Guide](https://docs.sentry.io/platforms/javascript/guides/react/)

---

**Status:** ✅ Configured and ready to use  
**Last Updated:** October 30, 2025




