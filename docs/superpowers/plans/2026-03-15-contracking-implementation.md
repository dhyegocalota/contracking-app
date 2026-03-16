# Contracking Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a contraction tracking app with one-tap tracking, optional metadata, and a public shareable link for the doctor.

**Architecture:** Bun workspaces monorepo with Cloudflare Worker API (D1 database), React 19 dashboard (Bun.serve + Tailwind CDN), and shared types library. Auth via magic link (Resend + React Email). Public view polls API every 10s.

**Tech Stack:** Bun, Cloudflare Workers, D1 (SQLite), React 19, Tailwind CSS (CDN), Resend, React Email, Lucide, Biome

---

## File Structure

```
apps/
  api/
    package.json
    tsconfig.json
    wrangler.toml
    migrations/
      0001_init.sql
    src/
      index.ts              # Worker entry: fetch handler, route matching
      routes/
        auth.ts             # POST /auth/magic-link, GET /auth/verify, POST /auth/logout
        sessions.ts         # CRUD /sessions
        contractions.ts     # CRUD /contractions
        events.ts           # CRUD /events
        public.ts           # GET /public/:publicId, GET /public/:publicId/poll
      middleware/
        cors.ts             # withCors wrapper
        auth.ts             # getAuthenticatedUser, requireAuth
        rate-limit.ts       # isRateLimited
      db/
        queries.ts          # SQL query constants
        mappers.ts          # Row-to-domain mapping functions
      email/
        magic-link.tsx      # React Email template
      types.ts              # Environment type, row types
    src/index.test.ts       # API integration tests
  dashboard/
    package.json
    tsconfig.json
    build.ts                # Bun bundler (index.html → dist/)
    server.ts               # Bun.serve() with HMR, port 3000
    index.html              # Entry HTML with Tailwind CDN + Lucide
    src/
      app.tsx               # Root component, router
      api.ts                # Fetch client with typed responses
      hooks/
        use-auth.ts         # Auth state, login/logout
        use-session.ts      # Active tracking session
        use-contractions.ts # Contractions CRUD
        use-events.ts       # Events CRUD
        use-timer.ts        # Timer logic (requestAnimationFrame)
        use-polling.ts      # Generic polling with Page Visibility API
      components/
        tracking-page.tsx       # Main tracking view (button + chips + timeline)
        main-button.tsx         # Big circular start/stop button
        intensity-chips.tsx     # 3 bar-based intensity chips
        position-chips.tsx      # 6 position icon chips
        event-chips.tsx         # 4 event mini-chips
        timeline.tsx            # Contraction history list
        timeline-item.tsx       # Single contraction row
        status-bar.tsx          # Stats bar (total, avg duration, avg interval)
        bottom-sheet.tsx        # Reusable bottom sheet component
        edit-contraction.tsx    # Edit contraction bottom sheet
        event-form.tsx          # Event input bottom sheet (dilation, note, etc.)
        instructions-modal.tsx  # How-to modal
        login-page.tsx          # Email input for magic link
        public-page.tsx         # Doctor's public view
        public-chart.tsx        # SVG chart with tabs
        header.tsx              # App header with ? and share buttons
        share-modal.tsx         # Copy public link modal
      theme.ts                  # CSS custom properties, dark/light tokens
    src/app.test.tsx            # Dashboard component tests
libs/
  shared/
    package.json
    tsconfig.json
    src/
      index.ts              # Barrel export
      enums.ts              # Intensity, Position, EventType
      types.ts              # Domain types, DTOs, row types
      constants.ts          # Magic numbers, config values
      stats.ts              # Pure functions: regularity, 5-1-1 alert, averages
    src/stats.test.ts       # Stats pure function tests
```

---

## Chunk 1: Foundation (shared lib + API scaffold + database)

### Task 1: Shared Library — Enums, Types, Constants

**Files:**
- Create: `libs/shared/package.json`
- Create: `libs/shared/tsconfig.json`
- Create: `libs/shared/src/index.ts`
- Create: `libs/shared/src/enums.ts`
- Create: `libs/shared/src/types.ts`
- Create: `libs/shared/src/constants.ts`

- [ ] **Step 1: Create shared package.json**

```json
{
  "name": "@contracking/shared",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts"
}
```

- [ ] **Step 2: Create shared tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create enums.ts**

