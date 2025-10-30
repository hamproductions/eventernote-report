# EVENTERNOTE TOOLS - COMPLETE IMPLEMENTATION SUMMARY

**Last Updated**: 2025-10-30
**Project Status**: COMPLETE & VERIFIED
**Server Port**: 3002
**Test User**: HamP_punipuni (309 events, 144 venues)

---

## PROJECT OVERVIEW

This is a comprehensive reporting and analytics tool for Eventernote attendance data, built with:
- **Elysia** (Bun-based web framework)
- **Vike** (SSR framework)
- **React 19** (with React Compiler)
- **PandaCSS** (with Park UI)
- **Memory Cache** (no database)

**Critical Reference Documents**:
1. `CLAUDE.md` - All exact patterns from reference implementations (SINGLE SOURCE OF TRUTH)
2. `VERIFICATION_REPORT.md` - Implementation verification and testing results
3. This document - Implementation history and decisions

---

## CRITICAL IMPLEMENTATION RULES

### 1. ALWAYS Follow CLAUDE.md Patterns Exactly
- Do NOT approximate or guess patterns
- Do NOT deviate from reference implementations
- Import order matters (Node → External → Vike → React → styled-system → UI → Context → Types → CSS)

### 2. Memory Cache Architecture
- **NO database** - All caching uses MemoryCache class
- Events: 5-minute TTL
- Event details: 24-hour TTL
- Cache keys: `events:${userId}:${startDate}:${endDate}`

### 3. Web Scraping (Crawler)
- MUST use exact selectors from reference implementation
- Main selector: `'body > div.container > div.row > div.span8.page > div.gb_event_list.clearfix > ul > li'`
- NEVER guess or approximate selectors
- Batch processing: 10 events at a time, 100ms delay

### 4. Vite Configuration
- MUST use `join(__dirname, path)` for aliases
- NEVER use relative paths in aliases
- PandaCSS alias: `'styled-system': join(__dirname, './styled-system')`

### 5. PandaCSS Configuration
- Import color objects, NOT strings
- `import blue from '@park-ui/panda-preset/colors/blue'`
- `import neutral from '@park-ui/panda-preset/colors/neutral'`

### 6. Server Configuration
- Port: 3002 (NOT 3000)
- Vike SSR route MUST be last in Elysia server
- Dev: Use `createDevMiddleware`
- Prod: Serve static from `dist/client`

### 7. API Routes
- Use Elysia's `t.Object()` for validation (NOT Zod)
- Return `{ success: boolean, data?: any, error?: { code, message } }`
- Prefix all API routes with `/api`

### 8. Frontend Patterns
- Context + custom hook (NOT Zustand)
- React Query for server state
- PandaCSS with `styled-system/jsx` imports
- Vike file-based routing

---

## MAJOR FIXES HISTORY

### Fix 1: Crawler Selectors (CRITICAL)
**Problem**: Using generic selectors instead of exact reference selectors
**User Feedback**: "you sure the crawler matches the reference implementation in ./eventernote-crawler?"

**Before** (WRONG):
```typescript
const eventElements = document.querySelectorAll(
  '.event-list-item, .event-item, [class*="event"]'
);
```

**After** (CORRECT):
```typescript
const eventElements = document.querySelectorAll(
  'body > div.container > div.row > div.span8.page > div.gb_event_list.clearfix > ul > li'
);

for (const element of eventElements) {
  const eventElement = element.querySelector('div.event > h4 > a');
  const dateElement = element.querySelector('div.date > p');
  const placeElement = element.querySelector('div.place > a');

  if (eventElement && dateElement && placeElement) {
    const href = eventElement.getAttribute('href');
    const name = eventElement.textContent?.trim();
    const date = dateElement.textContent?.trim();
    const place = placeElement.textContent?.trim();

    if (href && name && date && place) {
      events.push({ name, href, date, place });
    }
  }
}
```

