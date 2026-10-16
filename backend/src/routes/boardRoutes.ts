import { Router } from 'express';
import { TaskController } from '../controllers/taskController.js';
import { optionalAuthMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();
const taskController = new TaskController();

// Get a board by its slug, with optional authentication
router.get('/:slug?', optionalAuthMiddleware, taskController.getBoard);

export default router;