```typescript
export enum Intensity {
  MILD = 'mild',
  MODERATE = 'moderate',
  STRONG = 'strong',
}

export enum Position {
  LYING = 'lying',
  SITTING = 'sitting',
  STANDING = 'standing',
  WALKING = 'walking',
  SQUATTING = 'squatting',
  BALL = 'ball',
}

export enum EventType {
  WATER_BREAK = 'water_break',
  MEAL = 'meal',
  DILATION = 'dilation',
  NOTE = 'note',
}
```

- [ ] **Step 4: Create types.ts**

Domain types, DTOs, and database row types. Include `User`, `TrackingSession`, `Contraction`, `Event`, `SessionResponse`, `SessionStats`, `PollResponse`, and row types (`UserRow`, `TrackingSessionRow`, `ContractionRow`, `EventRow`).

- [ ] **Step 5: Create constants.ts**

All magic numbers: `SESSION_MAX_AGE_SECONDS` (30 days), `MAGIC_LINK_EXPIRATION_MINUTES` (15), `MAGIC_LINK_MAX_SENDS_PER_WINDOW` (3), `MAGIC_LINK_WINDOW_MINUTES` (15), `RATE_LIMIT_REQUESTS_PER_MINUTE` (60), `POLLING_INTERVAL_MILLISECONDS` (10000), `REGULARITY_MIN_CONTRACTIONS` (6), `REGULARITY_MAX_STANDARD_DEVIATION_SECONDS` (120), `FIVE_ONE_ONE_INTERVAL_THRESHOLD_SECONDS` (300), `FIVE_ONE_ONE_DURATION_THRESHOLD_SECONDS` (60), `FIVE_ONE_ONE_WINDOW_SECONDS` (3600), `FIVE_ONE_ONE_MIN_CONTRACTIONS` (5), `STATS_SAMPLE_SIZE` (10), `DEFAULT_API_PORT` (8787), `DEFAULT_DASHBOARD_PORT` (3000).

- [ ] **Step 6: Create barrel export index.ts**

```typescript
export * from './enums';
export * from './types';
export * from './constants';
```

- [ ] **Step 7: Commit**

```bash
git add libs/shared/
git commit -m "feat: add shared library with enums, types, and constants"
```

---

### Task 2: Stats Pure Functions + Tests

**Files:**
- Create: `libs/shared/src/stats.ts`
- Create: `libs/shared/src/stats.test.ts`

- [ ] **Step 1: Write failing tests for calculateRegularity**

Test cases:
- Returns `null` when fewer than 6 contractions
- Returns `'regular'` when 5 intervals have std dev < 2min
- Returns `'irregular'` when 5 intervals have std dev >= 2min
- Uses only last 5 intervals even if more contractions exist

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd libs/shared && bun test src/stats.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement calculateRegularity**

Pure function taking `Contraction[]` (sorted by `startedAt` desc), computing intervals between consecutive `startedAt` values, then standard deviation of last 5 intervals.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd libs/shared && bun test src/stats.test.ts`
Expected: PASS

- [ ] **Step 5: Write failing tests for detectFiveOneOneAlert**

Test cases:
- Returns `false` when fewer than 5 contractions
- Returns `true` when avg interval ≤ 5min, avg duration ≥ 1min, window ≥ 1h
- Returns `false` when interval is too long
- Returns `false` when duration is too short
- Returns `false` when window is too short

- [ ] **Step 6: Implement detectFiveOneOneAlert**

Pure function taking `Contraction[]`, checking last 5 finished contractions against thresholds from constants.

- [ ] **Step 7: Run tests, verify pass**

- [ ] **Step 8: Write failing tests for calculateStats**

Test `calculateSessionStats` function that returns `SessionStats` object with `totalContractions`, `averageDuration`, `averageInterval`, `regularity`, `alertFiveOneOne`, `lastDilation`.

- [ ] **Step 9: Implement calculateStats**

Composes `calculateRegularity` and `detectFiveOneOneAlert`. Averages use last 10 (or all) finished contractions.

- [ ] **Step 10: Run all tests, verify pass**

- [ ] **Step 11: Add stats to barrel export**

```typescript
export * from './stats';
```

- [ ] **Step 12: Commit**

```bash
git add libs/shared/
git commit -m "feat: add stats pure functions with tests (regularity, 5-1-1 alert, averages)"
```

---

### Task 3: API Scaffold — Wrangler, D1 Migration, Entry Point

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/wrangler.toml`
- Create: `apps/api/migrations/0001_init.sql`
- Create: `apps/api/src/types.ts`
- Create: `apps/api/src/index.ts`
- Create: `apps/api/src/middleware/cors.ts`
- Create: `apps/api/src/db/queries.ts`
- Create: `apps/api/src/db/mappers.ts`

