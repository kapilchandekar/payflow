/**
 * Validation service for request validation and sanitization
 */

/**
 * Validate email format
 */
export const validateEmail = (email: string): boolean => {
  // Use a more strict regex that only allows valid email characters
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * Requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
export const validatePassword = (password: string): {
  valid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validate amount (for payments, transfers, etc)
 */
export const validateAmount = (amount: any): {
  valid: boolean;
  error?: string;
  value?: number;
} => {
  // Check if it's a number
  const numAmount = parseFloat(amount);
  
  if (isNaN(numAmount)) {
    return { valid: false, error: 'Amount must be a valid number' };
  }

  // Check if positive
  if (numAmount <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }

  // Check if within reasonable limits
  if (numAmount > 10000000) {
    return { valid: false, error: 'Amount cannot exceed 100,000' };
  }

  // Check decimal places (max 2 for currency)
  if (numAmount * 100 !== Math.round(numAmount * 100)) {
    return { valid: false, error: 'Amount can have maximum 2 decimal places' };
  }

  return { valid: true, value: numAmount };
};

/**
 * Validate phone number
 */
export const validatePhoneNumber = (phone: string): boolean => {
  // Simple validation: at least 10 digits
  const phoneRegex = /^[0-9]{10,}$/;
  return phoneRegex.test(phone.replace(/[^\d]/g, ''));
};

/**
 * Validate user name
 */
export const validateName = (name: string): {
  valid: boolean;
  error?: string;
} => {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Name is required' };
  }

  if (name.trim().length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' };
  }

  if (name.trim().length > 50) {
    return { valid: false, error: 'Name cannot exceed 50 characters' };
  }

  // Prevent HTML/script injection and special characters
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  if (!nameRegex.test(name)) {
    return { valid: false, error: 'Name can only contain letters, spaces, hyphens and apostrophes' };
  }

  return { valid: true };
};

/**
 * Sanitize string input (remove dangerous characters)
 */
export const sanitizeString = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .substring(0, 255); // Limit length
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (limit?: any, offset?: any): {
  valid: boolean;
  limit: number;
  offset: number;
  error?: string;
} => {
  let parsedLimit = parseInt(limit) || 10;
  let parsedOffset = parseInt(offset) || 0;

  if (parsedLimit < 1) {
    return { valid: false, limit: 10, offset: 0, error: 'Limit must be at least 1' };
  }

  if (parsedLimit > 100) {
    return { valid: false, limit: 10, offset: 0, error: 'Limit cannot exceed 100' };
  }

  if (parsedOffset < 0) {
    return { valid: false, limit: parsedLimit, offset: 0, error: 'Offset cannot be negative' };
  }

  return { valid: true, limit: parsedLimit, offset: parsedOffset };
};

/**
 * Validate required fields
 */
export const validateRequiredFields = (
  obj: any,
  fields: string[]
): {
  valid: boolean;
  missingFields: string[];
} => {
  const missingFields = fields.filter(field => !obj[field]);

  return {
    valid: missingFields.length === 0,
    missingFields
  };
};