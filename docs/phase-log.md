# Phase Log

## Phase 1

- 2026-02-19: Step 1 complete - production-ready MERN skeleton folder structure scaffolded for LaunchRadar.
- 2026-02-19: Phase 1 Backend Core Step 1 complete - implemented env loader, MongoDB connection, Express app/server bootstrap, /health route, and app-level error handling.

- 2026-02-19: Security setup - added env/secret ignore rules to .gitignore to prevent confidential data from being pushed.

- 2026-02-19: Backend env fix - set local .env runtime values (PORT, NODE_ENV, ADMIN_KEY, CORS_ORIGIN) to resolve startup crash.

## Step 2: Listings Domain Implementation

- [x] listing.model.js created
- [x] listing.service.js created
- [x] listing.controller.js created
- [x] listing.routes.js created
- [x] Admin key middleware added
- [x] Routes mounted in app
- [x] Manual CRUD tested

Status: IN PROGRESS

- 2026-02-19: API error handling improvement - Mongoose validation/cast errors now return 400 with clear messages instead of generic 500.

- 2026-02-19: Added Listings CRUS documentation file at docs/listings-crus.md for public/admin endpoint explanation.

## Phase 1B - Frontend Core

### Step 1: Admin UI Setup

- [x] API client configured
- [x] Admin login page stores admin key
- [x] ProtectedRoute working

### Step 2: Listings UI

- [x] Create listing form connected to API
- [x] Listings table shows data
- [x] Edit listing works
- [x] Delete listing works

### Step 3: Public Page

- [x] Public listings fetch
- [x] Detail page fetch

Status: IN PROGRESS

- 2026-02-19: Frontend runtime setup added (Vite package.json, index.html, vite config, and .env.example for API base URL).

- 2026-02-19: Fixed invalid root package.json that was blocking Vite startup in frontend.

- 2026-02-20: Phase 1B Step 2 completed - admin Listings UI create/read/update/delete flow integrated.

- 2026-02-20: Backend logging enabled (morgan request logs + logger config) and nodemon verified/updated.

## Phase 1 Extension - Email Capture (Waitlist)

### Backend

- [x] leads module folder created
- [x] lead.model.js created
- [x] lead.service.js created (duplicate prevention)
- [x] lead.controller.js created
- [x] lead.routes.js created
- [x] POST /api/leads registered in routes index

### Frontend

- [x] Email input added on public homepage
- [x] POST /api/leads integrated
- [x] Success + duplicate message handling
- [x] Input reset on success

### QA

- [ ] New email can be submitted
- [ ] Duplicate email is rejected
- [ ] MongoDB lead document verified

Status: IN PROGRESS

- 2026-02-20: Email capture backend implemented with leads module and public POST /api/leads route.

## Phase 2 - User Auth

- [x] auth.model.js (user schema) created
- [x] auth.service.js register/login/me logic added
- [x] auth.controller.js implemented
- [x] auth.routes.js registered (/api/auth/register, /api/auth/login, /api/auth/google, /api/auth/me)
- [x] JWT auth middleware added
- [x] bcryptjs + jsonwebtoken installed
- [x] Frontend auth pages integrated
- [ ] End-to-end UI auth test

Status: IN PROGRESS

- 2026-02-20: Phase 2 auth backend implemented (register/login/me with JWT + hashed passwords).

- 2026-02-20: Modern public UI added (homepage listings, detail page, and waitlist email capture form).

- 2026-02-20: Frontend user auth integrated (/auth login/signup and protected /me profile route).

- 2026-02-20: Frontend build verified successfully after integration.

- 2026-02-20: Dual-port frontend dev enabled (user:5174, admin:5175) and backend CORS updated for both origins.

- 2026-02-20: User-facing admin link removed; Google-first sign-in added (frontend GIS button + backend /api/auth/google verification).
- 2026-02-20: User login gate tightened (immediate Google sign-in requirement) and Google auth duplicate-user race handling added.

## Current Feature Snapshot (As of 2026-02-20)

### Backend Completed

- Express server with health route (`/health`)
- MongoDB connection setup (local/Atlas via env)
- Centralized error handling + request logging (morgan)
- Listings domain:
  - Public read: `GET /api/listings`, `GET /api/listings/:id`
  - Admin CRUD: `POST/PUT/DELETE /api/admin/listings` with `x-admin-key`
- Leads (waitlist) domain:
  - Public capture: `POST /api/leads`
  - Duplicate email prevention