- [ ] **Step 1: Create API package.json**

```json
{
  "name": "@contracking/api",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "bun test"
  },
  "dependencies": {
    "@contracking/shared": "workspace:*",
    "resend": "^4",
    "@react-email/components": "^0.0.30",
    "react": "^19",
    "react-dom": "^19"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4",
    "wrangler": "^4"
  }
}
```

- [ ] **Step 2: Create wrangler.toml**

```toml
name = "contracking-api"
main = "src/index.ts"
compatibility_date = "2025-01-01"

[[d1_databases]]
binding = "DATABASE"
database_name = "contracking"
database_id = "local"
migrations_dir = "migrations"
```

- [ ] **Step 3: Create API tsconfig.json**

Extends `../../tsconfig.base.json`, adds `@cloudflare/workers-types` to types.

- [ ] **Step 4: Create migration 0001_init.sql**

All 6 tables from spec with CREATE TABLE IF NOT EXISTS, ON DELETE CASCADE for contractions and events.

- [ ] **Step 5: Create src/types.ts**

`Environment` interface with `DATABASE: D1Database`, `RESEND_API_KEY: string`, `DASHBOARD_URL: string`. Row types imported from shared.

- [ ] **Step 6: Create src/middleware/cors.ts**

`withCors(response: Response, origin: string): Response` — sets CORS headers. `handleCorsPreFlight(request: Request, env: Environment): Response | null` for OPTIONS.

- [ ] **Step 7: Create src/db/queries.ts**

SQL constants for all CRUD operations: `INSERT_USER`, `SELECT_USER_BY_EMAIL`, `INSERT_MAGIC_LINK_TOKEN`, `SELECT_MAGIC_LINK_TOKEN`, `MARK_TOKEN_USED`, `INSERT_SESSION`, `SELECT_SESSION`, `DELETE_SESSION`, `INSERT_TRACKING_SESSION`, `SELECT_TRACKING_SESSIONS_BY_USER`, `SELECT_TRACKING_SESSION`, `UPDATE_TRACKING_SESSION`, `DELETE_TRACKING_SESSION`, `INSERT_CONTRACTION`, `UPDATE_CONTRACTION`, `DELETE_CONTRACTION`, `SELECT_CONTRACTIONS_BY_SESSION`, `INSERT_EVENT`, `DELETE_EVENT`, `SELECT_EVENTS_BY_SESSION`, `SELECT_SESSION_BY_PUBLIC_ID`, `COUNT_MAGIC_LINKS_IN_WINDOW`.

- [ ] **Step 8: Create src/db/mappers.ts**

Row-to-domain mapping functions: `mapUserRow`, `mapTrackingSessionRow`, `mapContractionRow`, `mapEventRow`.

- [ ] **Step 9: Create src/index.ts — entry point with route matching**

Worker `fetch` handler with URL pattern matching. Delegate to route modules. Handle CORS preflight. Return 404 for unknown routes. Pattern follows lead2go: `const url = new URL(request.url)`, match `url.pathname` with regex.

- [ ] **Step 10: Run `bun install` from root**

- [ ] **Step 11: Commit**

```bash
git add apps/api/
git commit -m "feat: add API scaffold with D1 migration, route matching, and CORS"
```

---

### Task 4: Auth Routes — Magic Link + Session

**Files:**
- Create: `apps/api/src/middleware/auth.ts`
- Create: `apps/api/src/middleware/rate-limit.ts`
- Create: `apps/api/src/email/magic-link.tsx`
- Create: `apps/api/src/routes/auth.ts`

- [ ] **Step 1: Create src/middleware/auth.ts**

`getAuthenticatedUser(request: Request, env: Environment): Promise<User | null>` — reads session cookie, queries D1 for valid session, returns user or null.
`requireAuth(request: Request, env: Environment): Promise<User>` — wraps getAuthenticatedUser, throws 401 if null.