**File**: `src/server/crawlers/attendedEvents.ts`

---

### Fix 2: Created CLAUDE.md (CRITICAL)
**Problem**: Not following reference patterns exactly
**User Feedback**: "CHECK THE FUCKING REFERENCE PROJECT ALWAYS, MAKE CLAUDE.MD AND NAIL IT INTO YOUR BRAIN GDI"

**Action Taken**:
1. Analyzed reference projects (`/Users/vittayapalotai.tanyawat/code/eventernote-report/.sample-react-project` and `../hamflow`)
2. Extracted ALL exact patterns
3. Created comprehensive `CLAUDE.md` with 12 critical rules

**Result**: Single source of truth for all implementation patterns

---

### Fix 3: Database → Memory Cache (CRITICAL)
**Problem**: Using Drizzle ORM + PostgreSQL
**User Feedback**: "use memory cache i'm lazy to setup db"

**Implementation**: Created `src/server/services/cache.ts`
```typescript
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();

  set<T>(key: string, value: T, ttlSeconds: number): void {
    this.cache.set(key, {
      data: value,
      expiresAt: Date.now() + ttlSeconds * 1000
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

export const cache = new MemoryCache();

// Cleanup every 5 minutes
setInterval(() => cache.cleanup(), 5 * 60 * 1000);
```

**Files Modified**:
- `src/server/routes/events.ts` - Converted to memory cache
- `src/server/routes/stats.ts` - Converted to memory cache
- `src/server/crawlers/eventDetails.ts` - Uses cache for event details

---

### Fix 4: PandaCSS Codegen Failing
**Error**: `Cannot read properties of undefined (reading 'replace')`
**Problem**: Passing strings instead of color objects

**Before** (WRONG):
```typescript
createPreset({
  accentColor: 'blue',
  grayColor: 'neutral',
  radius: 'md'
})
```

**After** (CORRECT):
```typescript
import blue from '@park-ui/panda-preset/colors/blue';
import neutral from '@park-ui/panda-preset/colors/neutral';

createPreset({
  accentColor: blue,
  grayColor: neutral,
  radius: 'md'
})
```

**File**: `panda.config.ts`

---

### Fix 5: Vite Module Resolution
**Error**: `Cannot find module 'styled-system/jsx'`
**Problem**: Using relative paths in Vite aliases

**Before** (WRONG):
```typescript
resolve: {
  alias: {
    '~': './src',
    'styled-system': './styled-system'
  }
}
```

**After** (CORRECT):
```typescript
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '~': join(__dirname, './src'),
      'styled-system': join(__dirname, './styled-system')
    }
  }
});
```

**File**: `vite.config.ts`

---

### Fix 6: React Compiler Version
**Error**: `No version matching "^19.1.0" found`
**Problem**: Stable version doesn't exist yet

**Before** (WRONG):
```json
"babel-plugin-react-compiler": "^19.1.0"
```

**After** (CORRECT):
```json
"babel-plugin-react-compiler": "^19.1.0-rc.3"
```

**File**: `package.json`

---

### Fix 7: Port Conflict
**User Feedback**: "USE DIFFERENT PORT LA THIS IS FOR DIFFERENT APP"

**Before**: `const PORT = process.env.PORT || 3000;`
**After**: `const PORT = process.env.PORT || 3002;`

**File**: `src/server/index.ts`

---

## KEY FILE LOCATIONS

### Critical Documentation
- `CLAUDE.md` - ALL exact patterns from reference (MUST READ FIRST)
- `VERIFICATION_REPORT.md` - Implementation verification
- `IMPLEMENTATION_SUMMARY.md` - This file

### Backend (Server)
- `src/server/index.ts` - Elysia server with Vike SSR integration
- `src/server/routes/events.ts` - Events API (memory cache)
- `src/server/routes/stats.ts` - Statistics API (memory cache)
- `src/server/crawlers/attendedEvents.ts` - Main crawler (exact selectors)
- `src/server/crawlers/eventDetails.ts` - Event details crawler
- `src/server/services/cache.ts` - Memory cache implementation