- User auth domain:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/google`
  - `GET /api/auth/me` (JWT protected)
  - Password hashing + JWT issuance
  - Google token verification + duplicate-safe user create

### Frontend Completed

- Admin panel:
  - Admin key login
  - Protected admin route
  - Listings create/update/delete + listings table
- Public app:
  - Public listings page (`/`)
  - Listing detail page (`/listing/:id`)
  - Waitlist email capture UI
- User auth UI:
  - Google-first sign-in page (`/auth`)
  - Protected profile route (`/me`)
- Mandatory sign-in gate:
  - Non-logged users see immediate Google sign-in gate on homepage
- Dual frontend dev ports:
  - User app: `5174`
  - Admin app: `5175`

### Environment/Infra Completed

- Secret/env safety in `.gitignore`
- Multi-origin CORS support for both frontend ports
- Frontend Vite runtime setup and build verified

### Pending Tracking Items

- Phase 1 Extension QA checkboxes (leads end-to-end verification)
- Phase 2 end-to-end UI auth test checkbox

## Phase 3 - Public Dashboard Enhancement

### Step 1: UI Structure

- [x] Search bar component
- [x] Category filter component
- [x] Sort dropdown (New / Popular)
- [x] Dark/Light mode toggle
- [x] Responsive layout grid

### Step 2: Data Logic

- [x] Client-side search filtering
- [x] Category filtering
- [x] Sort by newest (createdAt)
- [x] Popular sorting metric (views-based)

### Step 3: Card Redesign

- [x] Thumbnail support
- [x] Title
- [x] Short description (truncated)
- [x] Tags
- [x] External link button

Status: IN PROGRESS

- 2026-02-20: Phase 3 public dashboard UI implemented with reusable components, dark mode toggle, and client-side filtering/sorting logic.
- 2026-02-20: Phase 3 backend popularity metric implemented (views counter + `?sort=popular` on listings API).
- 2026-02-20: Phase 3 UI polish completed (card hierarchy, skeleton loading, empty state refinement, and dark mode contrast tuning).

## High-Level Progress Snapshot (Added 2026-02-20)

### Phase 1 - Core Directory

Completed:

- Listings CRUD
- Public listing page
- Listing detail page
- Admin dashboard
- MongoDB setup
- Error handling

Pending:

- Launch date field (PRD)
- Whitepaper/demo links
- Ratings

Estimated Completion: ~80%

### Phase 2 - Auth & Growth

Completed:

- JWT auth
- Google auth
- Waitlist email capture
- Protected routes
- Favorites feature
- Rating system
- Upload submission feature

Pending:

- End-to-end UI auth + growth regression pass

Estimated Completion: ~95%

### Phase 3 - UX Enhancement

Completed:

- Grid layout
- Responsive design
- Public page
- Search
- Category filtering
- Sort options
- Dark/Light toggle
- Thumbnail support
- Proper "Popular" metric
- UI polish

Pending:

- Final QA and polish pass

Estimated Completion: ~95%

### Phase 4 - Community Features

Completed:

- Upload Your Idea
- Moderation queue
- Submission approval

Pending:

- File upload

Estimated Completion: ~75%

### Phase 5 - Automation & Scaling

Pending:

- Cron jobs
- RSS ingestion
- Bulk CSV upload
- Analytics dashboard

Estimated Completion: 0%

### Phase 6 - PWA & Distribution

Pending:

- Service worker
- Install prompt
- Push notifications
- SEO meta tags
- Sitemap

Estimated Completion: 0%

- 2026-02-20: Phase 4 Step 1 backend implemented (submissions module, moderation routes, and listing approval flow).
- 2026-02-20: Phase 4 Step 2 frontend implemented (protected /submit route + user submission form posting to /api/submissions).

- 2026-02-21: Public homepage CTA enhanced with animated bulb-style 'Submit Your Idea' button linked to protected /submit flow.

- 2026-02-22: Phase 4 Step 3 frontend implemented (admin moderation queue UI with pending submissions list and approve/reject actions).

- 2026-02-22: Moderation access compatibility fix added (admin submissions endpoints now allow valid x-admin-key or admin-role JWT).

- 2026-02-22: Submission capture improved with submitter email persistence (`submittedByEmail`) for reliable moderation attribution.

- 2026-02-22: Public navbar auth UX improved (top-right user initials/email chip + logout action).

- 2026-02-22: Admin moderation upgraded with searchable status tabs (pending/approved/rejected/all) and date sorting controls.

- 2026-02-22: Admin moderation filtering extended with dedicated category filter (backend query + frontend dropdown integration).

- 2026-02-22: Phase 2 growth features completed (favorites API + UI integration, listing rating API + detail-page rating submission, and tracking update for upload submission capability).

- 2026-02-22: HackerNews automation updated to auto-publish fetched AI stories into listings (no manual approval), while still storing source records.

- 2026-02-22: HackerNews ingest adjusted to News stream (`category: News`, `news: true`) and excluded from AI Tools categorization on public filters.

- 2026-02-22: HackerNews publishing now upserts listings and force-syncs category to News for existing links (fixes empty News filter after prior AI Tools imports).

- 2026-02-22: HackerNews AI matching expanded (100 stories scanned + broader AI keyword set for higher capture volume).

- 2026-02-22: Public dashboard updated: removed waitlist UI and replaced category dropdown with clickable category chips.

- 2026-02-22: Block 1 frontend redesign completed (dark SaaS shell with sidebar, hero search, category chips, segmented tabs, and refreshed listing cards).

- 2026-02-22: Admin dashboard partitioned into titled sections (Listings and Pending Submissions) using tab-style navigation.

- 2026-02-22: Admin UX enhanced with separate Create Listing tab and pagination added to Listings and Submissions tables.

- 2026-02-22: News category UI updated to single-column feed layout (non-card), and shell brand text/logo removed from sidebar.

- 2026-02-22: News content cleanup applied (removed HackerNews import fallback text and sanitized HTML/entity-heavy descriptions for readable frontend output).

- 2026-02-22: Phase 5 Step 2 added GitHub AI integration service and temporary admin trigger route (/api/admin/automation/github-test).

- 2026-02-22: GitHub automation query updated to `ai in:name,description` with fetch diagnostics logging (`total_count` and `items.length`) and simplified non-topic-strict ingestion.

- 2026-02-22: Phase 5 RSS multi-source integration added (rss-parser service + admin test route /api/admin/automation/rss-test).

- 2026-02-22: News view enhanced to latest-first stream with source label, favorite action, and dedicated pagination.

- 2026-02-22: Product Hunt GraphQL automation added with dedicated collection (`producthunt_sources`) and admin test route (/api/admin/automation/producthunt-test).

- 2026-02-22: Product Hunt ingestion schema aligned to GraphQL node shape (id/name/tagline/.../isCollected), with duplicate checks on id+url before insert.

- 2026-02-22: GitHub automation normalization updated to stop forcing `category`, `tags`, and `popularity` defaults; records now persist with source/raw payload plus core link/title/description fields.

- 2026-02-22: Product Hunt topics ingestion added (saved to `producthunt_topics`) with admin trigger route (`/api/admin/automation/producthunt-topics-test`) and public topics read route (`/api/producthunt/topics`) for frontend category display.

- 2026-02-22: Phase 5 Product Hunt Phase 2 added: fetch-and-save products per saved topic into `producthunt_products` with global dedupe on `ph_id`, admin trigger routes for single/all topic ingestion, and public read route for saved products.

- 2026-02-22: Frontend public flow replaced with Product Hunt category-first discovery (dynamic categories from DB + per-category products + search + pagination) for cleaner, readable browsing UX.

- 2026-02-23: Product Hunt automation Phase 2 completed - added topic-wise product ingestion into `producthunt_products`, global dedupe via `ph_id` upsert, and admin triggers for single-topic/all-topics fetch runs.

- 2026-02-23: Product Hunt topics pipeline finalized - categories persisted in `producthunt_topics` and exposed via public API for frontend-driven category navigation.

- 2026-02-23: Public frontend flow fully switched to Product Hunt category browsing - dynamic category chips from DB, per-category product listing, search, pagination, and polished readable card layout.

- 2026-02-23: Public UI redesigned to Product Hunt-style split layout with top navigation, left "Top Products Launching Today" stream, and right "Trending Categories" panel backed by DB topics.

- 2026-02-23: Added dynamic Product Hunt "Top Products Today" API (`/api/producthunt/top-today`) with automatic UTC date window and optional `limit`/`date` query params for frontend top-launch section.

- 2026-02-23: Added dedicated categories endpoint (`/api/producthunt/categories`) and updated frontend to use it; top-products section is now intentionally empty on initial load for separate API wiring.

- 2026-02-23: Public layout updated per Product Hunt-style flow: categories moved under Best Products, main title set to "Top Products Launching Today", and right panel switched to "Trending Forum Threads".

- 2026-02-23: Home page now fetches live "Top Products Launching Today" from `/api/producthunt/top-today`; category clicks open a dedicated page route (`/category/:slug`) for category-wise products.

- 2026-02-23: Top-products pipeline moved to DB-backed snapshots (`producthunt_top_products`) with nightly post-midnight UTC sync, 7-day auto-expiry (TTL), manual admin sync route, and paginated public read (`limit/page`, default 10).

- 2026-02-23: Frontend top-products section updated with API-driven pagination controls (Prev/Next) using `/api/producthunt/top-today?page=&limit=10`.

- 2026-02-23: Added weekly Product Hunt products cleanup automation: cron deletes the 40 lowest-vote records from `producthunt_products`, with manual admin trigger route for on-demand cleanup testing.

- 2026-02-23: Added weekly Product Hunt refresh automation before cleanup (refresh categories + fetch products for all topic slugs), with manual admin trigger route for immediate refresh testing.
- 2026-02-23: Added Product Hunt trending pipeline (`producthunt_trending`) with daily replace cron (10 inserted / previous 10 removed), public trending API, and animated trending UI panel integration.
- 2026-02-23: Added rotating "Trending Apps" banner above Top Products with arrow navigation and pause/play control; right-side trending area replaced with reserved placeholder panel.
- 2026-02-24: Top Products cron updated to run every 5 minutes with immediate warm-start sync on server boot, fetch size increased to 50 per run, rolling cleanup target set to 50 old records per run, and snapshot dedupe preserved via unique upsert key (`ph_id + snapshotDate`).

## Command Reference

### Backend - Run

```bash
cd c:\MVP-Billionds\LaunchRadar\backend
npm run dev
```

### Frontend - Run

```bash
cd c:\MVP-Billionds\LaunchRadar\frontend
npm run dev
```

### Product Hunt - Fetch Topics (Save to DB)

```bash
curl.exe -X GET "http://localhost:5000/api/admin/automation/producthunt-topics-test" -H "x-admin-key: dev_admin_key_change_me"
```

### Product Hunt - Fetch Products by One Topic

```bash
curl.exe -X GET "http://localhost:5000/api/admin/automation/producthunt-products-by-topic-test?topic=artificial-intelligence" -H "x-admin-key: dev_admin_key_change_me"
```

### Product Hunt - Fetch Products for All Saved Topics

```bash
curl.exe -X GET "http://localhost:5000/api/admin/automation/producthunt-products-all-topics-test" -H "x-admin-key: dev_admin_key_change_me"
```

### Product Hunt - Sync Top Products Snapshot (DB)

```bash
curl.exe -X GET "http://localhost:5000/api/admin/automation/producthunt-top-products-sync?date=2026-02-22&limit=20" -H "x-admin-key: dev_admin_key_change_me"
```

### Product Hunt - Read Top Products (Paginated)

```bash
curl.exe "http://localhost:5000/api/producthunt/top-today?limit=10&page=1"
```

### Product Hunt - Read Categories

```bash
curl.exe "http://localhost:5000/api/producthunt/categories"
```

### Product Hunt - Read Topics (Fallback API)

```bash
curl.exe "http://localhost:5000/api/producthunt/topics"
```

### Product Hunt - Read Products by Category

```bash
curl.exe "http://localhost:5000/api/producthunt/products?topic=artificial-intelligence"
```

### Product Hunt - Weekly Refresh (Manual Trigger)

```bash
curl.exe -X GET "http://localhost:5000/api/admin/automation/producthunt-products-weekly-refresh" -H "x-admin-key: dev_admin_key_change_me"
```

### Product Hunt - Weekly Cleanup Lowest Votes (Manual Trigger)

```bash
curl.exe -X GET "http://localhost:5000/api/admin/automation/producthunt-products-weekly-cleanup?count=40" -H "x-admin-key: dev_admin_key_change_me"
```

### Product Hunt - Trending Sync (Manual Trigger)

```bash
curl.exe -X GET "http://localhost:5000/api/admin/automation/producthunt-trending-sync" -H "x-admin-key: dev_admin_key_change_me"
```

### Product Hunt - Read Trending (Public)

```bash
curl.exe "http://localhost:5000/api/producthunt/trending?limit=10"
```

### GitHub Automation - Test

```bash
curl.exe -X GET "http://localhost:5000/api/admin/automation/github-test" -H "x-admin-key: dev_admin_key_change_me"
```

### RSS Automation - Test

```bash
curl.exe -X GET "http://localhost:5000/api/admin/automation/rss-test" -H "x-admin-key: dev_admin_key_change_me"
```

### HackerNews Automation - Manual Service Trigger (Node One-liner)

```bash
cd c:\MVP-Billionds\LaunchRadar\backend
node -e "const { connectDB } = require('./src/config/db'); const { fetchHackerNewsAI } = require('./src/modules/automation/hackernews/hackernews.service'); (async () => { await connectDB(); const result = await fetchHackerNewsAI(); console.log(result); process.exit(0); })().catch((e) => { console.error(e); process.exit(1); });"
```

🥇 Path A — Stabilize & Optimize (Recommended)

Instead of adding more sources:

Add cron scheduling cleanly

Add ingestion logging dashboard

Add duplicate monitoring

Add rate limit protection

Add ingestion error tracking

Clean normalization layer across all sources

Make automation production-ready.

🥈 Path B — Expand Sources

Next potential source:

HuggingFace models API

Kaggle datasets

IndieHackers

AI startup newsletters

But that increases complexity.
