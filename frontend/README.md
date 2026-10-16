# DataPure Frontend App

A high-performance, dark-first enterprise task manager and sprint board built with **React 19, Vite, TypeScript, Tailwind CSS, Axios, and `@dnd-kit`**.

**Author:** Saurabh Sharma

- **Modular Domain Services & Deduplication**: Services organized into domain modules (`authService`, `boardService`, `taskService`, `userService`, `rbacService`, `activityLogService`, `notificationService`) with `apiDeduplicator.ts` caching in-flight GET requests.
- **Component-Wise CSS Segregation**: Dedicated CSS files co-located with components and automatically code-split into discrete CSS chunks by Vite.
- **Enterprise Async Performance**: Debounced inputs (`useDebounce`), in-flight request cancellation (`useAbortController`), and event throttling (`throttle`).
- **Modern Password Recovery**: Email-driven reset link flow with seamless background token validation.

---

## 🚀 Quick Start (Frontend Standalone)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (Development mode by default)
cp .env.example .env
# Default: VITE_API_URL=http://localhost:5000/api

# 3. Start Vite Dev Server (Live HMR with embedded DevTools)
npm run dev

# 4. Build for Production (TypeScript validation & optimized bundle)
npm run build

# 5. Preview Production Build
npm run preview
```
Application runs on: `http://localhost:5173`

---

## ⚙️ Environment Configuration

Typed runtime configuration is provided in `src/config/env.ts` referencing environment variables:

- `.env.development`:
  ```ini
  VITE_APP_ENV=development
  VITE_APP_ENV_MODE=development
  VITE_ENABLE_DEBUG=true
  VITE_API_URL=http://localhost:5000/api
  VITE_APP_NAME="DataPure Task Manager [DEV]"
  VITE_ENABLE_ANALYTICS=false
  ```
- `.env.production`:
  ```ini
  VITE_APP_ENV=production
  VITE_APP_ENV_MODE=production
  VITE_ENABLE_DEBUG=false
  VITE_API_URL=/api
  VITE_APP_NAME="DataPure Task Manager"
  VITE_ENABLE_ANALYTICS=true
  ```

---

## ✨ Features & Architecture

### 1. Dual Workflow Modes
- **Kanban Board (`KanbanBoard.tsx`)**:
  - Smooth drag-and-drop powered by `@dnd-kit`.
  - Column quick task creation (`+`).
  - Card-level Edit (`Edit3`) and Delete (`Trash2`) buttons.
  - Optimistic concurrency control (OCC) rollback protection.
- **Table View (`TableView.tsx`)**:
  - Displays newly created and updated records first by default (`created_at` DESC, `updated_at` DESC).
  - Server-side sorting on Created, Updated, Issue Key, Title, Category, Status, Priority, and Due Date.
  - Server-side pagination with items-per-page selector (10, 20, 50, 100).
  - Copy icon action for Issue Key and Title with hover tooltips and truncation.
  - **Fixed-Position Three-Dot Action Menu**: Renders outside table DOM hierarchy via dynamically calculated coordinates to eliminate container clipping on Row 1.
- **TanStack Query v5 State Management**:
  - Integrated `@tanstack/react-query` v5 for high-efficiency query caching, background pre-fetching, and instant tab transitions without manual page refreshes.

### 2. Dedicated View & Edit Modals
- **View Modal (`TaskDetailModal.tsx`)**:
  - Dedicated comprehensive task inspection triggered on task click.
  - Assigned members, file attachments with direct download links, and status tags.
  - **Task Comments & Discussion Thread**: Real-time collaborative discussion thread with author avatars, role badges, relative timestamps, threaded deletion (with role-based access for author/admin), and an inline responsive comment composer.
  - **Activity & Status History**: Filtered, human-readable audit timeline tracking status transitions, comments, attachment events, and assignment updates.
- **Edit Modal (`TaskModal.tsx`)**:
  - Distinct modal for updating task metadata, priority, status, due date, and assignees.
  - Multi-file drag-and-drop dropzone with file picker fallback.

