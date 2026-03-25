import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  console.warn('[AUTH] WARNING: Using fallback JWT_SECRET. Set JWT_SECRET env var in production!');
  return 'fallback-jwt-secret-do-not-use-in-production';
})();

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || (() => {
  console.warn('[AUTH] WARNING: Using fallback JWT_REFRESH_SECRET. Set JWT_REFRESH_SECRET env var in production!');
  return 'fallback-jwt-refresh-secret-do-not-use-in-production';
})();

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '15m' });
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string): { userId: string; email: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    return { userId: payload.userId, email: payload.email };
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    const payload = jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string };
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateApiTokenPair(): { token: string; secret: string } {
  const tokenBytes = crypto.randomBytes(24).toString('hex');
  const secretBytes = crypto.randomBytes(32).toString('hex');
  return {
    token: `dl_${tokenBytes}`,
    secret: secretBytes,
  };
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
