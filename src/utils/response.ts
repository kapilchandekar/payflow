import { Response } from 'express';

export const successResponse = (res: Response, data: any, meta?: any, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
    ...(meta && { meta })
  });
};

export const errorResponse = (res: Response, message: string, code?: string, details?: any, statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(code && { code }),
      ...(details && { details })
    }
  });
};
