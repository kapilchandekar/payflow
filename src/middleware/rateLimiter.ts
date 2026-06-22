import rateLimit from 'express-rate-limit';

/**
 * Global rate limiter for all general API requests
 * 100 requests per 15 minutes per IP
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: 'TooManyRequests',
    message: 'Too many requests from this IP, please try again after 15 minutes'
  }
});

/**
 * Stricter rate limiter for authentication routes (login, register)
 * 10 requests per 15 minutes per IP to prevent brute force attacks
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per `window`
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TooManyRequests',
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes'
  }
});

/**
 * Rate limiter for sensitive transactions (transfers, deposits, withdrawals)
 * 30 requests per 15 minutes per IP
 */
export const transactionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per `window`
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TooManyRequests',
    message: 'Too many transaction requests from this IP, please try again after 15 minutes'
  }
});
