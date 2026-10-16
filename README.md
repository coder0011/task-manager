# DataPure Task Manager Enterprise

> **An enterprise-grade, high-performance Task Manager & Sprint Board built with 100% Pure Node.js, TypeScript, MySQL 8.0, and React 19. Engineered with Clean Architecture, Optimistic Concurrency Control (OCC), Multi-Environment Configurations, Role-Based Access Control (RBAC), and Dual-Hosting Compatibility (cPanel Shared Hosting & Docker Cloud).**
> 
> **Author:** Saurabh Sharma

Inspired by modern developer productivity tools like **Linear.app** and **Jira**, DataPure provides a fluid Kanban board and sortable Table view with drag-and-drop, optimistic UI updates, atomic race condition prevention, threaded task comments & discussions, real-time user notifications, user avatars, activity auditing, and built-in developer tools.

---

## 🌟 Architecture & Core Capabilities

- **Pure Node.js Fullstack Monorepo**: Dedicated Node.js + Express + TypeScript backend paired with a React 19 + Vite + Tailwind CSS frontend.
- **Modular Domain Services & In-Flight Request Deduplication**:
  - Modularized service layer (`authService`, `boardService`, `taskService`, `userService`, `rbacService`, `activityLogService`, `notificationService`).
  - Integrated `apiDeduplicator.ts` caching concurrent in-flight GET requests, eliminating duplicate network fetches.
  - Initial board metadata and tasks parallelized via `Promise.all`.
- **Component-Wise CSS Segregation & Vite CSS Chunking**:
  - Component-specific styles co-located in dedicated CSS modules (`KanbanBoard.css`, `TableView.css`, `ActivityLogView.css`, etc.).
  - Vite automatically code-splits CSS into view-level chunks alongside lazy-loaded components.
- **Enterprise Async Performance & Concurrency Suite**:
  - `useDebounce`: Debounced search inputs preventing server query spam.
  - `useAbortController`: Automatic cancellation of superseded in-flight requests on parameter changes or component unmount.
  - `throttle` & `useThrottledCallback`: Event throttling on scroll, resize, and rapid button clicks.
- **Dual Workflow Modes**:
  - **Kanban Board**: Drag-and-drop workflow state changes powered by `@dnd-kit`, column quick-add, card editing, and direct deletion with confirmation dialogs.
  - **Table View**: Server-side pagination, searching, sorting by any attribute, unified row-per-page selector (10, 20, 50, 100), and a fixed-position floating Three-Dot action menu.
- **Dedicated View Mode & Edit Mode**:
  - **View Modal (`TaskDetailModal`)**: Deep inspection with threaded **Comments & Discussion**, attachment viewing/download, assignee/reporter details, and human-readable **Activity & Status History**.
  - **Edit Modal (`TaskModal`)**: Comprehensive task property editing and multi-file drag-and-drop uploads.
- **Task Comments & Discussion**:
  - Threaded discussions on tasks with author avatar, role badge, timestamp, and delete authorization (author or Admin).
  - User profile management with avatar image upload, display name updating, and password changing.
  - Interactive **User Detail Modal** accessible by clicking any user avatar or name across the entire app.
- **TanStack Query v5 State Sync & Tab Switching**:
  - Integrated `@tanstack/react-query` v5 for reactive server-state caching, automatic cache invalidation on mutations, and instant tab transitions without full page reloads.
- **Table View Newest First Default & Multi-Column Sorting**:
  - All table views (Tasks, Team Directory, Audit Logs) default to displaying newly created and updated records first (`ORDER BY created_at DESC, updated_at DESC, id DESC`).
  - Interactive column headers for sorting by Created, Updated, Priority, Status, Category, and Due Date.
- **Interactive Password Visibility Toggle (`Eye` / `EyeOff`)**:
  - Password reveal/mask eye icon across Login, Create User modal, Reset Password, and Profile Change Password views.
- **Real-Time User Notifications & Header Center**:
  - Unread notification badge counter in the top navigation bar.
  - Popover drawer displaying task assignment and status change alerts.
  - Support for **Mark as Read**, **Mark All as Read**, **Individual Delete**, and **Clear All** actions with direct task deep-link navigation.
- **Comprehensive Audit Trail for All CRUD Operations**:
  - **100% of mutating operations** across Tasks, Comments, Attachments, Users, Roles, and Authentication (including password reset requests) are permanently recorded in MySQL `activity_logs` with accurate `userId` actor attribution.
  - Expandable metadata viewer with colored JSON key-value formatting and server-side task-specific filtering (`entityId`).
  - Non-mutating read operations are strictly excluded from audit logging.
- **Optimistic Concurrency Control (OCC)**:
  - Atomic version increments (`version = version + 1 WHERE id = ? AND version = ?`).
  - Automatic rejection of stale concurrent writes with HTTP 409 Conflict and client-side rollback.