### 3. User Avatars & Interactive Profiles
- **Profile Management (`ProfileView.tsx`)**: Upload profile pictures (`POST /api/users/avatar`), update display name, and change account password with interactive password visibility toggles.
- **Interactive User Details (`UserDetailModal.tsx`)**: Clicking any user avatar or name across the app (Kanban cards, Table rows, Detail modal, or Audit history) opens an informative user pop-up.
- **Interactive Password Visibility Toggle (`Eye` / `EyeOff`)**: Reveal and hide password toggles across Login, Create User dialog, Reset Password, and Profile Change Password forms.

### 4. Developer Debugging Suite (Dev Mode by Default)
- **Axios HTTP Telemetry (`apiClient.ts`)**: Automatically logs collapsed, color-coded browser console groups with request URLs, parameters, payloads, response headers, and duration (ms).
- **Embedded DevTools Drawer (`DevTools.tsx`)**:
  - Floating bottom-left badge (`[DEV MODE]`) opening a dark glassmorphism drawer.
  - **Environment Tab**: Displays active `APP_ENV`, `APP_ENV_MODE`, `DEBUG_TOOLS`, `API_BASE_URL`.
  - **Auth State Tab**: Displays active user, email, role, with 1-click JWT Token copy and cache/session clearing.
  - **Backend & Metrics Tab**: Live interactive "Ping Health" and "Inspect /debug" triggers.
  - **Zero Production Overhead**: Returns `null` when `VITE_ENABLE_DEBUG=false` or in production.

### 5. Security, Route Guards & 404 Routing
- **Bidirectional Route Restrictions**:
  - Unauthenticated users attempting to access authenticated pages (`/`, `/team`, `/rbac`, `/audit`, `/profile`) are immediately redirected to `/login`.
  - Authenticated users attempting to visit guest routes (`/login`, `/forgot-password`, `/reset-password`) are automatically redirected to `/` (Board).
  - Public registration is disabled; team member accounts are managed securely by administrators via the Team Management interface.
- **Production Credential Guarding**:
  - Quick Demo 1-click login buttons are automatically hidden in production mode (`!env.isProduction`).
- **Redirect Back on Unauthorized Access**:
  - Preserves intended URL in `sessionStorage` and URL query params (`?redirect=...`).
  - Upon sign-in, automatically redirects the user directly back to the requested page.
- **Auto-Logout on 401 & Token Expiry**:
  - Intercepts 401 Unauthorized, cleans `localStorage`, dispatches `datapure:unauthorized`, and triggers single deduplicated toast.
  - Sonner fixed ID prevents duplicate toast spam during concurrent 401 queries.
- **Dedicated 404 Page (`NotFoundPage.tsx`)**:
  - Dark enterprise 404 page for unmapped URLs with "Return to Board" and "Go to Sign In" actions.
- **Production-Only Error Boundaries (`ErrorBoundary.tsx`)**:
  - Uses `react-error-boundary`.
  - `AppErrorBoundary` wraps root tree; `ModuleErrorBoundary` wraps individual views.
  - Strictly bypassed in development mode so native Vite error overlays and stack traces remain accessible.

### 6. Notifications & Confirmation Dialogs
- **Header Notification Center (`NotificationPopover.tsx`)**:
  - Bell icon with real-time unread badge counter in top navigation.
  - Displays instant alerts for task assignment and status updates.
  - Actions: **Mark as Read**, **Mark All as Read**, **Individual Delete** (trash button), and **Clear All** (bulk wipe).
- **Toast Notifications (`sonner`)**: Top-right dark theme toasts with status icons across all CRUD actions.
- **Confirmation Modals (`sweetalert2`)**: Custom dark dialogs for deleting tasks, comments, attachments, members, and signing out.

