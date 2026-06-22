import { Request, Response, NextFunction } from 'express';
import { isAppError } from '../utils/errors';
import { errorResponse } from '../utils/response';

/**
 * Global error handling middleware
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // If the error is an instance of AppError (ValidationError, BadRequestError, etc.)
  if (isAppError(err)) {
    return errorResponse(res, err.message, err.name, err.details, err.statusCode);
  }

  // Handle generic / unexpected errors
  console.error('Unhandled server error:', err);
  return errorResponse(res, 'An unexpected error occurred', 'InternalServerError', undefined, 500);
};
