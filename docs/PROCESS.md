Chartly Finance Tracker — PROCESS

Overview

Chartly Finance Tracker (formerly Chartly/Aureus) is an offline-first Angular web app for managing personal finances. It's a PWA that stores data locally using IndexedDB, provides charts and reports, and includes an admin panel for seeding and managing app-wide settings.

Key features

- Offline-first PWA (service worker enabled)
- Local storage via IndexedDB (Dexie)
- Responsive UI with Tailwind CSS and Angular Material components
- Interactive charts (Chart.js via ng2-charts)
- Mobile-friendly drawer + desktop sidebar
- Admin panel for seeding data, exporting/importing backups, and maintenance
- Web worker for heavy aggregation tasks (src/app/workers)
- CSV import/export support (PapaParse + FileSaver)

Project structure (high level)

- src/app/
  - shell.component.ts  — main layout, toolbar, mobile drawer, desktop sidebar
  - pages/              — route pages: dashboard, transactions, accounts, admin, login, reports, settings, etc.
  - components/         — small reusable components (banners, toast, audit log)
  - services/           — business logic & shared state (AuthService, SidebarService, DataService, ToastService)
  - data/               — Dexie DB setup and models
  - workers/            — web worker(s) for CPU-intensive tasks
  - utils/              — cryptography helpers and helpers
- src/styles.css        — Tailwind layers and custom component styles (fancy-sidenav, mobile drawer, hamburger, account dropdown)
- angular.json, tailwind.config.js, package.json — build and config files

Main libraries and tools

- Angular 20 (framework, router, forms)
- Angular Material + CDK (toolbar, icons, buttons)
- Tailwind CSS (utility-first styling)
- Chart.js + ng2-charts (charts and graphs)
- Dexie.js (IndexedDB wrapper)
- PapaParse (CSV parsing)
- FileSaver (saving exports)
- Angular Service Worker (PWA)
- TypeScript, RxJS

Important scripts (from package.json)

- npm start — ng serve (development server)
- npm run build — ng build (production build)
- npm run watch — watch build
- npm test — run unit tests (karma/jasmine)

Running locally

1. Install deps: npm install (or use pnpm/yarn if preferred)
2. Start dev server: npm start
3. Open http://localhost:4200
4. To build for production: npm run build

Developer notes & gotchas

- Sidebar behavior: Desktop sidebar is controlled by SidebarService. On mobile/tablet the app uses a mobile drawer; the SidebarService default has been set to closed to avoid a legacy visible sidebar on reload.
- Responsive breakpoints: Tailwind sm/ md/ lg breakpoints are used; the desktop sidebar is hidden for narrower widths with .fancy-sidenav styles and media queries.
- Logo replacement: The header and mobile drawer use an <img> in the shell component. Replace src in src/app/shell.component.ts if you want a different PNG.
- Admin defaults: The code includes helper placeholders and an optional seeded admin in AuthService (change or remove default seeded credentials in src/app/services/auth.service.ts if desired).
- Clearing caches: Admin panel exposes a Clear Cache & Reload helper which attempts to unregister service workers, delete caches and wipe IndexedDB/localStorage.
- PWA: If service worker is active, changes might be cached — use the admin "Clear Cache" action to help while developing.

Where to change things

- Navigation items & labels: src/app/shell.component.ts
- Charts and dashboard logic: src/app/pages/dashboard.page.ts (or similar files in src/app/pages)
- Database schema & migrations: src/app/data/db.ts & src/app/data/models.ts
- Styles: src/styles.css & tailwind.config.js
- Worker(s): src/app/workers/*

Recommended MCP integrations (optional)

When helpful, you can connect external MCP servers to extend the project. All available MCP integrations you can connect from the Builder.io environment include:

• Neon — serverless Postgres for production DB and auth. Use: central storage, backups, syncing local data when online.
• Netlify — hosting, CI/CD, and deployment for static built bundles.
• Zapier — automation and integrations with other apps (export/notify workflows).
• Figma — design-to-code conversion via Builder.io plugin (helpful to import UI designs).
• Supabase — hosted Postgres + auth + realtime subscriptions (alternative to Neon).
• Builder CMS — content management for marketing pages and assets.
• Linear — issue tracking and project automation.
• Notion — documentation and knowledge management.
• Sentry — error monitoring and performance tracing for production.
• Context7 — up-to-date docs for libraries used.
• Semgrep — security scanning and static analysis.
• Prisma Postgres — ORM and database management tooling.

To connect MCPs in Builder.io: open the MCP popover in the Builder UI and select the integration you want to attach.

Suggested next steps

- Replace the header logo with a small PNG or optimized icon (not a photo) — choose a 1:1 square PNG ~96x96 with transparent background for best results.
- Consider adding a remote backup sync (Neon or Supabase) to allow cross-device sync.
- Add unit tests for key services (AuthService, DataService) and end-to-end tests for navigation.

Contact

If you want, I can:
- Replace the logo with a specific PNG URL you provide
- Wire up a chosen MCP (e.g., Supabase/Neon) — I can provide implementation steps
- Add more detailed developer docs (API, data model, DB schema)

---
Generated on: Chartly project workspace