- [ ] **Step 2: Create src/middleware/rate-limit.ts**

`isRateLimited({ key, maxRequests, windowSeconds, database }: RateLimitParams): Promise<boolean>` — uses D1 to count recent requests. For magic link: counts tokens created for email in last 15min.

- [ ] **Step 3: Create src/email/magic-link.tsx**

React Email template matching Abyss theme. Shows app name, "Clique para entrar" button with verify URL, expiration notice. Uses `@react-email/components`: `Html`, `Head`, `Body`, `Container`, `Section`, `Text`, `Button`, `Hr`.

- [ ] **Step 4: Create src/routes/auth.ts**

Three handlers:
- `handleMagicLink(request, env)` — POST, validates email, rate limit check, creates user if new, generates token, sends email via Resend, returns 200.
- `handleVerify(request, env)` — GET with `?token=`, validates token not expired/used, marks used, creates session, sets httpOnly cookie, redirects to dashboard.
- `handleLogout(request, env)` — POST, deletes session from D1, clears cookie, returns 200.

- [ ] **Step 5: Wire auth routes in index.ts**

Add route matching for `/auth/magic-link`, `/auth/verify`, `/auth/logout`.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/
git commit -m "feat: add magic link auth with Resend email, session cookies, and rate limiting"
```

---

### Task 5: API CRUD Routes — Sessions, Contractions, Events, Public

**Files:**
- Create: `apps/api/src/routes/sessions.ts`
- Create: `apps/api/src/routes/contractions.ts`
- Create: `apps/api/src/routes/events.ts`
- Create: `apps/api/src/routes/public.ts`

- [ ] **Step 1: Create src/routes/sessions.ts**

Handlers for `POST /sessions`, `GET /sessions`, `GET /sessions/:id`, `PATCH /sessions/:id`, `DELETE /sessions/:id`. All require auth. POST generates `publicId` via `crypto.randomUUID()`. GET /:id returns full `SessionResponse` with contractions, events, and computed stats.

- [ ] **Step 2: Create src/routes/contractions.ts**

Handlers for `POST /sessions/:id/contractions`, `PATCH /contractions/:id`, `DELETE /contractions/:id`. POST creates with `startedAt = now()`, returns contraction. PATCH updates any combination of `endedAt`, `intensity`, `position`, `notes`.

- [ ] **Step 3: Create src/routes/events.ts**

Handlers for `POST /sessions/:id/events`, `DELETE /events/:id`. POST takes `type`, `value`, `occurredAt`.

- [ ] **Step 4: Create src/routes/public.ts**

Handlers for `GET /public/:publicId` and `GET /public/:publicId/poll?after=`. No auth required. Full endpoint returns `SessionResponse`. Poll endpoint returns `PollResponse` with only items after timestamp. Both compute stats from `@contracking/shared` stats functions.

- [ ] **Step 5: Wire all routes in index.ts**

Add route matching for all new paths.

- [ ] **Step 6: Write API integration tests**

Create `apps/api/src/index.test.ts`. Test key flows:
- Magic link send + verify + session creation
- Create tracking session
- Start/stop contraction
- Add event
- Public endpoint returns data
- Poll returns delta
- Delete cascade

- [ ] **Step 7: Run tests**

Run: `cd apps/api && bun test`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add apps/api/
git commit -m "feat: add CRUD routes for sessions, contractions, events, and public view"
```

---

## Chunk 2: Dashboard — Core UI

### Task 6: Dashboard Scaffold — Bun.serve, Build, Theme

**Files:**
- Create: `apps/dashboard/package.json`
- Create: `apps/dashboard/tsconfig.json`
- Create: `apps/dashboard/server.ts`
- Create: `apps/dashboard/build.ts`
- Create: `apps/dashboard/index.html`
- Create: `apps/dashboard/src/theme.ts`
- Create: `apps/dashboard/src/api.ts`
- Create: `apps/dashboard/src/app.tsx`

- [ ] **Step 1: Create dashboard package.json**

```json
{
  "name": "@contracking/dashboard",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "bun run server.ts",
    "build": "bun run build.ts",
    "test": "bun test"
  },
  "dependencies": {
    "@contracking/shared": "workspace:*",
    "react": "^19",
    "react-dom": "^19",
    "lucide-react": "^0.460"
  }
}
```

