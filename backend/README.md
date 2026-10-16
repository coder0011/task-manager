# DataPure Backend API

A lightweight, enterprise-grade modular monolith built with **Node.js, Express, TypeScript, and MySQL 8.0** using ES Modules (`"type": "module"`).

**Author:** Saurabh Sharma

- **100% Mutating Audit Coverage**: Every state-changing action across Tasks, Comments, Attachments, Users, Roles, and Auth (including password reset requests) is logged to `activity_logs` with actor `userId` attribution.
- **Optimistic Concurrency Control (OCC)**: Atomic version checks prevent concurrent overwrite race conditions.
- **Enterprise Security**: Argon2/Bcrypt password hashing, strict rate-limiting, and sanitized multipart upload handling.

---

## 🚀 Quick Start (Backend Standalone)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (Development mode by default)
cp .env.example .env
# Set your MySQL DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET

# 3. Run Unified Database Migration & Seeding
npm run db:setup     # Single unified runner: creates DB, 12 schema tables, 3 canonical accounts, RBAC & sprint seed, empty logs
# (Alternatively: `npm run db:migrate` also executes the unified runner)

# 4. Run Vitest Unit Tests
npm test

# 5. Start in Development Mode (Live reload with tsx & pino-pretty)
npm run dev

# 6. Build & Start in Production Mode
npm run build
npm start
```
API runs on: `http://localhost:5000`

---

## ⚙️ Environment Configuration & Logging

The backend features strongly-typed runtime configuration via `src/config/env.ts` supporting distinct development and production environments:

- `.env.development`:
  ```ini
  APP_ENV=development
  APP_ENV_MODE=development
  NODE_ENV=development
  ENABLE_DEBUG=true
  LOG_LEVEL=debug
  PORT=5000
  DB_HOST=localhost
  DB_PORT=3306
  DB_USER=root
  DB_PASSWORD=
  DB_NAME=datapure_tasks
  JWT_SECRET=datapure_super_secret_jwt_key_2026_dev
  ```
- `.env.production`:
  ```ini
  APP_ENV=production
  APP_ENV_MODE=production
  NODE_ENV=production
  ENABLE_DEBUG=false
  LOG_LEVEL=info
  PORT=5000
  ...
  ```

### 📝 Rotating File Logger
Operational and error logs are managed by Pino paired with `rotating-file-stream` (`src/utils/logger.ts`):
- `logs/combined.log`: Captures all informational and above level events.
- `logs/error.log`: Captures errors and uncaught exceptions.
- **Rotation Policy**: Files automatically rotate at **10MB** or **1 day** interval, retaining a maximum of **5 historical files** (`combined.log.1`, `combined.log.2`, etc.) to guarantee disk space safety.

---

## 🏗️ Architecture & Design Patterns

1. **Dedicated App & Server Separation**:
   - `src/app.ts`: Express application assembly, security middlewares (`helmet`, `cors`, `express-rate-limit`), body parsers, `/uploads` static file delivery, route mounting, and centralized error handling.
   - `src/server.ts`: HTTP server bootstrap with environment logging, MySQL connection verification, and graceful shutdown handlers (`SIGTERM`, `SIGINT`).
2. **Modular Route Architecture (`src/routes/`)**:
   - `taskRoutes.ts`: Task lifecycle, OCC column moves, task comments, attachments, and deletions. *(Specific sub-resource endpoints precede parametric `/:id` routes to prevent matching collisions).*
   - `authRoutes.ts`: Login, Session profile `GET /api/auth/me`, password changing, and tokenized email password reset.
   - `userRoutes.ts`: Member directory, admin user creation, role modification, account active/suspended toggle, profile updates, and avatar uploads.
   - `notificationRoutes.ts`: User notifications, mark as read, bulk mark-all-read, individual delete, and clear all.
   - `rbacRoutes.ts`: Role-based access control matrix and custom role management.
   - `activityLogRoutes.ts`: Comprehensive audit trail queries with entity filtering and pagination.
   - `boardRoutes.ts`: Sprint boards and workflow column retrieval.
   - `uploadRoutes.ts`: Multi-file drag-and-drop attachments.