- **Code-Splitting, Lazy Loading & Performance Optimization**:
  - React 19 `lazy()` and `<Suspense>` route-level chunking for all view components, cutting initial JavaScript bundle size by **75%** (from 464 kB to 116 kB).
  - Fine-grained Rollup vendor chunking (`vendor-react`, `vendor-dnd`, `vendor-ui`) keeping every chunk below 500 kB with zero build warnings.
- **Enterprise File Logging with Automatic Rotation**:
  - Backend multi-stream logging powered by Pino and `rotating-file-stream`.
  - Operational logs (`combined.log`) and error logs (`error.log`) automatically rotate at 10MB or 1 day with 5-file historical retention, preventing uncontrolled disk growth.
- **Multi-Environment Support (`APP_ENV` & `APP_ENV_MODE`)**:
  - Clean separation across `.env.development`, `.env.production`, and `.env`.
  - Strongly-typed runtime configurations in both backend and frontend.
  - Demo autofill shortcuts automatically hidden in production mode (`!env.isProduction`).
- **Developer Debugging Tools (Dev Mode by Default)**:
  - Backend `pino-pretty` colorized logging and full stack traces on 500 errors in dev mode.
  - Diagnostic endpoints: `GET /api/health` and `GET /api/debug` (runtime metrics, heap memory, DB pool info).
  - Frontend Axios console network telemetry with collapsed groups and millisecond duration timing.
  - Floating bottom-left **`[DEV MODE]` DevTools** drawer with environment info, auth inspection, 1-click token copy, and live diagnostic triggers.
- **Robust Route Guards & Error Handling**:
  - Bidirectional route guards restricting unauthenticated users from private pages and authenticated users from guest pages.
  - Automatic redirect-back to intended URL upon sign-in.
  - Auto-logout on 401 Unauthorized / Token Expired with deduplicated toast notifications.
  - Dedicated **404 Not Found Page** (`NotFoundPage`).
  - Production-only Error Boundaries via `react-error-boundary` (`AppErrorBoundary` and `ModuleErrorBoundary`), bypassing in development to preserve Vite overlays.
- **Centralized Constants & Reusable Lib Utilities**:
  - Strongly-typed `API_ENDPOINTS` with URL builders replacing scattered API paths.
  - Centralized `STORAGE_KEYS`, `APP_ROUTES`, `PAGINATION`, `TASK_PRIORITIES`, and `TASK_CATEGORIES`.
  - Type-safe `lib/storage.ts` wrapper with SSR and JSON safety.
  - Standardized `lib/formatters.ts` (`formatDate`, `formatDateTime`, `formatRelativeTime`, `formatFileSize`, `formatUserInitials`).
  - Reusable `UserAvatar` component with 5 sizes and error-resilient fallback initials.
- **Lightweight Notifications & Dialogs**:
  - Top-right dark theme toast notifications via `sonner`.
  - Single-prompt dark deletion and logout confirmation modals via `sweetalert2`.

---

## 📁 Repository Structure

