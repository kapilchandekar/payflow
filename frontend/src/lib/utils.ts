import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extracts a user-friendly error message from an API error response,
 * including any detailed validation errors.
 */
export function extractErrorMessage(err: any, defaultMessage: string = 'An error occurred. Please try again.'): string {
  const apiError = err?.response?.data?.error;
  let message = apiError?.message || err?.response?.data?.message || err?.message || defaultMessage;
  
  if (apiError?.details) {
    const detailsObj = apiError.details;
    const allDetailMessages = Object.values(detailsObj).flat().filter(msg => typeof msg === 'string');
    if (allDetailMessages.length > 0) {
      message = `${message}: ${allDetailMessages.join(', ')}`;
    }
  }
  
  return message;
}