- [ ] **Step 2: Create server.ts**

Bun.serve() on port 3000 (from constant). HTML import of `index.html`. Wildcard route `"/*"` → index for SPA. HMR enabled in dev.

- [ ] **Step 3: Create build.ts**

Bun.build from `index.html` to `./dist`. Inject `API_BASE_URL` env var.

- [ ] **Step 4: Create index.html**

Entry HTML with Tailwind CSS CDN, Tailwind config for Abyss theme colors, React root div. CSS custom properties for dark/light tokens using `prefers-color-scheme` media query.

- [ ] **Step 5: Create src/theme.ts**

Export theme tokens as TypeScript constants (colors, shadows, borders) for programmatic use. Match CSS custom properties from index.html.

- [ ] **Step 6: Create src/api.ts**

Fetch client following lead2go pattern: `API_BASE_URL` from env, credentials `'include'`, `assertSuccessful()`, typed request functions for all endpoints. `AuthenticationError` class.

- [ ] **Step 7: Create src/app.tsx**

Root component with simple path-based routing (`window.location.pathname`):
- `/` → tracking page (auth required)
- `/login` → login page
- `/s/:publicId` → public page (no auth)

- [ ] **Step 8: Run `bun install` from root, verify dev server starts**

Run: `cd apps/dashboard && bun run dev`
Expected: Server running on port 3000

- [ ] **Step 9: Commit**

```bash
git add apps/dashboard/
git commit -m "feat: add dashboard scaffold with Bun.serve, theme, and API client"
```

---

### Task 7: Auth UI — Login Page + useAuth Hook

**Files:**
- Create: `apps/dashboard/src/hooks/use-auth.ts`
- Create: `apps/dashboard/src/components/login-page.tsx`

- [ ] **Step 1: Create use-auth.ts hook**

Manages auth state: `user`, `loading`, `error`. Functions: `sendMagicLink(email)`, `logout()`, `refresh()`. Calls API client. Redirects to `/login` on `AuthenticationError`.

- [ ] **Step 2: Create login-page.tsx**

Email input + "Enviar link" button. Shows success message after send ("Verifique seu email"). Abyss theme styling. Single input, no password field.

- [ ] **Step 3: Wire into app.tsx**