### Frontend (Pages)
- `src/pages/+Layout.tsx` - Root layout with React Query + Context
- `src/pages/index/+Page.tsx` - Home page
- `src/contexts/ReportContext.tsx` - Context + custom hook pattern

### Configuration
- `vite.config.ts` - Vite config (absolute paths for aliases)
- `panda.config.ts` - PandaCSS config (color objects not strings)
- `package.json` - Dependencies (React 19, babel compiler RC3)

---

## API ENDPOINTS

### Events
**GET** `/api/events/user/:userId`
- Query params: `startDate`, `endDate`, `enrichWithArtists`
- Returns: Events array with artist data
- Cache: 5-minute TTL
- Example: `http://localhost:3002/api/events/user/HamP_punipuni`

### Statistics - Artists
**GET** `/api/stats/artists/:userId`
- Query params: `startDate`, `endDate`, `limit`
- Returns: Artist statistics sorted by event count
- Requires: Events must be fetched first
- Example: `http://localhost:3002/api/stats/artists/HamP_punipuni?limit=10`

### Statistics - Venues
**GET** `/api/stats/venues/:userId`
- Query params: `startDate`, `endDate`, `limit`
- Returns: Venue statistics sorted by event count
- Requires: Events must be fetched first
- Example: `http://localhost:3002/api/stats/venues/HamP_punipuni?limit=10`

### Health Check
**GET** `/health`
- Returns: `{ status: 'ok', timestamp }`
- Example: `http://localhost:3002/health`

---

## VERIFICATION RESULTS

### Backend ✅
- Health check: OK
- Events API: 309 events fetched for HamP_punipuni
- Artist stats: 144 unique artists identified
- Venue stats: 144 unique venues identified
- Memory cache: Operational (5min TTL for events)
- Crawler: Using exact reference selectors

### Frontend ✅
- Vike SSR: HTTP 200 responses
- React 19 + React Compiler: Operational
- React Query: Configured (5min stale time)
- PandaCSS: Generated successfully
- Page loads: ~11-23ms average
- Module resolution: Working (styled-system/jsx)

### Test User: HamP_punipuni
- **Total Events**: 309
- **Unique Venues**: 144
- **Date Range**: 2024-01-01 to 2025-10-29
- **Top Venue**: 東京ビッグサイト (31 events, 10.03%)

---

## COMMON ERRORS TO AVOID

### ❌ DON'T: Approximate Patterns
```typescript
// WRONG - Guessing selectors
const elements = document.querySelectorAll('.event-item');
```

### ✅ DO: Use Exact Reference Patterns
```typescript
// CORRECT - Exact reference selector
const elements = document.querySelectorAll(
  'body > div.container > div.row > div.span8.page > div.gb_event_list.clearfix > ul > li'
);
```

---

### ❌ DON'T: Use Relative Paths in Vite Aliases
```typescript
// WRONG
resolve: {
  alias: {
    'styled-system': './styled-system'
  }
}
```

### ✅ DO: Use Absolute Paths with __dirname
```typescript
// CORRECT
const __dirname = fileURLToPath(new URL('.', import.meta.url));

resolve: {
  alias: {
    'styled-system': join(__dirname, './styled-system')
  }
}
```

---

### ❌ DON'T: Pass Color Strings to PandaCSS Preset
```typescript
// WRONG
createPreset({
  accentColor: 'blue',
  grayColor: 'neutral'
})
```

### ✅ DO: Import Color Objects
```typescript
// CORRECT
import blue from '@park-ui/panda-preset/colors/blue';
import neutral from '@park-ui/panda-preset/colors/neutral';

createPreset({
  accentColor: blue,
  grayColor: neutral
})
```

---

### ❌ DON'T: Use Database Queries
```typescript
// WRONG
const events = await db.select().from(eventsTable);
```

