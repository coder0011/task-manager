import { Router } from 'express';
import { UserController } from '../controllers/userController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requireRole, requirePermission } from '../middlewares/rbacMiddleware.js';
import { uploadAvatar } from '../middlewares/uploadMiddleware.js';

const router = Router();
const userController = new UserController();

// All user routes require authenticated session
router.use(authMiddleware);

// User directory accessible to users with user:view permission (Admin, Member, Viewer)
router.get('/', requirePermission('user:view'), userController.getAllUsers);
router.get('/:id', requirePermission('user:view'), userController.getUserById);

// Admin-only management endpoints
router.post('/', requireRole('ADMIN'), userController.createUser);
router.patch('/:id', requireRole('ADMIN'), userController.updateUser);
router.post('/:id/avatar', requireRole('ADMIN'), uploadAvatar.single('avatar'), userController.uploadAvatar);
router.patch('/:id/role', requireRole('ADMIN'), userController.updateUserRole);
router.patch('/:id/status', requireRole('ADMIN'), userController.updateUserStatus);
router.delete('/:id', requireRole('ADMIN'), userController.deleteUser);

export default router;
