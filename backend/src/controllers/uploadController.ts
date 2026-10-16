import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import { TaskService } from '../services/taskService.js';
import { BadRequestError } from '../errors/AppError.js';
import { catchAsync } from '../utils/catchAsync.js';

const taskService = new TaskService();

// Controller class for handling file upload-related requests
export class UploadController {
  /**
   * Handle uploading attachments for a specific task.
   * @param req - The authenticated request object containing user info and uploaded files.
   * @param res - The response object used to send back the result of the upload operation.
   * @returns A JSON response containing details of the uploaded attachments or an error message.
   */
  uploadTaskAttachments = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const taskId = Number(req.params.id);
    if (isNaN(taskId) || taskId <= 0) {
      throw new BadRequestError('Invalid task ID provided');
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      throw new BadRequestError('No files were uploaded. Please select at least one file.');
    }

    const uploadedBy = req.user?.id || 1;
    const createdAttachments = [];

    // Iterate over each uploaded file and add it as an attachment to the task
    for (const file of files) {
      const att = await taskService.addAttachment({
        taskId,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        uploadedBy
      });
      createdAttachments.push(att);
    }

    res.status(201).json({
      success: true,
      message: `Successfully uploaded ${createdAttachments.length} file(s)`,
      data: createdAttachments
    });
  });

  /**
   * Handle deleting an attachment for a specific task.
   * @param req - The authenticated request object containing user info and attachment ID.
   * @param res - The response object used to send back the result of the delete operation.
   * @returns A JSON response indicating success or failure of the delete operation.
   */
  deleteAttachment = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const attachmentId = Number(req.params.id);
    if (isNaN(attachmentId) || attachmentId <= 0) {
      throw new BadRequestError('Invalid attachment ID');
    }

    await taskService.deleteAttachment(attachmentId, req.user?.id);
    res.json({
      success: true,
      message: 'Attachment successfully removed'
    });
  });

  /**
   * Stream attachment for viewing in browser (inline).
   * @param req - The authenticated request object containing user info and attachment ID.
   * @param res - The response object used to send back the attachment file for inline viewing.
   * @returns A streamed response of the attachment file or an error message if not found.
   */
  viewAttachment = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const attachmentId = Number(req.params.id);
    if (isNaN(attachmentId) || attachmentId <= 0) {
      throw new BadRequestError('Invalid attachment ID');
    }

    const att = await taskService.getAttachmentById(attachmentId);
    if (!att) {
      res.status(404).json({ success: false, message: 'Attachment not found' });
      return;
    }

    // Resolve the file path based on the current working directory and the uploads folder
    const filePath = (await import('path')).resolve(process.cwd(), 'uploads', 'attachments', att.filename);
    const fs = await import('fs');
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ success: false, message: 'File not found on storage disk' });
      return;
    }

    res.setHeader('Content-Type', att.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(att.originalName)}"`);
    res.sendFile(filePath);
  });

  /**
   * Force download of attachment.
   * @param req - The authenticated request object containing user info and attachment ID.
   * @param res - The response object used to send back the attachment file for download.
   * @returns A response that triggers the download of the attachment file or an error message if not found.
   */
  downloadAttachment = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    const attachmentId = Number(req.params.id);
    if (isNaN(attachmentId) || attachmentId <= 0) {
      throw new BadRequestError('Invalid attachment ID');
    }

    const att = await taskService.getAttachmentById(attachmentId);
    if (!att) {
      res.status(404).json({ success: false, message: 'Attachment not found' });
      return;
    }

    // Resolve the file path based on the current working directory and the uploads folder
    const filePath = (await import('path')).resolve(process.cwd(), 'uploads', 'attachments', att.filename);
    const fs = await import('fs');
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ success: false, message: 'File not found on storage disk' });
      return;
    }

    res.download(filePath, att.originalName);
  });
}
