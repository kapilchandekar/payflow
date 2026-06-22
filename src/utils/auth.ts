import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

// Validate JWT_SECRET in production
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your_secret_key')) {
  throw new Error('FATAL ERROR: JWT_SECRET is not defined or is set to the default value in production. This is a severe security risk.');
}

const JWT_EXPIRY = '15m'; // Access token expires in 15 minutes
const REFRESH_EXPIRY = '7d';
const VERIFICATION_EXPIRY = '24h';
const RESET_EXPIRY = '1h';

/**
 * Hash a password using bcrypt
 * @param password - Plain text password
 * @returns Hashed password
 */
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Compare plain text password with hashed password
 * @param password - Plain text password
 * @param hashedPassword - Hashed password from database
 * @returns true if passwords match, false otherwise
 */
export const verifyPassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

/**
 * Generate Access Token for a user
 */
export const generateToken = (userId: number, email: string): string => {
  return jwt.sign(
    { userId, email, type: 'access' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
};

/**
 * Generate Refresh Token for a user
 */
export const generateRefreshToken = (userId: number): string => {
  return jwt.sign(
    { userId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_EXPIRY }
  );
};

/**
 * Generate Email Verification Token
 */
export const generateEmailVerificationToken = (email: string): string => {
  return jwt.sign(
    { email, type: 'verify' },
    JWT_SECRET,
    { expiresIn: VERIFICATION_EXPIRY }
  );
};

/**
 * Generate Password Reset Token
 */
export const generatePasswordResetToken = (userId: number): string => {
  return jwt.sign(
    { userId, type: 'reset' },
    JWT_SECRET,
    { expiresIn: RESET_EXPIRY }
  );
};

export const verifyToken = (token: string): any | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
};