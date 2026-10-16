import { Router } from 'express';
import { activityLogController } from '../controllers/activityLogController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { requirePermission } from '../middlewares/rbacMiddleware.js';

const router = Router();

// Protected by authentication and audit:view permission
router.get('/', authenticate, requirePermission('audit:view'), activityLogController.getActivityLogs);

export default router;