```
datapure-task-manager/
├── README.md                # Master Fullstack Documentation (This file)
├── datapure_task_manager.postman_collection.json # Complete Postman API Collection (v2.1.0)
├── docker-compose.yml       # Local & cloud fullstack multi-container orchestrator
│
├── backend/                 # Dedicated Node.js + Express + TypeScript Backend
│   ├── .env.development     # Development environment config (APP_ENV=development, ENABLE_DEBUG=true)
│   ├── .env.production      # Production environment config (APP_ENV=production, ENABLE_DEBUG=false)
│   ├── .env.example         # Environment template
│   ├── README.md            # Detailed Backend API, Schema, and Service Guide
│   ├── src/
│   │   ├── config/          # Typed env.ts and MySQL db.ts pool
│   │   ├── controllers/     # Task, Auth, User, Rbac, ActivityLog, Attachment controllers
│   │   ├── database/        # schema.sql, migrate.ts, seed.ts
│   │   ├── errors/          # AppError class hierarchy & error handler
│   │   ├── middlewares/     # authMiddleware, errorHandler, pinoHttp logger
│   │   ├── repositories/    # Parameterized SQL database repositories
│   │   ├── routes/          # Express route declarations (taskRoutes, authRoutes, etc.)
│   │   ├── services/        # Business logic, OCC concurrency, Activity Logging
│   │   ├── types/           # Core domain TypeScript interfaces
│   │   ├── utils/           # Structured pino logger
│   │   ├── app.ts           # Express application setup & middleware assembly
│   │   └── server.ts        # Server entrypoint & graceful shutdown
│   ├── tests/               # Vitest unit & integration test suites
│   ├── package.json         # Standalone backend dependencies & scripts
│   └── tsconfig.json        # TypeScript configuration
│
└── frontend/                # Dedicated React 19 + Vite + Tailwind CSS Frontend
    ├── .env.development     # Frontend dev config (VITE_APP_ENV=development, VITE_ENABLE_DEBUG=true)
    ├── .env.production      # Frontend prod config (VITE_APP_ENV=production, VITE_ENABLE_DEBUG=false)
    ├── .env.example         # Frontend template
    ├── README.md            # Frontend Architecture, Component, and Styling Guide
    ├── src/
    │   ├── components/      # KanbanBoard, TableView, TaskCard, Modals, DevTools, ErrorBoundary, UserAvatar
    │   ├── config/          # Typed frontend env.ts
    │   ├── constants/       # Centralized API_ENDPOINTS, STORAGE_KEYS, APP_ROUTES, PAGINATION
    │   ├── context/         # AuthContext with RBAC permissions
    │   ├── lib/             # formatters.ts (Date/Time/Size), storage.ts (Safe wrapper), classNames.ts
    │   ├── pages/           # LoginPage, RegisterPage, Forgot/ResetPassword, ProfileView, NotFoundPage
    │   ├── services/        # apiClient.ts (Axios with telemetry) and api.ts
    │   ├── types/           # Shared UI interfaces and ActiveTab union
    │   ├── utils/           # asyncUtils (Debounce/Throttle/Abort), themeStyles, confirmModal
    │   ├── App.tsx          # Master routing, route guards, and modal coordinator
    │   └── main.tsx         # React root mounting
    ├── package.json         # Standalone frontend dependencies & scripts
    ├── vite.config.ts       # Vite bundler & proxy configuration
    └── tailwind.config.js   # Dark-first enterprise theme palette
```

---

## 🚀 Running with Docker (Recommended)

Start the entire fullstack system (MySQL 8.0, Backend API, and Frontend SPA) with a single command:

```bash
docker compose up --build
```