Route `/login` → `LoginPage`. Protected routes check `useAuth()`.

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/src/
git commit -m "feat: add login page and auth hook"
```

---

### Task 8: Core Tracking UI — Main Button + Timer + Status Bar

**Files:**
- Create: `apps/dashboard/src/hooks/use-timer.ts`
- Create: `apps/dashboard/src/hooks/use-session.ts`
- Create: `apps/dashboard/src/hooks/use-contractions.ts`
- Create: `apps/dashboard/src/components/header.tsx`
- Create: `apps/dashboard/src/components/status-bar.tsx`
- Create: `apps/dashboard/src/components/main-button.tsx`
- Create: `apps/dashboard/src/components/tracking-page.tsx`

- [ ] **Step 1: Create use-timer.ts**

`useTimer()` hook using `requestAnimationFrame`. Returns `{ elapsedSeconds, isRunning, start, stop, reset }`. High-precision timer for contraction duration display.

- [ ] **Step 2: Create use-session.ts**

Manages active tracking session. Fetches session data from API. Provides `createSession`, `updateSession`. Holds `session`, `contractions`, `events`, `stats`.

- [ ] **Step 3: Create use-contractions.ts**

CRUD operations for contractions via API. `startContraction()`, `stopContraction(id)`, `updateContraction(id, data)`, `deleteContraction(id)`. Optimistic updates. Calls `invalidateQueries` (re-fetches session data after mutation).

- [ ] **Step 4: Create header.tsx**

"Contracking" title, "Semana {n} · {nome}" subtitle. Help `?` button and share button (both 32x32 rounded squares). Lucide icons: `HelpCircle`, `Share2`.

- [ ] **Step 5: Create status-bar.tsx**

3 metrics: total contractions, avg duration, avg interval. Rounded card with subtle background. Values from `SessionStats`.

- [ ] **Step 6: Create main-button.tsx**

140px circular button with gradient. Two states:
- Idle: "Iniciar" text, subtexto with time since last contraction.
- Active: timer display (MM:SS), "toque para parar" text, intensified glow.

onClick: calls `startContraction()` or `stopContraction()`.

- [ ] **Step 7: Create tracking-page.tsx**

Composes: Header → StatusBar → MainButton → (chips, events, timeline — placeholders for now). Manages active contraction state.

- [ ] **Step 8: Wire into app.tsx**

Route `/` → `TrackingPage` (auth required).

- [ ] **Step 9: Commit**

```bash
git add apps/dashboard/src/
git commit -m "feat: add core tracking UI with main button, timer, and status bar"
```

---

### Task 9: Optional Fields — Intensity, Position, Event Chips

**Files:**
- Create: `apps/dashboard/src/components/intensity-chips.tsx`
- Create: `apps/dashboard/src/components/position-chips.tsx`
- Create: `apps/dashboard/src/components/event-chips.tsx`
- Create: `apps/dashboard/src/hooks/use-events.ts`
- Create: `apps/dashboard/src/components/bottom-sheet.tsx`
- Create: `apps/dashboard/src/components/event-form.tsx`

- [ ] **Step 1: Create intensity-chips.tsx**

3 chips with ascending bars (1 bar = mild, 2 = moderate, 3 = strong). SVG bars, not emoji. Toggle selection. Calls `updateContraction` on change. 38x38px, border-radius 10px.

- [ ] **Step 2: Create position-chips.tsx**

6 chips with Lucide icons: `BedSingle` (lying), `Armchair` (sitting), `PersonStanding` (standing), `Footprints` (walking), `ArrowDownToLine` (squatting), `Circle` (ball). Same chip styling as intensity. Toggle selection.

- [ ] **Step 3: Create bottom-sheet.tsx**

Reusable bottom sheet overlay. Slides up from bottom. Dark backdrop. Close on backdrop click or swipe down. Props: `isOpen`, `onClose`, `children`.

- [ ] **Step 4: Create use-events.ts**

`createEvent(sessionId, type, value)`, `deleteEvent(id)`. Calls API and invalidates session data.

- [ ] **Step 5: Create event-form.tsx**

Bottom sheet content per event type:
- `WATER_BREAK`: confirmation only ("Registrar ruptura de bolsa?")
- `MEAL`: confirmation only ("Registrar última refeição?")
- `DILATION`: numeric input 1-10 with cm label
- `NOTE`: text input

- [ ] **Step 6: Create event-chips.tsx**

4 mini-chips: `Droplets` (bolsa), `Utensils` (refeição), `Ruler` (dilatação), `MessageSquare` (nota). 28px height. Each opens corresponding bottom sheet form.

- [ ] **Step 7: Wire all into tracking-page.tsx**

Intensity + position chips appear below main button (always visible). Event chips below them. Bottom sheets managed by state in tracking page.

- [ ] **Step 8: Commit**

```bash
git add apps/dashboard/src/
git commit -m "feat: add intensity, position, and event chips with bottom sheet forms"
```

---

### Task 10: Timeline + Edit/Delete

**Files:**
- Create: `apps/dashboard/src/components/timeline.tsx`
- Create: `apps/dashboard/src/components/timeline-item.tsx`
- Create: `apps/dashboard/src/components/edit-contraction.tsx`

- [ ] **Step 1: Create timeline-item.tsx**

Single contraction row: colored dot (intensity) + time + details (bars + text + position icon) + duration + interval. Tap opens edit bottom sheet. Swipe left reveals delete button with confirmation.

- [ ] **Step 2: Create timeline.tsx**

Header: "Histórico" + regularity badge (regular/irregular/null). List of `TimelineItem` components. Scroll container.

- [ ] **Step 3: Create edit-contraction.tsx**

Bottom sheet with: intensity chips, position chips, time pickers (started_at, ended_at), notes text input, "Salvar" button. Pre-populated with current values. Calls `updateContraction` on save.

- [ ] **Step 4: Wire into tracking-page.tsx**

Timeline at bottom of page. Edit/delete handlers connected to contraction hooks.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/
git commit -m "feat: add timeline with edit/delete contraction support"
```

---

### Task 11: Instructions Modal + Share Modal

**Files:**
- Create: `apps/dashboard/src/components/instructions-modal.tsx`
- Create: `apps/dashboard/src/components/share-modal.tsx`

