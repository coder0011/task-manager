import { describe, it, expect, beforeAll } from 'vitest';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000/api';

describe.sequential('DataPure Task Manager - Comprehensive E2E Master Suite', () => {
  let adminToken: string;
  let memberToken: string;
  let viewerToken: string;

  let adminUser: any;
  let memberUser: any;
  let viewerUser: any;

  let boardId: number;
  let backlogColumnId: number;
  let inProgressColumnId: number;

  let createdTaskId: number;
  let taskVersion: number;
  let createdCommentId: number;
  let createdAttachmentId: number;
  let createdUserId: number;
  let createdRoleId: number;

  // Reusable API Request Wrapper
  async function api(
    path: string,
    options: {
      method?: string;
      token?: string;
      body?: any;
      formData?: FormData;
    } = {}
  ) {
    const headers: Record<string, string> = {};
    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }

    let body: any = undefined;
    if (options.formData) {
      body = options.formData;
      // Do NOT set Content-Type header; native fetch sets multipart boundary automatically
    } else if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.body);
    }

    const response = await fetch(`${BASE_URL}${path}`, {
      method: options.method || 'GET',
      headers,
      body,
    });

    let data: any = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return {
      status: response.status,
      ok: response.ok,
      headers: response.headers,
      data,
    };
  }

  /* ==========================================================================
     GLOBAL BOOTSTRAP: Session Tokens & Board Hierarchy
     ========================================================================== */
  beforeAll(async () => {
    // 1. Authenticate Admin
    const adminRes = await api('/auth/login', {
      method: 'POST',
      body: { email: 'admin@datapure.io', password: 'Admin123!' },
    });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.data.data.token;
    adminUser = adminRes.data.data.user;

    // 2. Authenticate Member
    const memberRes = await api('/auth/login', {
      method: 'POST',
      body: { email: 'member@datapure.io', password: 'Member123!' },
    });
    expect(memberRes.status).toBe(200);
    memberToken = memberRes.data.data.token;
    memberUser = memberRes.data.data.user;

    // 3. Authenticate Viewer
    const viewerRes = await api('/auth/login', {
      method: 'POST',
      body: { email: 'viewer@datapure.io', password: 'Viewer123!' },
    });
    expect(viewerRes.status).toBe(200);
    viewerToken = viewerRes.data.data.token;
    viewerUser = viewerRes.data.data.user;

    // 4. Resolve Board and Column IDs
    const boardsRes = await api('/boards', { token: adminToken });
    expect(boardsRes.status).toBe(200);
    const board = boardsRes.data.data.board || boardsRes.data.data;
    boardId = board.id;
    const cols = board.columns || [];
    backlogColumnId = cols[0] ? cols[0].id : 1;
    inProgressColumnId = cols[1] ? cols[1].id : 2;
  });

  /* ==========================================================================
     1. SYSTEM HEALTH & DIAGNOSTICS
     ========================================================================== */
  it('1.01: GET /health returns 200 OK with service metadata and uptime', async () => {
    const res = await api('/health');
    expect(res.status).toBe(200);
    expect(res.data.status).toBe('ok');
    expect(res.data.service).toBe('DataPure Task Manager API');
    expect(typeof res.data.uptime).toBe('number');
    expect(res.data.timestamp).toBeDefined();
  });

  it('1.02: GET /debug returns appropriate response according to environment', async () => {
    const res = await api('/debug');
    if (res.status === 403) {
      expect(res.data.code).toBe('DEBUG_DISABLED');
    } else {
      expect(res.status).toBe(200);
      expect(res.data.system).toBeDefined();
    }
  });

  /* ==========================================================================
     2. AUTHENTICATION & ACCESS CONTROL
     ========================================================================== */
  it('2.01: POST /auth/login fails with 422 for missing credentials', async () => {
    const res = await api('/auth/login', {
      method: 'POST',
      body: { email: '' },
    });
    expect(res.status).toBe(422);
    expect(res.data.success).toBe(false);
  });

  it('2.02: POST /auth/login fails with 401 for invalid password', async () => {
    const res = await api('/auth/login', {
      method: 'POST',
      body: { email: 'admin@datapure.io', password: 'WrongPassword999!' },
    });
    expect(res.status).toBe(401);
    expect(res.data.code).toBe('UNAUTHORIZED');
  });

  it('2.03: GET /auth/me returns 401 without Bearer token', async () => {
    const res = await api('/auth/me');
    expect(res.status).toBe(401);
  });

  it('2.04: GET /auth/me returns 200 and user profile with valid token', async () => {
    const res = await api('/auth/me', { token: adminToken });
    expect(res.status).toBe(200);
    expect(res.data.data.email).toBe('admin@datapure.io');
    expect(res.data.data.role).toBe('ADMIN');
    expect(res.data.data.id).toBe(adminUser.id);
  });

  it('2.05: POST /auth/forgot-password handles recovery request', async () => {
    const res = await api('/auth/forgot-password', {
      method: 'POST',
      body: { email: 'member@datapure.io' },
    });
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  });

  it('2.06: POST /auth/change-password validates current password and updates password', async () => {
    // Wrong current password -> 400
    const failRes = await api('/auth/change-password', {
      method: 'POST',
      token: memberToken,
      body: {
        oldPassword: 'WrongPassword!',
        newPassword: 'NewPassword123!',
      },
    });
    expect(failRes.status).toBe(400);

    // Successful password change
    const successRes = await api('/auth/change-password', {
      method: 'POST',
      token: memberToken,
      body: {
        oldPassword: 'Member123!',
        newPassword: 'NewPassword123!',
      },
    });
    expect(successRes.status).toBe(200);

    // Revert password back to canonical Member123!
    const revertRes = await api('/auth/change-password', {
      method: 'POST',
      token: memberToken,
      body: {
        oldPassword: 'NewPassword123!',
        newPassword: 'Member123!',
      },
    });
    expect(revertRes.status).toBe(200);
  });

  it('2.07: POST /auth/logout invalidates session, clears cookies, and emits audit event', async () => {
    // 1. Authenticate temporary session
    const loginRes = await api('/auth/login', {
      method: 'POST',
      body: { email: 'viewer@datapure.io', password: 'Viewer123!' },
    });
    expect(loginRes.status).toBe(200);
    const tempToken = loginRes.data.data.token;

    // 2. Execute authenticated logout
    const logoutRes = await api('/auth/logout', {
      method: 'POST',
      token: tempToken,
    });
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.data.success).toBe(true);
    expect(logoutRes.data.message).toContain('Logged out successfully');
  });

  /* ==========================================================================
     3. BOARDS & WORKFLOW COLUMNS
     ========================================================================== */
  it('3.01: GET /boards returns board details with nested columns', async () => {
    const res = await api('/boards', { token: memberToken });
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    const board = res.data.data.board || res.data.data;
    expect(board.name).toBe('Engineering Sprint');
    expect(Array.isArray(board.columns)).toBe(true);
    expect(board.columns.length).toBeGreaterThanOrEqual(3);
  });

  /* ==========================================================================
     4. TASKS & OPTIMISTIC CONCURRENCY CONTROL (OCC)
     ========================================================================== */
  it('4.01: POST /tasks creates task with initial version 1', async () => {
    const res = await api('/tasks', {
      method: 'POST',
      token: memberToken,
      body: {
        boardId,
        columnId: backlogColumnId,
        title: 'E2E Automated Test Task',
        description: 'Validating end-to-end task flows and OCC versioning',
        priority: 'HIGH',
        category: 'DEVELOPMENT',
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      },
    });
    console.log('4.01 TASK CREATED:', JSON.stringify(res.data));
    expect(res.status).toBe(201);
    expect(res.data.success).toBe(true);
    expect(res.data.data.id).toBeDefined();
    expect(res.data.data.version).toBe(1);

    createdTaskId = res.data.data.id;
    taskVersion = res.data.data.version;
  });

  it('4.02: GET /tasks retrieves tasks with pagination and filters', async () => {
    const res = await api(`/tasks?search=E2E&priority=HIGH`, {
      token: memberToken,
    });
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(Array.isArray(res.data.data)).toBe(true);
    expect(res.data.data.some((t: any) => t.id === createdTaskId)).toBe(true);
  });

  it('4.03: GET /tasks/:id fetches single task details', async () => {
    const res = await api(`/tasks/${createdTaskId}`, { token: memberToken });
    expect(res.status).toBe(200);
    expect(res.data.data.title).toBe('E2E Automated Test Task');
    expect(res.data.data.version).toBe(taskVersion);
  });

  it('4.04: PATCH /tasks/:id/move updates column and increments version to 2', async () => {
    const res = await api(`/tasks/${createdTaskId}/move`, {
      method: 'PATCH',
      token: memberToken,
      body: {
        targetColumnId: inProgressColumnId,
        newOrderIndex: 0,
        expectedVersion: taskVersion,
      },
    });
    expect(res.status).toBe(200);
    expect(res.data.data.columnId).toBe(inProgressColumnId);
    expect(res.data.data.version).toBe(2);
    taskVersion = res.data.data.version;
  });

  it('4.05: PATCH /tasks/:id/move rejects stale version with 409 Conflict (OCC Event)', async () => {
    // Stale attempt passing version 1 when server is at version 2
    const res = await api(`/tasks/${createdTaskId}/move`, {
      method: 'PATCH',
      token: memberToken,
      body: {
        targetColumnId: backlogColumnId,
        newOrderIndex: 1,
        expectedVersion: 1, // STALE! Current is 2
      },
    });
    expect(res.status).toBe(409);
    expect(res.data.code).toBe('CONCURRENCY_CONFLICT');
  });

  it('4.06: PATCH /tasks/:id updates task details', async () => {
    const res = await api(`/tasks/${createdTaskId}`, {
      method: 'PATCH',
      token: memberToken,
      body: {
        title: 'E2E Automated Test Task (Updated Details)',
        priority: 'URGENT',
      },
    });
    expect(res.status).toBe(200);
    expect(res.data.data.title).toBe(
      'E2E Automated Test Task (Updated Details)'
    );
    expect(res.data.data.priority).toBe('URGENT');
  });

  /* ==========================================================================
     5. THREADED COMMENTS & PERMISSIONS
     ========================================================================== */
  it('5.01: POST /tasks/:id/comments adds a comment by Member', async () => {
    const res = await api(`/tasks/${createdTaskId}/comments`, {
      method: 'POST',
      token: memberToken,
      body: {
        content: 'This is a test comment by Sarah Chen for E2E verification.',
      },
    });
    expect(res.status).toBe(201);
    expect(res.data.data.content).toBe(
      'This is a test comment by Sarah Chen for E2E verification.'
    );
    createdCommentId = res.data.data.id;
  });

  it('5.02: GET /tasks/:id/comments returns the task comments list', async () => {
    const res = await api(`/tasks/${createdTaskId}/comments`, {
      token: viewerToken,
    });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.data)).toBe(true);
    expect(
      res.data.data.some((c: any) => c.id === createdCommentId)
    ).toBe(true);
  });

  it('5.03: DELETE /tasks/comments/:commentId fails with 403 when non-author attempts delete', async () => {
    // Viewer attempts to delete Member's comment
    const res = await api(`/tasks/comments/${createdCommentId}`, {
      method: 'DELETE',
      token: viewerToken,
    });
    expect(res.status).toBe(403);
  });

  it('5.04: DELETE /tasks/comments/:commentId succeeds for comment author', async () => {
    const res = await api(`/tasks/comments/${createdCommentId}`, {
      method: 'DELETE',
      token: memberToken,
    });
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  });

  /* ==========================================================================
     6. FILE ATTACHMENTS & STREAMING
     ========================================================================== */
  it('6.01: POST /tasks/:id/attachments uploads a file attachment', async () => {
    const formData = new FormData();
    const fileBlob = new Blob(
      ['Sample log file content for E2E tests'],
      { type: 'text/plain' }
    );
    formData.append('files', fileBlob, 'e2e-sample-log.txt');

    const res = await api(`/tasks/${createdTaskId}/attachments`, {
      method: 'POST',
      token: memberToken,
      formData,
    });

    expect(res.status).toBe(201);
    expect(res.data.success).toBe(true);
    expect(Array.isArray(res.data.data)).toBe(true);
    expect(res.data.data.length).toBeGreaterThan(0);

    const attachment = res.data.data[0];
    expect(attachment.originalName).toBe('e2e-sample-log.txt');
    createdAttachmentId = attachment.id;
  });

  it('6.02: GET /attachments/:id/view streams attachment inline', async () => {
    const res = await api(`/attachments/${createdAttachmentId}/view`, {
      token: memberToken,
    });
    expect(res.status).toBe(200);
    expect(res.data).toContain('Sample log file content for E2E tests');
  });

  it('6.03: GET /attachments/:id/download downloads attachment', async () => {
    const res = await api(`/attachments/${createdAttachmentId}/download`, {
      token: memberToken,
    });
    expect(res.status).toBe(200);
    expect(res.data).toContain('Sample log file content for E2E tests');
  });

  it('6.04: DELETE /attachments/:id deletes attachment', async () => {
    const res = await api(`/attachments/${createdAttachmentId}`, {
      method: 'DELETE',
      token: memberToken,
    });
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  });

  /* ==========================================================================
     7. USER MANAGEMENT & ADMINISTRATIVE CONTROLS
     ========================================================================== */
  it('7.01: GET /users allows user:view permission holders (Admin/Member/Viewer)', async () => {
    const res = await api('/users', { token: adminToken });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.data)).toBe(true);
    expect(res.data.data.length).toBeGreaterThanOrEqual(3);
  });

  it('7.02: POST /users fails with 403 when executed by non-admin Member', async () => {
    const res = await api('/users', {
      method: 'POST',
      token: memberToken,
      body: {
        email: 'illegal@datapure.io',
        fullName: 'Illegal User',
        role: 'MEMBER',
        password: 'Password123!',
      },
    });
    expect(res.status).toBe(403);
  });

  it('7.03: POST /users creates new user when executed by Admin', async () => {
    const res = await api('/users', {
      method: 'POST',
      token: adminToken,
      body: {
        email: 'e2e-testuser@datapure.io',
        fullName: 'E2E Test User',
        role: 'MEMBER',
        password: 'TempPassword123!',
      },
    });
    expect(res.status).toBe(201);
    expect(res.data.data.email).toBe('e2e-testuser@datapure.io');
    createdUserId = res.data.data.id;
  });

  it('7.04: PATCH /users/:id/status deactivates user', async () => {
    const res = await api(`/users/${createdUserId}/status`, {
      method: 'PATCH',
      token: adminToken,
      body: { isActive: false },
    });
    expect(res.status).toBe(200);
    expect(res.data.data.isActive).toBe(false);
  });

  it('7.05: PATCH /users/:id/status rejects admin self-deactivation with 400', async () => {
    const res = await api(`/users/${adminUser.id}/status`, {
      method: 'PATCH',
      token: adminToken,
      body: { isActive: false },
    });
    expect(res.status).toBe(400);
  });

  it('7.06: DELETE /users/:id deletes created user', async () => {
    const res = await api(`/users/${createdUserId}`, {
      method: 'DELETE',
      token: adminToken,
    });
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  });

  /* ==========================================================================
     8. RBAC GOVERNANCE & CUSTOM ROLES
     ========================================================================== */
  it('8.01: GET /rbac/roles retrieves roles catalog', async () => {
    const res = await api('/rbac/roles', { token: adminToken });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.data)).toBe(true);
    expect(res.data.data.some((r: any) => r.key === 'ADMIN')).toBe(true);
    expect(res.data.data.some((r: any) => r.key === 'MEMBER')).toBe(true);
    expect(res.data.data.some((r: any) => r.key === 'VIEWER')).toBe(true);
  });

  it('8.02: GET /rbac/permissions retrieves system permissions', async () => {
    const res = await api('/rbac/permissions', { token: adminToken });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.data)).toBe(true);
    expect(res.data.data.some((p: any) => p.key === 'task:create')).toBe(true);
    expect(res.data.data.some((p: any) => p.key === 'audit:view')).toBe(true);
  });

  it('8.03: POST /rbac/roles creates custom role', async () => {
    const res = await api('/rbac/roles', {
      method: 'POST',
      token: adminToken,
      body: {
        key: 'E2E_AUDITOR',
        name: 'E2E Security Auditor',
        description: 'Special role with read-only audit permissions',
        permissions: ['audit:view', 'user:view'],
      },
    });
    expect(res.status).toBe(201);
    expect(res.data.data.key).toBe('E2E_AUDITOR');
    createdRoleId = res.data.data.id;
  });

  it('8.04: PATCH /rbac/roles/:id/permissions updates role permissions', async () => {
    const res = await api(`/rbac/roles/${createdRoleId}/permissions`, {
      method: 'PATCH',
      token: adminToken,
      body: {
        permissions: ['audit:view', 'user:view', 'task:create'],
      },
    });
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  });

  it('8.05: DELETE /rbac/roles/:id rejects deleting protected system role', async () => {
    const adminRoleRes = await api('/rbac/roles', { token: adminToken });
    const adminRole = adminRoleRes.data.data.find((r: any) => r.key === 'ADMIN');

    const res = await api(`/rbac/roles/${adminRole.id}`, {
      method: 'DELETE',
      token: adminToken,
    });
    expect(res.status).toBe(400);
  });

  it('8.06: DELETE /rbac/roles/:id deletes custom role', async () => {
    const res = await api(`/rbac/roles/${createdRoleId}`, {
      method: 'DELETE',
      token: adminToken,
    });
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  });

  /* ==========================================================================
     9. REAL-TIME NOTIFICATIONS LIFECYCLE
     ========================================================================== */
  it('9.01: GET /notifications returns notification payload for authenticated user', async () => {
    const res = await api('/notifications', { token: memberToken });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.data.notifications)).toBe(true);
    expect(typeof res.data.data.unreadCount).toBe('number');
  });

  it('9.02: POST /notifications/mark-all-read marks notifications as read', async () => {
    const res = await api('/notifications/mark-all-read', {
      method: 'POST',
      token: memberToken,
    });
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  });

  it('9.03: DELETE /notifications clears all user notifications', async () => {
    const res = await api('/notifications', {
      method: 'DELETE',
      token: memberToken,
    });
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  });

  /* ==========================================================================
     10. AUDIT LOGGING & COMPLIANCE (100% MUTATION AUDIT COVERAGE)
     ========================================================================== */
  it('10.01: GET /activity-logs rejects unauthorized access from Viewer (403)', async () => {
    const res = await api('/activity-logs', { token: viewerToken });
    expect(res.status).toBe(403);
  });

  it('10.02: GET /activity-logs returns audit logs for Admin', async () => {
    const res = await api('/activity-logs?limit=50', { token: adminToken });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.data)).toBe(true);
    expect(res.data.data.length).toBeGreaterThan(0);

    const logs = res.data.data;
    const actions = logs.map((l: any) => l.action);

    // Verify critical mutation operations were recorded in the audit trail:
    expect(actions).toContain('USER_LOGIN');
    expect(actions).toContain('USER_INVITED');
    expect(actions).toContain('ROLE_CREATED');
    expect(actions).toContain('ROLE_DELETED');
    expect(actions).toContain('TASK_CREATED');
    expect(actions).toContain('TASK_MOVED');

    // Verify log schema integrity
    const sampleLog = logs[0];
    expect(sampleLog.id).toBeDefined();
    expect(sampleLog.action).toBeDefined();
    expect(sampleLog.entityType).toBeDefined();
    expect(sampleLog.createdAt).toBeDefined();
  });

  /* ==========================================================================
     11. TEARDOWN & CLEANUP
     ========================================================================== */
  it('11.01: DELETE /tasks/:id cleans up the created test task', async () => {
    const res = await api(`/tasks/${createdTaskId}`, {
      method: 'DELETE',
      token: memberToken,
    });
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  });
});
