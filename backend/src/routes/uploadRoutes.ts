import { Router } from 'express';
import { UploadController } from '../controllers/uploadController.js';
import { uploadAttachment } from '../middlewares/uploadMiddleware.js';
import { optionalAuthMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();
const uploadController = new UploadController();

// Multi-file drag and drop upload for task attachments (supports up to 5 files at once)
router.post(
  '/tasks/:id/attachments',
  optionalAuthMiddleware,
  uploadAttachment.array('files', 5),
  uploadController.uploadTaskAttachments
);

// View attachment inline
router.get(
  '/attachments/:id/view',
  optionalAuthMiddleware,
  uploadController.viewAttachment
);

// Download attachment
router.get(
  '/attachments/:id/download',
  optionalAuthMiddleware,
  uploadController.downloadAttachment
);

// Delete attachment by ID
router.delete(
  '/attachments/:id',
  optionalAuthMiddleware,
  uploadController.deleteAttachment
);

export default router;