- [ ] **Step 1: Create instructions-modal.tsx**

Full-screen modal with step-by-step instructions:
1. Toque no botão para iniciar/parar
2. Marque intensidade e posição (opcional)
3. Registre eventos (bolsa, refeição, etc.)
4. Compartilhe o link com a médica

Shows on first visit (localStorage flag). Accessible via `?` button.

- [ ] **Step 2: Create share-modal.tsx**

Bottom sheet with public URL, copy button. Shows link like `https://domain/s/{publicId}`. Copy to clipboard with feedback ("Copiado!").

- [ ] **Step 3: Wire into header.tsx and tracking-page.tsx**

`?` button opens instructions. Share button opens share modal.

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/src/
git commit -m "feat: add instructions modal and share link modal"
```

---

## Chunk 3: Public View + Polish

### Task 12: Public View — Doctor's Page

**Files:**
- Create: `apps/dashboard/src/hooks/use-polling.ts`
- Create: `apps/dashboard/src/components/public-page.tsx`
- Create: `apps/dashboard/src/components/public-chart.tsx`

- [ ] **Step 1: Create use-polling.ts**

Generic polling hook. Calls callback every `POLLING_INTERVAL_MILLISECONDS`. Pauses when tab inactive (Page Visibility API). Returns `{ data, loading }`.

- [ ] **Step 2: Create public-page.tsx**

Read-only view with:
- Header: "Contracking" + "AO VIVO" badge with pulsing dot
- Patient info tags (name, week, start time)
- Alert card (5-1-1 pattern) when applicable
- Stats grid (4 columns)
- Chart component
- Events log
- Timeline (read-only, reuses `TimelineItem`)

Uses `usePolling` to fetch from `GET /public/:publicId`. Initial full load, then polls with `?after=` for deltas.

- [ ] **Step 3: Create public-chart.tsx**

SVG chart with 3 tabs: interval, duration, intensity. Line chart with fill, dots, grid lines. Data from contraction history. Labels on X axis (times).

- [ ] **Step 4: Wire into app.tsx**

Route `/s/:publicId` → `PublicPage` (no auth required).

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/
git commit -m "feat: add public view for doctor with live polling, charts, and alerts"
```

---

### Task 13: Dashboard Tests

**Files:**
- Create: `apps/dashboard/src/app.test.tsx`

- [ ] **Step 1: Write component tests**

Test key components:
- `MainButton`: renders "Iniciar" when idle, timer when active
- `IntensityChips`: toggles selection, calls onChange
- `StatusBar`: displays stats correctly
- `TimelineItem`: renders contraction data, shows edit on tap
- `PublicPage`: renders patient info and timeline

- [ ] **Step 2: Run tests**

Run: `cd apps/dashboard && bun test`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/src/
git commit -m "test: add dashboard component tests"
```

---

### Task 14: Final Polish — Lint, Format, Verify

- [ ] **Step 1: Run biome check and fix**

Run: `bunx biome check --write .`

- [ ] **Step 2: Run all tests**

Run: `bun test`
Expected: All pass

- [ ] **Step 3: Verify dev server works end-to-end**

Start API: `cd apps/api && bunx wrangler dev`
Start dashboard: `cd apps/dashboard && bun run dev`
Test: open http://localhost:3000, send magic link, create session, track contraction, check public link.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "chore: lint fixes and final polish"
```

- [ ] **Step 5: Final commit with updated README if needed**

---

## Task Dependency Graph

```
Task 1 (shared enums/types/constants)
  └─ Task 2 (stats functions + tests)
      └─ Task 3 (API scaffold + migration)
          └─ Task 4 (auth routes)
              └─ Task 5 (CRUD routes + tests)
  └─ Task 6 (dashboard scaffold)
      └─ Task 7 (login + auth hook)
          └─ Task 8 (core tracking UI)
              └─ Task 9 (optional fields)
                  └─ Task 10 (timeline + edit/delete)
                      └─ Task 11 (modals)
              └─ Task 12 (public view) [depends on Task 5 for API]
                  └─ Task 13 (dashboard tests)
                      └─ Task 14 (polish)
```

**Parallelizable:** Tasks 3-5 (API) and Tasks 6-11 (Dashboard) can run in parallel after Task 2 completes, since they share only the `@contracking/shared` lib.