### 7. Performance, Code Splitting & Lazy Loading
- **View-Level Lazy Loading (`React.lazy` + `Suspense`)**:
  - All heavy view components (`KanbanBoard`, `TableView`, `UserManagement`, `RbacMatrixView`, `ActivityAuditView`, `ProfileView`, `ForgotPasswordPage`, `ResetPasswordPage`) are dynamically imported on-demand.
  - Reduced initial bundle entrypoint size by **75%** (from 464 kB to 116 kB), enabling near-instant First Contentful Paint (FCP).
  - Smooth loading state handled by centralized `PageSkeletonLoader`.
- **Targeted Vendor Chunking (`vite.config.ts`)**:
  - `vendor-react`: `@casl/ability`, `@casl/react`, `lucide-react`, `clsx`, `tailwind-merge`
  - `vendor-dnd`: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
  - `vendor-ui`: `sweetalert2`, `sonner`, `axios`
  - Every asset stays comfortably under 500 kB with zero bundler warnings.

### 8. Centralized Constants, Lib Utilities & Reusable Components
- **Centralized API Endpoints (`src/constants/endpoints.ts`)**:
  - Replaces hardcoded URL strings with strongly-typed constants and dynamic URL builders (`API_ENDPOINTS.TASKS.BY_ID(id)`, `API_ENDPOINTS.BOARDS.BY_SLUG(slug)`, `API_ENDPOINTS.COMMENTS.BY_TASK(id)`, `API_ENDPOINTS.NOTIFICATIONS.MARK_READ(id)`, etc.).
- **Application Constants (`src/constants/appConstants.ts`)**:
  - Centralized single source of truth for `STORAGE_KEYS`, `CUSTOM_EVENTS`, `APP_ROUTES`, `PAGINATION` (`DEFAULT_PAGE`, `DEFAULT_LIMIT`, `PAGE_SIZE_OPTIONS`), `TASK_PRIORITIES`, `TASK_CATEGORIES`, `TASK_STATUSES`, `USER_ROLES`, and `FILE_UPLOAD_LIMITS`.
- **Formatting Utilities (`src/lib/formatters.ts`)**:
  - `formatDate(date, style)`: Formats dates as 'short' ("Nov 15"), 'medium' ("Nov 15, 2026"), 'full', or 'input'.
  - `formatDateTime(date)`: Standardized timestamp formatter ("Nov 15, 06:30 PM").
  - `formatRelativeTime(date)`: Human relative time ("Just now", "5m ago", "2h ago", "in 3 days").
  - `formatFileSize(bytes)`: Byte formatting (B, KB, MB, GB).
  - `formatUserInitials(name)`: Robust initials extractor from full name strings with uppercase fallback.
  - `truncateText(text, maxLength)`: Safe string truncation with ellipsis.
- **Type-Safe Storage Utility (`src/lib/storage.ts`)**:
  - SSR-safe, error-handled wrapper for `localStorage` and `sessionStorage` with automatic JSON parsing and fallback defaults.
  - Dedicated authentication session helpers: `getToken()`, `setToken()`, `getUser()`, `setUser()`, `clearAuthSession()`, `getRedirectAfterLogin()`, `setRedirectAfterLogin()`.
- **Conditional Class Names (`src/lib/classNames.ts`)**:
  - Lightweight `cn(...classes)` utility for joining conditional Tailwind classes cleanly.
- **Reusable `UserAvatar` Component (`src/components/UserAvatar.tsx`)**:
  - Unified avatar rendering across Kanban Cards, Table rows, Detail Modal, Header, User Management, and Activity Logs.
  - Supports 5 standardized sizes (`xs`, `sm`, `md`, `lg`, `xl`), theme accents, automatic image error detection falling back to user initials, and optional click navigation.
  - Supports React 19 direct `ref` prop without `forwardRef`.

---

## ⚡ React 18 & 19 Hooks and Modern ECMAScript Features

The frontend leverages the latest React 18/19 primitives and ES2023+ specifications:
- **`useOptimistic` (React 19)**:
  - Employed in `KanbanBoard.tsx`: Dragging tasks between workflow columns renders instantaneous card moves with optimistic state, rolling back seamlessly if the server detects a concurrency conflict.
