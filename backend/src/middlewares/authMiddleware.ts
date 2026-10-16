import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../errors/AppError.js';
import { UserRole } from '../types/index.js';
import { env } from '../config/env.js';

export interface AuthUserPayload {
  id: number;
  email: string;
  role: UserRole;
  fullName?: string;
}

export interface AuthRequest extends Request {
  user?: AuthUserPayload;
}

// Required Auth: if no token or invalid token, throw error
export function authMiddleware(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Authentication token missing or invalid'));
  }

  const token = authHeader.split(' ')[1];
  const jwtSecret = env.jwtSecret;

  try {
    const decoded = jwt.verify(token, jwtSecret) as AuthUserPayload;
    req.user = decoded;
    next();
  } catch (error: any) {
    if (error && error.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('API token expired. Please sign in again.'));
    }
    next(new UnauthorizedError('Token is invalid or expired. Please sign in again.'));
  }
}

export { authMiddleware as authenticate };

// Optional Auth: if token exists, verify and set req.user, else continue as guest
export function optionalAuthMiddleware(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  const jwtSecret = env.jwtSecret;

  try {
    const decoded = jwt.verify(token, jwtSecret) as AuthUserPayload;
    req.user = decoded;
  } catch (_error) {
    // Ignore invalid token in optional auth
  }
  next();
}