3. **Controller-Service-Repository Pattern**:
   - **Controllers**: Parse input schemas (`zod`), invoke services, and deliver RFC-compliant JSON responses.
   - **Services**: Enforce domain logic, OCC concurrency locks, and trigger asynchronous non-blocking activity audit logs for all CRUD operations.
   - **Repositories**: Execute parameterized SQL queries against MySQL connection pool.
4. **Centralized Error Hierarchy (`src/errors/AppError.ts`)**:
   - Standardized error classes: `BadRequestError` (400), `UnauthorizedError` (401), `ForbiddenError` (403), `NotFoundError` (404), `ConflictError` / `ConcurrencyConflictError` (409), `ValidationError` (422).
   - `errorHandler.ts`: Delivers uniform JSON error structures, suppresses internal stack traces in production, and provides detailed debug stacks when `ENABLE_DEBUG=true`.
   - `TokenExpiredError`: Detected by `authMiddleware` and returned as `"API token expired. Please sign in again."` for client auto-logout triggers.

---

## 📡 API Endpoint Catalog

Base URL: `http://localhost:5000/api`

| Method | Endpoint | Description | Auth Level |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/health` | Healthcheck (status, uptime, appEnv, appEnvMode, debugMode) | Public |
| **GET** | `/api/debug` | Runtime metrics, heap memory, OS, DB pool config (Dev only) | Dev / Public |
| **POST** | `/api/auth/login` | Login and acquire JWT bearer token | Public |
| **POST** | `/api/auth/logout` | Terminate session, clear HTTP-only cookies, and emit audit log | Bearer Token |
| **POST** | `/api/auth/forgot-password` | Request password reset token via HTML email | Public |
| **POST** | `/api/auth/reset-password` | Verify token and reset account password | Public |
| **GET** | `/api/auth/me` | Current authenticated user profile | Bearer Token |
| **PATCH**| `/api/auth/profile` | Update profile display name | Bearer Token |
| **POST** | `/api/auth/profile/avatar` | Upload avatar picture (`image/png`, `jpeg`, `webp`) | Bearer Token |
| **POST** | `/api/auth/change-password` | Change account password | Bearer Token |
| **GET** | `/api/boards/:slug?` | Fetch sprint board, workflow columns, and tasks | Optional |
| **GET** | `/api/tasks` | Server-side paginated/sorted/filtered task query | Optional |
| **GET** | `/api/tasks/:id` | Fetch single task with comments & attachments | Optional |
| **POST** | `/api/tasks` | Create new task (initial version = 1) | Member / Admin |
| **PATCH** | `/api/tasks/:id/move` | Move column / reorder under OCC atomic check | Member / Admin |
| **PATCH** | `/api/tasks/:id` | Update task title, description, priority, category | Member / Admin |
| **DELETE**| `/api/tasks/:id` | Permanently delete a task | Member / Admin |
| **GET** | `/api/tasks/:id/comments` | Retrieve threaded discussion comments for a task | Optional / Auth |
| **POST** | `/api/tasks/:id/comments` | Post a new comment on a task | Member / Admin |
| **DELETE**| `/api/tasks/comments/:commentId` | Delete a comment (author or Admin only) | Member / Admin |
| **POST** | `/api/tasks/:id/attachments` | Upload attachments (Multer, up to 5 files / 10MB) | Member / Admin |
| **GET**  | `/api/attachments/:id/view` | View uploaded file attachment inline in browser | Optional / Auth |
| **GET**  | `/api/attachments/:id/download` | Download uploaded file attachment as binary stream | Optional / Auth |
| **DELETE**| `/api/attachments/:id` | Delete attachment and unlink file on disk | Member / Admin |
| **GET** | `/api/users` | List organization team members (paginated & filtered) | Bearer Token |
| **GET** | `/api/users/:id` | Fetch specific team member profile by ID | Bearer Token |
| **POST** | `/api/users` | Create new team member (Admin provisioning) | Admin Only |
| **PATCH** | `/api/users/:id` | Update team member name, email, or profile fields | Admin Only |
| **POST** | `/api/users/:id/avatar` | Upload avatar image for team member | Admin Only |
| **PATCH** | `/api/users/:id/role` | Modify member role (`ADMIN`, `MEMBER`, `VIEWER` or custom) | Admin Only |
| **PATCH** | `/api/users/:id/status`| Activate or suspend member account | Admin Only |
| **DELETE**| `/api/users/:id` | Remove user from organization | Admin Only |
| **GET** | `/api/notifications` | Fetch unread & historical user notifications | Bearer Token |
| **PATCH**| `/api/notifications/:id/read` | Mark individual notification as read | Bearer Token |
| **POST** | `/api/notifications/mark-all-read` | Mark all user notifications as read | Bearer Token |
| **DELETE**| `/api/notifications/:id` | Delete individual notification | Bearer Token |
| **DELETE**| `/api/notifications` | Bulk clear all user notifications | Bearer Token |
| **GET** | `/api/rbac/roles` | List all roles with assigned permission strings | Bearer Token |
| **GET** | `/api/rbac/permissions` | List all available system permissions | Bearer Token |
| **POST** | `/api/rbac/roles` | Create custom role with unique key and permissions | Admin Only |
| **PUT / PATCH** | `/api/rbac/roles/:id/permissions` | Update permissions assigned to a role | Admin Only |
| **DELETE**| `/api/rbac/roles/:id` | Delete custom role | Admin Only |
| **GET** | `/api/activity-logs` | Retrieve audit history with entity filters & pagination | Bearer Token |

---

## 📬 Postman API Collection

A complete, production-ready Postman collection is available at the project root:
- **File**: `../datapure_task_manager.postman_collection.json`
- **Schema**: Postman Collection Schema v2.1.0
- **Total Requests**: 45 endpoints across all 10 backend modules
- **Authentication**: Pre-configured login test script auto-saves `{{bearer_token}}` into collection variables.

---

## 🔒 Concurrency & Race Condition Handling (OCC)

When multiple team members drag or update tasks simultaneously:
1. Every task record maintains an integer `version` column (starts at `1`).
2. Every state change enforces atomic version verification:
   ```sql
   UPDATE tasks
   SET column_id = ?, order_index = ?, version = version + 1, updated_at = NOW()
   WHERE id = ? AND version = ?;
   ```
3. If `affectedRows === 0`, concurrent edits are detected, the write is aborted, and the server returns **HTTP 409 Conflict** (`{ "isConcurrencyConflict": true }`).
4. The client rolls back its local card position and re-syncs state from the server.

---

## 🧪 Unit & Integration Testing (Vitest)

Unit tests run in pure memory with mock repositories, executing in `<1s`:
```bash
npm test
```
Covered suites (63 tests across 6 suites):
- `tests/all-modules.e2e.spec.ts`: End-to-end integration across auth, OCC tasks, comments, attachments, RBAC matrix, and audit logging (42 tests).
- `tests/taskService.spec.ts`: OCC version incrementation, stale write 409 rejection, move validation.
- `tests/userService.spec.ts`: User directory, role assignment, active/suspended toggling, self-demotion guards.
- `tests/rbacService.spec.ts`: Role-based permission checks and custom role creation.
- `tests/activityLogService.spec.ts`: Audit trail logging and non-blocking asynchronous persistence.
- `tests/notificationService.spec.ts`: Notification creation, status-change triggers, read toggling, single deletion, and bulk clearing.

---

## ⚡ Modern Node.js 22 & ECMAScript Features

The backend leverages modern Node.js 22 LTS and modern ECMAScript standards:
- **`node:` Protocol Imports**: Standardized across all native modules (`node:path`, `node:fs`, `node:fs/promises`, `node:crypto`, `node:url`).
- **Native UUID Generation**: `node:crypto`'s `randomUUID()` powers request ID correlation and secure file name hashing.
- **Modern Error Chaining**: `AppError` supports ECMAScript `ErrorOptions` with `cause` preservation for root-cause tracing.
- **Express Standard Chaining**: Explicit `res.status(code).json(payload)` across all controllers and error handling middlewares.
- **Target `ES2022` with NodeNext Resolution**: Fully typed ES module imports with `.js` extensions adhering to Node.js ESM specification.

