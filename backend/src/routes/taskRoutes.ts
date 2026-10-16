import { Router } from 'express';
import { TaskController } from '../controllers/taskController.js';
import { optionalAuthMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();
const taskController = new TaskController();

// Comments endpoints
router.delete('/comments/:commentId', optionalAuthMiddleware, taskController.deleteComment);
router.get('/:id/comments', optionalAuthMiddleware, taskController.getComments);
router.post('/:id/comments', optionalAuthMiddleware, taskController.addComment);

// Task sub-resources
router.patch('/:id/move', optionalAuthMiddleware, taskController.moveTask);

// Tasks core endpoints
router.get('/', optionalAuthMiddleware, taskController.getTasks);
router.get('/:id', optionalAuthMiddleware, taskController.getTaskById);
router.post('/', optionalAuthMiddleware, taskController.createTask);
router.patch('/:id', optionalAuthMiddleware, taskController.updateTask);
router.delete('/:id', optionalAuthMiddleware, taskController.deleteTask);

export default router;