- **Frontend Application**: [http://localhost:8080](http://localhost:8080)
- **Backend API**: [http://localhost:8080/api](http://localhost:8080/api)
- **MySQL Database**: `localhost:3306`

---

## 💻 Local Development Setup

### 1. Backend Application:
```bash
cd backend
npm install
npm run db:setup     # Single unified runner: creates DB, 12 schema tables, 3 canonical accounts, RBAC & sprint seed, empty logs
# (Alternatively: `npm run db:migrate` also executes the unified runner)
npm run dev          # Starts tsx watch on http://localhost:5000
```

### 2. Frontend Application:
```bash
cd frontend
npm install
npm run dev          # Starts Vite on http://localhost:5173
```

### 3. Run Automated Tests:

```bash
# Tier 1: Backend Integration & Unit Tests (63 tests)
npm --prefix backend test

# Tier 2: Frontend React Testing Library & Vitest Component Tests (24 tests)
npm --prefix frontend test

# Tier 3: Playwright Real-Browser End-to-End Automation (18 tests across 7 suites)
npm --prefix frontend run test:e2e

# Interactive Playwright Runner with Headed Browser
npm --prefix frontend run test:e2e:headed
```

---

## 🔄 Enterprise GitHub Actions CI/CD Pipelines

Automated pipelines are established under `.github/workflows/`:

- **Continuous Integration (`.github/workflows/ci.yml`)**:
  - **Lint & Typecheck**: Dual-workspace TypeScript strict mode validation (`tsc --noEmit`).
  - **Backend API Suite**: Boots a healthy MySQL 8.0 service container, applies schema migrations, and runs all 63 backend Vitest integration/unit tests.
  - **Frontend RTL Suite**: Runs 24 Vitest & React Testing Library component tests and verifies production bundling.
  - **Playwright Browser E2E**: Builds and runs the full Docker Compose architecture, verifies the live HTTP health check (`/api/health`), installs headless Chromium, runs all 18 Playwright browser tests across 7 comprehensive test suites, dumps Docker logs on failure, and uploads test execution reports as artifacts.

- **Continuous Deployment (`.github/workflows/cd.yml`)**:
  - **Container Packaging**: Builds multi-stage production Docker images for `backend` and `frontend`.
  - **GitHub Container Registry (GHCR)**: Pushes versioned and `latest` tags to `ghcr.io`.
  - **Automated Health Verification**: Runs automated deployment smoke tests validating service uptime.

---

## 🔑 Default Seeded Accounts

| Role | Email | Password | Permissions & Scope |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@datapure.io` | `Admin123!` | Full control: Tasks, Comments, Team Management, RBAC Matrix, Audit Log |
| **Member** | `member@datapure.io` | `Member123!` | Task creation, editing, moving, comments, file attachments, and personal notifications |
| **Viewer** | `viewer@datapure.io` | `Viewer123!` | Read-only board inspection, comment viewing, and member directory browsing |

---

## 🌐 Deployment to Shared Hosting (cPanel / Apache)

1. **MySQL Database**:
   - Create a database in cPanel MySQL Wizard.
   - Run `npm run db:setup` against the target database or import `backend/src/database/schema.sql` via phpMyAdmin.
2. **Node.js Backend**:
   - In cPanel, click **Setup Node.js App** -> Point application startup to `backend/dist/server.js`.
   - Set environment variables in the cPanel GUI (`APP_ENV=production`, `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`).
   - Run `npm run build` in `backend/` and upload `dist/` and `package.json`.
3. **Frontend SPA**:
   - Inside `frontend/`, run `npm run build`.
   - Upload `frontend/dist/` contents into `public_html/`.
   - Ensure `.htaccess` handles API reverse proxying and client-side SPA routing (`FallbackResource /index.html`).

---

## 📬 Postman API Collection

A complete, production-ready Postman collection is included in the project root:
- **File**: [`datapure_task_manager.postman_collection.json`](file:///datapure_task_manager.postman_collection.json)
- **Version**: Postman Collection Schema v2.1.0
- **Total Requests**: 45 endpoints across 10 functional modules:
  1. `01. Diagnostics & Health`: `/health`, `/debug`
  2. `02. Authentication & Account`: `/auth/login`, `/auth/logout`, `/auth/me`, `/auth/profile`, `/auth/profile/avatar`, `/auth/change-password`, `/auth/forgot-password`, `/auth/reset-password`
  3. `03. Sprint Boards`: `/boards/engineering-sprint`, `/boards`
  4. `04. Tasks & OCC Concurrency`: `/tasks` (List, Get, Create, Patch, OCC Move, Delete)
  5. `05. Task Comments Management`: `/tasks/:id/comments` (Add, List), `/tasks/comments/:commentId` (Delete)
  6. `06. Attachments & File Uploads`: `/tasks/:id/attachments` (Multipart), `/attachments/:id/view`, `/attachments/:id/download`, `/attachments/:id` (Delete)
  7. `07. User Management & Directory`: `/users` (Directory, Get, Create, Patch, Avatar, Role, Status, Delete)
  8. `08. Role Governance (RBAC)`: `/rbac/roles`, `/rbac/permissions`, `/rbac/roles` (Create, Update Permissions, Delete)
  9. `09. Activity Audit Logs`: `/activity-logs` (Filtered log search, Task-specific trail)
  10. `10. User Notifications`: `/notifications` (List, Mark Read, Mark All Read, Delete, Clear All)

### 💡 Quick Postman Setup:
1. Open Postman and click **Import** -> Select `datapure_task_manager.postman_collection.json`.
2. The collection uses variables:
   - `{{base_url}}`: defaults to `http://localhost:5000/api`
   - `{{bearer_token}}`: automatically captured and stored upon running the **Login User** request.
3. Simply execute **02. Authentication & Account -> Login User (Auto-stores Bearer Token)**, and all protected endpoints will immediately inherit your authenticated session.

---

## ⚡ Modern Runtime, React 19 & ECMAScript Capabilities

- **Node.js 22 LTS Architecture**:
  - Full adherence to Node.js ESM standards with native `node:` protocol imports (`node:path`, `node:fs`, `node:crypto`, `node:url`).
  - Native `crypto.randomUUID()` for request tracing and secure upload hashing.
  - Native ECMAScript `ErrorOptions` with `cause` preservation in `AppError`.
- **React 18 & 19 Native Primitives**:
  - **`useOptimistic`**: Instant drag-and-drop card movements on the Kanban board with automatic OCC rollback.
  - **`useTransition` with Async Actions**: Seamless non-blocking state updates for modal submits and task moves.
  - **`useDeferredValue`**: Non-blocking responsive search and filter input rendering with visual staleness states.
  - **`useId`**: Deterministic accessibility ID binding between form controls and labels.
  - **Ref as a Prop**: Component `ref` passed directly without legacy `React.forwardRef`.
  - **Document Metadata**: Native `<title>` and `<meta>` hoisting directly from view components.
- **ECMAScript 2023+ Standards**:
  - Immutable array methods: `Array.prototype.toSorted()` and `Array.prototype.toReversed()`.
  - Standard `Object.hasOwn()` property checks and TypeScript target `ES2023`.
- **Optimized Vite Bundles**:
  - Rollup vendor code-splitting (`vendor-react`, `vendor-dnd`, `vendor-ui`) keeping all client chunks under 500 kB with 0 warnings.

---

## ⚖️ License
MIT License.