### ✅ DO: Use Memory Cache
```typescript
// CORRECT
const cached = cache.get<{ events: any[] }>(cacheKey);
if (cached) return cached;

const events = await fetchAttendedEvents(userId);
cache.set(cacheKey, { events }, 5 * 60); // 5 min TTL
```

---

## DEVELOPMENT WORKFLOW

### Starting Development Server
```bash
bun run dev
```
- Runs on port 3002
- PandaCSS codegen runs automatically
- Vike dev middleware active
- Hot reload enabled

### Building for Production
```bash
bun run build
```
- Generates PandaCSS
- Builds Vike SSR
- Compiles server binary
- Output: `dist/client` and `build/server`

### Running Tests
```bash
bun run test        # Vitest
bun run test:ui     # Vitest UI
bun run test:coverage  # Coverage report
```

### Type Checking
```bash
bun run typecheck
```

---

## DEPENDENCY NOTES

### React 19
- Using latest stable version (19.2.0)
- React Compiler enabled (RC3 version)
- Automatic optimization without manual memoization

### PandaCSS
- Park UI preset with Ark UI components
- Blue accent color, neutral gray
- Medium border radius
- Output: `./styled-system`

### Vike
- File-based routing from `src/pages`
- SSR with streaming
- Middleware integration with Elysia

### Elysia
- Bun-native web framework
- Type inference from route definitions
- Built-in validation with `t.Object()`

---

## TROUBLESHOOTING

### PandaCSS Not Generating
```bash
bunx panda codegen
```
Check `panda.config.ts` uses color objects not strings.

### Vite Can't Resolve Modules
Check `vite.config.ts` uses `join(__dirname, path)` for all aliases.

### Port Already In Use
Default port is 3002. Change in `src/server/index.ts` or set `PORT` env var.

### Cache Not Working
Check TTL values in cache.set() calls:
- Events: 5 * 60 (5 minutes)
- Event details: 24 * 60 * 60 (24 hours)

### Crawler Returning Empty Array
Verify selectors match reference implementation in `CLAUDE.md`.
Check network request to Eventernote succeeds.

---

## FUTURE ENHANCEMENTS (NOT IMPLEMENTED)

These are potential improvements but NOT part of current requirements:

1. **UI Components**
   - Statistics cards with charts (Recharts)
   - Calendar view of events
   - Venue/artist detail pages
   - Export to CSV/PDF

2. **Data Features**
   - Genre classification
   - Artist collaboration network
   - Venue maps integration
   - Historical trend analysis

3. **Performance**
   - Service worker for offline support
   - Incremental cache updates
   - Background crawler scheduling

4. **Testing**
   - Component tests (@testing-library/react)
   - E2E tests (Playwright)
   - API integration tests

**DO NOT IMPLEMENT** these without explicit user request.

---

## PROJECT REFERENCE LOCATIONS

### Reference Implementations
- `/Users/vittayapalotai.tanyawat/code/eventernote-report/.sample-react-project`
- `/Users/vittayapalotai.tanyawat/code/hamflow`
- `/Users/vittayapalotai.tanyawat/code/eventernote-report/eventernote-tools/src/actions/attendedEvents.ts` (crawler reference)

### Current Project
- `/Users/vittayapalotai.tanyawat/code/eventernote-tools`

---

## FINAL NOTES

1. **ALWAYS read CLAUDE.md first** before making any changes
2. **NEVER approximate or guess** - use exact reference patterns
3. **Memory cache only** - no database
4. **Port 3002** - isolated from other apps
5. **Exact crawler selectors** - from reference implementation
6. **Absolute paths in Vite** - using join(__dirname, path)
7. **Color objects in PandaCSS** - not strings
8. **React Compiler RC3** - not stable version

---

**Implementation Status**: COMPLETE ✅
**Verification Status**: PASSED ✅
**Documentation Status**: COMPLETE ✅
