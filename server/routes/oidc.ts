import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import { getPool } from '../db';
import { generateAccessToken, generateRefreshToken, hashPassword } from '../auth';

const router = Router();

const OIDC_ENABLED = process.env.OIDC_ENABLED === 'true';
const OIDC_CLIENT_ID = process.env.OIDC_CLIENT_ID || '';
const OIDC_CLIENT_SECRET = process.env.OIDC_CLIENT_SECRET || '';
const OIDC_AUTH_URL = process.env.OIDC_AUTH_URL || '';
const OIDC_TOKEN_URL = process.env.OIDC_TOKEN_URL || '';
const OIDC_USERINFO_URL = process.env.OIDC_USERINFO_URL || '';
const OIDC_REDIRECT_URL = process.env.OIDC_REDIRECT_URL || 'http://localhost:3001/api/oidc/callback';
const OIDC_SCOPE = process.env.OIDC_SCOPE || 'openid email profile';
const OIDC_PROVIDER_NAME = process.env.OIDC_PROVIDER_NAME || 'SSO';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// In-memory store for OIDC state tokens (short-lived, cleared after use)
const stateStore = new Map<string, { createdAt: number }>();

// Cleanup old state tokens every 5 minutes
setInterval(() => {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  for (const [key, value] of stateStore.entries()) {
    if (value.createdAt < fiveMinutesAgo) {
      stateStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Decode a JWT payload without verifying the signature.
 * Used to extract claims from the id_token returned by the OIDC provider.
 */
function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], 'base64url').toString('utf-8');
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

// GET /config - Return OIDC configuration status
router.get('/config', (_req: Request, res: Response) => {
  return res.status(200).json({
    enabled: OIDC_ENABLED,
    providerName: OIDC_PROVIDER_NAME,
  });
});

// GET /authorize - Redirect to OIDC provider's authorization endpoint
router.get('/authorize', (_req: Request, res: Response) => {
  if (!OIDC_ENABLED) {
    return res.status(400).json({ error: 'OIDC is not enabled' });
  }

  if (!OIDC_AUTH_URL || !OIDC_CLIENT_ID) {
    return res.status(500).json({ error: 'OIDC is not properly configured' });
  }

  // Generate a random state parameter to prevent CSRF
  const state = crypto.randomBytes(32).toString('hex');
  stateStore.set(state, { createdAt: Date.now() });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: OIDC_CLIENT_ID,
    redirect_uri: OIDC_REDIRECT_URL,
    scope: OIDC_SCOPE,
    state,
  });

  const authUrl = `${OIDC_AUTH_URL}?${params.toString()}`;
  return res.redirect(authUrl);
});

// GET /callback - Handle the authorization code callback
router.get('/callback', async (req: Request, res: Response) => {
  if (!OIDC_ENABLED) {
    return res.redirect(`${FRONTEND_URL}/#login?error=oidc_disabled`);
  }

  const { code, state, error: oidcError } = req.query;

  // Handle errors from the OIDC provider
  if (oidcError) {
    console.error('[OIDC] Authorization error:', oidcError);
    return res.redirect(`${FRONTEND_URL}/#login?error=oidc_denied`);
  }

  // Validate state parameter
  if (!state || typeof state !== 'string' || !stateStore.has(state)) {
    console.error('[OIDC] Invalid or missing state parameter');
    return res.redirect(`${FRONTEND_URL}/#login?error=oidc_invalid_state`);
  }
  stateStore.delete(state);

  if (!code || typeof code !== 'string') {
    console.error('[OIDC] Missing authorization code');
    return res.redirect(`${FRONTEND_URL}/#login?error=oidc_no_code`);
  }

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch(OIDC_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: OIDC_REDIRECT_URL,
        client_id: OIDC_CLIENT_ID,
        client_secret: OIDC_CLIENT_SECRET,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[OIDC] Token exchange failed:', tokenResponse.status, errorText);
      return res.redirect(`${FRONTEND_URL}/#login?error=oidc_token_failed`);
    }

    const tokenData = await tokenResponse.json() as {
      access_token: string;
      id_token?: string;
      token_type: string;
    };

    // Extract email from id_token or userinfo endpoint
    let email: string | null = null;
    let displayName: string | null = null;

    // Try id_token first
    if (tokenData.id_token) {
      const claims = decodeJwtPayload(tokenData.id_token);
      if (claims) {
        email = claims.email || null;
        displayName = claims.preferred_username || claims.name || null;
      }
    }

    // Fall back to userinfo endpoint
    if (!email && OIDC_USERINFO_URL) {
      const userinfoResponse = await fetch(OIDC_USERINFO_URL, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      if (userinfoResponse.ok) {
        const userinfo = await userinfoResponse.json() as {
          email?: string;
          preferred_username?: string;
          name?: string;
        };
        email = userinfo.email || null;
        displayName = displayName || userinfo.preferred_username || userinfo.name || null;
      }
    }

    if (!email) {
      console.error('[OIDC] Could not extract email from OIDC response');
      return res.redirect(`${FRONTEND_URL}/#login?error=oidc_no_email`);
    }

    const pool = getPool();

    // Find existing user by email
    const [userRows] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    let user = (userRows as any[])[0];

    // Create user if not found
    if (!user) {
      const userId = uuid();
      const username = displayName || email.split('@')[0];
      // Generate a random password (user logs in via OIDC, not password)
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const passwordHash = await hashPassword(randomPassword);
      const now = new Date().toISOString();

      // Check if this is the first user (make them admin)
      const [countRows] = await pool.execute('SELECT COUNT(*) as count FROM users');
      const userCount = Number((countRows as { count: number }[])[0].count);
      const isAdmin = userCount === 0 ? 1 : 0;

      await pool.execute(
        'INSERT INTO users (id, email, username, password_hash, is_admin, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)',
        [userId, email, username, passwordHash, isAdmin, now, now]
      );

      const [newUserRows] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
      user = (newUserRows as any[])[0];

      console.log(`[OIDC] Created new user: ${username} (${email})`);
    }

    // Generate JWT tokens
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id);

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Redirect to frontend with access token in URL fragment
    return res.redirect(`${FRONTEND_URL}/#login?oidc_token=${accessToken}`);
  } catch (err: any) {
    console.error('[OIDC] Callback error:', err);
    return res.redirect(`${FRONTEND_URL}/#login?error=oidc_error`);
  }
});

export default router;
