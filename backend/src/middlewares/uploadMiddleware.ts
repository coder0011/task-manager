import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { BadRequestError } from '../errors/AppError.js';

// Absolute path to upload directory
const uploadDir = path.resolve(process.cwd(), 'uploads', 'attachments');

// Ensure the upload directory exists, create if not
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage with unique filenames and file filtering
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    // Generate unique filename preserving original extension
    const ext = path.extname(file.originalname);
    const sanitizedBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 50);
    const uniqueSuffix = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    cb(null, `${sanitizedBase}-${uniqueSuffix}${ext}`);
  }
});

// Strict whitelist of safe MIME types.
// NOTE: SVG ('image/svg+xml') is intentionally omitted to eliminate Stored XSS attack vectors.
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'application/zip',
  'application/x-zip-compressed'
]);

// File filter to validate allowed MIME types
const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new BadRequestError(
        `Unsupported file type '${file.mimetype}'. Allowed: images, documents (PDF, Word, Excel, CSV), archives (ZIP), and text files.`
      )
    );
  }
};

// Middleware to handle file uploads with size and count limits
export const uploadAttachment = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 5 // Max 5 files per multi-upload
  },
  fileFilter
});

// Avatar storage & middleware
const avatarDir = path.resolve(process.cwd(), 'uploads', 'avatars');
if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true });
}

// Configure multer storage for avatars with unique filenames and file filtering
const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, avatarDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `avatar-${uniqueSuffix}${ext}`);
  }
});

// File filter to validate allowed image MIME types for avatars
const avatarFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  if (allowed.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestError(`Unsupported image type '${file.mimetype}'. Allowed: JPG, PNG, WEBP, GIF.`));
  }
};

// Middleware to handle avatar uploads with size limit
export const uploadAvatar = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: avatarFilter
});

