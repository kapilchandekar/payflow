import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to enforce HTTPS connections.
 * Redirects HTTP requests to HTTPS if NODE_ENV is production.
 */
export const enforceHttps = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, `https://${req.hostname}${req.originalUrl}`);
  }
  next();
};

/**
 * Middleware to add common security headers to responses.
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self';"
  );
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // MIME sniffing prevention
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // HSTS (HTTP Strict Transport Security)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // XSS Protection (legacy, but good for older browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  next();
};
