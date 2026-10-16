import { Router } from 'express';
import { rbacController } from '../controllers/rbacController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/rbacMiddleware.js';

const router = Router();

// Viewing roles & permissions can be done by authenticated users
router.get('/roles', authenticate, rbacController.getRoles);
router.get('/permissions', authenticate, rbacController.getPermissions);

// Role authoring and permission modification requires ADMIN role
router.post('/roles', authenticate, requireRole('ADMIN'), rbacController.createRole);
router.patch('/roles/:id/permissions', authenticate, requireRole('ADMIN'), rbacController.updateRolePermissions);
router.put('/roles/:id/permissions', authenticate, requireRole('ADMIN'), rbacController.updateRolePermissions);
router.delete('/roles/:id', authenticate, requireRole('ADMIN'), rbacController.deleteRole);

export default router;
