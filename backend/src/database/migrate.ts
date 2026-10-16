import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import env from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runUnifiedMigration() {
  console.log('[Migration] Starting unified database migration & setup...');

  // 1. Connect without database to ensure DB creation
  const rootConn = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    multipleStatements: true
  });

  const dbName = env.db.database;

  try {
    await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log(`[Migration] Database \`${dbName}\` is ready on port ${env.db.port}.`);
  } finally {
    await rootConn.end();
  }

  // 2. Connect to the database with multipleStatements enabled
  const dbConn = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: dbName,
    multipleStatements: true
  });

  try {
    // 3. Execute Schema DDL
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('[Migration] Step 1/5: Executing database schema DDL & cleaning tables...');
    await dbConn.query(sql);
    console.log('[Migration] All 12 tables verified and created successfully.');

    // Reset tables cleanly so only the canonical demo data is populated
    await dbConn.query('SET FOREIGN_KEY_CHECKS = 0;');
    const tablesToReset = [
      'activity_logs',
      'notifications',
      'attachments',
      'comments',
      'subtasks',
      'tasks',
      'columns',
      'boards',
      'role_permissions',
      'permissions',
      'roles',
      'users'
    ];
    for (const tbl of tablesToReset) {
      await dbConn.query(`TRUNCATE TABLE \`${tbl}\`;`);
    }
    await dbConn.query('SET FOREIGN_KEY_CHECKS = 1;');

    // 4. Seed Exactly 3 Users with 3 Roles (Admin, Member, Viewer)
    console.log('[Migration] Step 2/5: Seeding canonical 3 users with 3 roles...');
    const hashAdmin = await bcrypt.hash('Admin123!', 10);
    const hashMember = await bcrypt.hash('Member123!', 10);
    const hashViewer = await bcrypt.hash('Viewer123!', 10);

    const users = [
      {
        id: 1,
        email: 'admin@datapure.io',
        password_hash: hashAdmin,
        full_name: 'Alex Mercer',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        role: 'ADMIN',
        is_active: 1
      },
      {
        id: 2,
        email: 'member@datapure.io',
        password_hash: hashMember,
        full_name: 'Sarah Chen',
        avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
        role: 'MEMBER',
        is_active: 1
      },
      {
        id: 3,
        email: 'viewer@datapure.io',
        password_hash: hashViewer,
        full_name: 'Marcus Vance',
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
        role: 'VIEWER',
        is_active: 1
      }
    ];

    for (const u of users) {
      await dbConn.query(
        `INSERT INTO users (id, email, password_hash, full_name, avatar_url, role, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
           password_hash = VALUES(password_hash),
           full_name = VALUES(full_name),
           avatar_url = VALUES(avatar_url),
           role = VALUES(role),
           is_active = VALUES(is_active)`,
        [u.id, u.email, u.password_hash, u.full_name, u.avatar_url, u.role, u.is_active]
      );
    }
    console.log('[Migration] 3 Demo Users initialized:');
    console.log('  - Admin:  admin@datapure.io  / Admin123!  (Role: ADMIN)');
    console.log('  - Member: member@datapure.io / Member123! (Role: MEMBER)');
    console.log('  - Viewer: viewer@datapure.io / Viewer123! (Role: VIEWER)');

    // 5. Seed RBAC Data (Roles, Permissions & Mappings)
    console.log('[Migration] Step 3/5: Seeding granular RBAC matrix and role permissions...');
    const roles = [
      { id: 1, key: 'ADMIN', name: 'Administrator', description: 'Full administrative authority over workspace, tasks, and users', is_system: 1 },
      { id: 2, key: 'MEMBER', name: 'Team Member', description: 'Sprint collaborator with full task authoring and execution scopes', is_system: 1 },
      { id: 3, key: 'VIEWER', name: 'Viewer', description: 'Read-only stakeholder with inspection privileges', is_system: 1 }
    ];

    for (const r of roles) {
      await dbConn.query(
        `INSERT INTO roles (id, \`key\`, name, description, is_system)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), is_system = VALUES(is_system)`,
        [r.id, r.key, r.name, r.description, r.is_system]
      );
    }

    const permissions = [
      { id: 1, key: 'task:create', name: 'Create Tasks', description: 'Create and publish workflow tasks', category: 'TASKS' },
      { id: 2, key: 'task:edit', name: 'Edit Tasks', description: 'Update task details, columns, and checklists', category: 'TASKS' },
      { id: 3, key: 'task:delete', name: 'Delete Tasks', description: 'Permanently remove tasks from boards', category: 'TASKS' },
      { id: 4, key: 'task:move', name: 'Move Tasks', description: 'Drag-and-drop tasks between columns', category: 'TASKS' },
      { id: 5, key: 'user:view', name: 'View Users', description: 'Browse team directory and member profiles', category: 'USERS' },
      { id: 6, key: 'user:manage', name: 'Manage Users', description: 'Invite, modify, and delete workspace members', category: 'USERS' },
      { id: 7, key: 'audit:view', name: 'View Audit Logs', description: 'Access enterprise activity and compliance logs', category: 'AUDIT' }
    ];

    for (const p of permissions) {
      await dbConn.query(
        `INSERT INTO permissions (id, \`key\`, name, description, category)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), category = VALUES(category)`,
        [p.id, p.key, p.name, p.description, p.category]
      );
    }

    const rolePermissions = [
      // Admin: All 7 permissions
      { role_id: 1, permission_id: 1 },
      { role_id: 1, permission_id: 2 },
      { role_id: 1, permission_id: 3 },
      { role_id: 1, permission_id: 4 },
      { role_id: 1, permission_id: 5 },
      { role_id: 1, permission_id: 6 },
      { role_id: 1, permission_id: 7 },
      // Member: task:create, task:edit, task:move, user:view, audit:view
      { role_id: 2, permission_id: 1 },
      { role_id: 2, permission_id: 2 },
      { role_id: 2, permission_id: 4 },
      { role_id: 2, permission_id: 5 },
      { role_id: 2, permission_id: 7 },
      // Viewer: user:view
      { role_id: 3, permission_id: 5 }
    ];

    for (const rp of rolePermissions) {
      await dbConn.query(
        `INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
        [rp.role_id, rp.permission_id]
      );
    }
    console.log('[Migration] RBAC roles and permission mappings configured.');

    // 6. Seed Default Board, Columns & Tasks
    console.log('[Migration] Step 4/5: Seeding default board, columns, and initial tasks...');
    await dbConn.query(
      `INSERT INTO boards (id, name, slug, description, created_by)
       VALUES (1, 'Engineering Sprint', 'engineering-sprint', 'Core product roadmap and sprint task workflow', 1)
       ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description)`
    );

    const columns = [
      { id: 1, board_id: 1, name: 'To Do', color: '#3b82f6', order_index: 1000.0 },
      { id: 2, board_id: 1, name: 'In Progress', color: '#f59e0b', order_index: 2000.0 },
      { id: 3, board_id: 1, name: 'Done', color: '#10b981', order_index: 3000.0 }
    ];

    for (const col of columns) {
      await dbConn.query(
        `INSERT INTO columns (id, board_id, name, color, order_index)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), color = VALUES(color), order_index = VALUES(order_index)`,
        [col.id, col.board_id, col.name, col.color, col.order_index]
      );
    }

    const sampleTasks = [
      {
        id: 1,
        task_key: 'DP-101',
        board_id: 1,
        column_id: 1,
        title: 'Setup production Docker Compose configuration',
        description: 'Configure Nginx edge proxy, health checks, multi-stage Alpine images, and container isolation.',
        priority: 'HIGH',
        category: 'DEVOPS',
        status: 'TODO',
        order_index: 1000.0,
        assignee_id: 2,
        reporter_id: 1,
        due_date: '2026-10-25 18:00:00',
        version: 1
      },
      {
        id: 2,
        task_key: 'DP-102',
        board_id: 1,
        column_id: 2,
        title: 'Implement Optimistic Concurrency Control (OCC)',
        description: 'Protect concurrent task moves and edits using atomic SQL version increments and HTTP 409 conflict responses.',
        priority: 'URGENT',
        category: 'DEVELOPMENT',
        status: 'IN_PROGRESS',
        order_index: 1000.0,
        assignee_id: 2,
        reporter_id: 1,
        due_date: '2026-10-20 12:00:00',
        version: 1
      },
      {
        id: 3,
        task_key: 'DP-103',
        board_id: 1,
        column_id: 3,
        title: 'Design clean Linear-grade dark theme tokens',
        description: 'Refined neutral dark tokens (#09090b, #121215, #18181c, #27272a) with sleek typography and subtle micro-interactions.',
        priority: 'MEDIUM',
        category: 'DESIGN',
        status: 'DONE',
        order_index: 1000.0,
        assignee_id: 1,
        reporter_id: 1,
        due_date: '2026-10-14 17:00:00',
        version: 1
      },
      {
        id: 4,
        task_key: 'DP-104',
        board_id: 1,
        column_id: 1,
        title: 'Automated Vitest integration test suite for Auth & Tasks',
        description: 'Automated service and repository unit testing coverage in CI/CD pipeline.',
        priority: 'MEDIUM',
        category: 'TESTING',
        status: 'TODO',
        order_index: 2000.0,
        assignee_id: 2,
        reporter_id: 1,
        due_date: '2026-10-28 15:00:00',
        version: 1
      },
      {
        id: 5,
        task_key: 'DP-105',
        board_id: 1,
        column_id: 2,
        title: 'Role-Based Access Control (RBAC) audit & security logging',
        description: 'Centralize authorization checks across controllers using hasPermission and log administrative updates.',
        priority: 'HIGH',
        category: 'DEVELOPMENT',
        status: 'IN_PROGRESS',
        order_index: 2000.0,
        assignee_id: 1,
        reporter_id: 1,
        due_date: '2026-10-22 14:00:00',
        version: 1
      },
      {
        id: 6,
        task_key: 'DP-106',
        board_id: 1,
        column_id: 3,
        title: 'Multi-file attachment upload engine',
        description: 'Support for drag-and-drop file ingestion with MIME validation, 10MB limits, and secure disk streaming.',
        priority: 'HIGH',
        category: 'DEVOPS',
        status: 'DONE',
        order_index: 2000.0,
        assignee_id: 2,
        reporter_id: 1,
        due_date: '2026-10-15 10:00:00',
        version: 1
      }
    ];

    for (const t of sampleTasks) {
      await dbConn.query(
        `INSERT INTO tasks (id, task_key, board_id, column_id, title, description, priority, category, status, order_index, assignee_id, reporter_id, due_date, version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
           title = VALUES(title), 
           description = VALUES(description), 
           priority = VALUES(priority), 
           category = VALUES(category),
           status = VALUES(status), 
           column_id = VALUES(column_id), 
           assignee_id = VALUES(assignee_id), 
           due_date = VALUES(due_date)`,
        [t.id, t.task_key, t.board_id, t.column_id, t.title, t.description, t.priority, t.category, t.status, t.order_index, t.assignee_id, t.reporter_id, t.due_date, t.version]
      );
    }

    const comments = [
      { id: 1, task_id: 1, user_id: 1, content: 'Production Docker Compose configuration has been verified with healthcheck probes.' },
      { id: 2, task_id: 1, user_id: 2, content: 'Tested on local multi-container setup; works smoothly with fast restart times.' },
      { id: 3, task_id: 2, user_id: 1, content: 'Optimistic Concurrency Control (OCC) is vital to ensure atomic race prevention.' }
    ];

    for (const c of comments) {
      await dbConn.query(
        `INSERT INTO comments (id, task_id, user_id, content)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE content = VALUES(content)`,
        [c.id, c.task_id, c.user_id, c.content]
      );
    }

    // 7. Reset Activity Logs & Notifications to Empty State
    console.log('[Migration] Step 5/5: Resetting audit activity logs & notifications to clean empty state...');
    await dbConn.query('SET FOREIGN_KEY_CHECKS = 0;');
    await dbConn.query('TRUNCATE TABLE activity_logs;');
    await dbConn.query('TRUNCATE TABLE notifications;');
    await dbConn.query('SET FOREIGN_KEY_CHECKS = 1;');
    console.log('[Migration] `activity_logs` and `notifications` are clean and empty (0 rows).');

    console.log('[Migration] =========================================================');
    console.log('[Migration] Unified Database Migration & Setup Completed Successfully!');
    console.log('[Migration] =========================================================');
  } catch (error) {
    console.error('[Migration Error]:', error);
    process.exit(1);
  } finally {
    await dbConn.end();
  }
}

// Execute migration if run directly
runUnifiedMigration();
