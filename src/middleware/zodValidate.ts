import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

export const zodValidate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // We explicitly parse only the body, but could extend to query/params
      await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format the errors
        const formattedErrors = error.issues.map((err: any) => 
          `${err.path.join('.')}: ${err.message}`
        );
        
        next(new ValidationError('Validation failed', { details: formattedErrors }));
      } else {
        next(error);
      }
    }
  };
};
