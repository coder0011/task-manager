import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { uploadAvatar } from '../middlewares/uploadMiddleware.js';

const router = Router();
const authController = new AuthController();

// Public auth endpoints (User accounts are provisioned via Admin User CRUD)
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected session info & Profile
router.get('/me', authMiddleware, authController.me);
router.post('/logout', authMiddleware, authController.logout);
router.patch('/profile', authMiddleware, authController.updateProfile);
router.post('/profile/avatar', authMiddleware, uploadAvatar.single('avatar'), authController.uploadAvatar);
router.post('/change-password', authMiddleware, authController.changePassword);

export default router;