- **`useTransition` with Async Actions (React 19)**:
  - Employed in `App.tsx`, `KanbanBoard.tsx`, and `TaskModal.tsx`: Async mutations and task movements run inside non-blocking transitions with native `isPending` state handling.
- **`useDeferredValue` (React 18/19)**:
  - Employed in `FilterBar.tsx`: Keeps the search input responsive and silky smooth by deferring heavy filtered list re-computations with visual staleness indicators.
- **`useId` (React 18/19)**:
  - Employed in `TaskModal.tsx` and `FilterBar.tsx`: Generates deterministic, accessible unique element IDs for form inputs and ARIA labels (`htmlFor`, `aria-labelledby`).
- **Ref as a Prop (React 19)**:
  - Function components such as `UserAvatar.tsx` accept `ref` directly as a prop without needing legacy `React.forwardRef()`.
- **Native Document Metadata (React 19)**:
  - Direct `<title>` and `<meta>` hoisting inside `App.tsx` and view components.
- **Immutable ECMAScript 2023 Array Methods**:
  - `Array.prototype.toSorted()` replaces mutable `.sort()` across Kanban and Table rendering paths.
  - `Array.prototype.toReversed()` replaces mutable `.reverse()`.
- **Target `ES2023` in `tsconfig.json` & Rollup Vendor Chunking**:
  - Vite splits bundles into `vendor-react`, `vendor-dnd`, `vendor-ui`, and view chunks keeping all outputs under 500 kB with zero build warnings.

---

## 🧪 Automated Testing Suite

The frontend includes a two-tier enterprise testing architecture:

### 1. Component & State Unit Tests (React Testing Library + Vitest)
Executes isolated component rendering, user interactions, context evaluation, and storage lifecycle tests in a `jsdom` simulated DOM environment:
```bash
# Run unit & component test suite
npm test

# Run tests in watch mode
npm run test:watch
```
**Coverage**:
- `TaskCard.test.tsx`: Card presentation, comments badge, priority indicator, keyboard activation.
- `TaskDetailModal.test.tsx`: Modal lifecycle, discussion threads, commenting form, close callback.
- `TableView.test.tsx`: Table layout, headers, cell truncation, task selection.
- `AuthContext.test.tsx`: Session hydration, login, logout, RBAC permissions resolution.
- `storage.test.ts`: Local and session storage wrappers, token serialization.

### 2. Real-Browser End-to-End Automation (Playwright)
Executes real browser automation in Chromium against the live deployment (`http://localhost:8080` or local dev server):
```bash
# Run all Playwright E2E browser tests headlessly
npm run test:e2e

# Run Playwright tests with interactive browser UI
npm run test:e2e:headed

# Open the HTML test execution report
npm run test:e2e:report
```
**E2E Test Suites (18 tests across 7 suites)**:
- `01-auth.spec.ts`: Form validation, invalid credentials rejection, admin login, session persistence across reload.
- `02-kanban-board.spec.ts`: Board columns rendering, live debounced search filtering, Kanban/Table view toggle.
- `03-task-lifecycle.spec.ts`: Task modal creation, board insertion, detail modal inspection.
- `04-discussion-comments.spec.ts`: Comment submission, author avatar & role badge, SweetAlert2-guarded deletion.
- `05-notifications.spec.ts`: Header drawer toggle, bulk mark-as-read, task navigation, and clear-all.
- `06-rbac-and-admin-views.spec.ts`: Team directory, RBAC governance matrix, and Audit trail navigation.
- `07-tanstack-query-and-tab-switching.spec.ts`: Zero-reload tab transitions, background server-cache invalidation, and real-time board mutation sync.

---

## 🎨 Keyboard Shortcuts

| Key | Action | Description |
| :--- | :--- | :--- |
| `Ctrl + N` | Create Task | Opens the task creation modal from anywhere on the board |
| `Esc` | Close Modal | Dismisses any open modal or pop-up drawer |
| `Tab` | Accessible Nav | Seamless focus management across all interactive controls |


