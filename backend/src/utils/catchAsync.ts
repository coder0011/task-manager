import { Request, Response, NextFunction } from 'express';

export type AsyncFunction = (req: Request | any, res: Response, next: NextFunction) => Promise<any>;

// Utility function to catch errors in asynchronous route handlers and pass them to the next middleware
export const catchAsync = (fn: AsyncFunction) => {
  return (req: Request | any, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
