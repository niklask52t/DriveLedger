import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { verifyAccessToken, hashToken } from './auth.js';
import db from './db.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        isAdmin: boolean;
      };
    }
  }
}

/**
 * JWT auth middleware.
 * Checks Authorization: Bearer <jwt> header or access_token cookie.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (req.cookies?.access_token) {
    token = req.cookies.access_token;
  }

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  // Look up user to get admin status
  const user = db.prepare('SELECT id, email, is_admin FROM users WHERE id = ?').get(payload.userId) as
    | { id: string; email: string; is_admin: number }
    | undefined;

  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return;
  }

  req.user = {
    id: user.id,
    email: user.email,
    isAdmin: user.is_admin === 1,
  };

  next();
}

/**
 * API token auth middleware.
 * Checks Authorization: ApiKey <token>:<secret> header.
 */
export function apiTokenMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('ApiKey ')) {
    res.status(401).json({ error: 'API key authentication required' });
    return;
  }

  const credentials = authHeader.slice(7);
  const separatorIndex = credentials.indexOf(':');
  if (separatorIndex === -1) {
    res.status(401).json({ error: 'Invalid API key format. Expected ApiKey <token>:<secret>' });
    return;
  }

  const token = credentials.slice(0, separatorIndex);
  const secret = credentials.slice(separatorIndex + 1);

  const tokenHash = hashToken(token);
  const secretHash = hashToken(secret);

  const apiToken = db.prepare(`
    SELECT at.id, at.user_id, at.secret_hash, at.permissions, at.active,
           u.email, u.is_admin
    FROM api_tokens at
    JOIN users u ON u.id = at.user_id
    WHERE at.token_hash = ?
  `).get(tokenHash) as
    | { id: string; user_id: string; secret_hash: string; permissions: string; active: number; email: string; is_admin: number }
    | undefined;

  if (!apiToken || apiToken.active !== 1) {
    res.status(401).json({ error: 'Invalid or inactive API token' });
    return;
  }

  if (apiToken.secret_hash !== secretHash) {
    res.status(401).json({ error: 'Invalid API secret' });
    return;
  }

  // Update last_used
  db.prepare('UPDATE api_tokens SET last_used = datetime(\'now\') WHERE id = ?').run(apiToken.id);

  req.user = {
    id: apiToken.user_id,
    email: apiToken.email,
    isAdmin: apiToken.is_admin === 1,
  };

  next();
}

/**
 * Combined auth middleware.
 * Tries JWT first, then API token. Returns 401 if neither works.
 */
export function combinedAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  // Try JWT (Bearer token or cookie)
  if (authHeader?.startsWith('Bearer ') || req.cookies?.access_token) {
    authMiddleware(req, res, (err?: unknown) => {
      if (err || !req.user) {
        // JWT failed, try API token
        apiTokenMiddleware(req, res, next);
      } else {
        next();
      }
    });
    return;
  }

  // Try API token
  if (authHeader?.startsWith('ApiKey ')) {
    apiTokenMiddleware(req, res, next);
    return;
  }

  res.status(401).json({ error: 'Authentication required' });
}

/**
 * Admin middleware. Must be used after an auth middleware.
 */
export function adminMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!req.user?.isAdmin) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

/**
 * General rate limiter: 100 requests per minute.
 */
export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

/**
 * Auth rate limiter: 5 requests per minute for auth endpoints.
 */
export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later' },
});
