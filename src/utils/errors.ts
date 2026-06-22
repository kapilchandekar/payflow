/**
 * Custom error classes for PayFlow
 */

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: any,
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * 400 Bad Request
 */
export class BadRequestError extends AppError {
  constructor(message: string, details?: any) {
    super(400, message, details);
    this.name = "BadRequestError";
  }
}

/**
 * 401 Unauthorized
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized", details?: any) {
    super(401, message, details);
    this.name = "UnauthorizedError";
  }
}

/**
 * 403 Forbidden
 */
export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden", details?: any) {
    super(403, message, details);
    this.name = "ForbiddenError";
  }
}

/**
 * 404 Not Found
 */
export class NotFoundError extends AppError {
  constructor(message: string, details?: any) {
    super(404, message, details);
    this.name = "NotFoundError";
  }
}

/**
 * 409 Conflict
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(409, message, details);
    this.name = "ConflictError";
  }
}

/**
 * 422 Unprocessable Entity (Validation Error)
 */
export class ValidationError extends AppError {
  constructor(
    message: string = "Validation error",
    public errors: Record<string, string[]> = {},
  ) {
    super(422, message, errors);
    this.name = "ValidationError";
  }
}

/**
 * 500 Internal Server Error
 */
export class InternalServerError extends AppError {
  constructor(message: string = "Internal server error", details?: any) {
    super(500, message, details);
    this.name = "InternalServerError";
  }
}

/**
 * Business logic errors
 */
export class InsufficientBalanceError extends AppError {
  constructor(currentBalance: number, requestedAmount: number) {
    super(400, "Insufficient balance", { currentBalance, requestedAmount });
    this.name = "InsufficientBalanceError";
  }
}

export class PaymentFailedError extends AppError {
  constructor(message: string, paymentId: string) {
    super(400, message, { paymentId });
    this.name = "PaymentFailedError";
  }
}

export class DuplicateTransactionError extends AppError {
  constructor(transactionId: string) {
    super(409, "This transaction has already been processed", {
      transactionId,
    });
    this.name = "DuplicateTransactionError";
  }
}

/**
 * Check if error is AppError
 */
export const isAppError = (error: any): error is AppError => {
  return error instanceof AppError;
};
