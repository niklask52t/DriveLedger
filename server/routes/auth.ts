import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getPool } from '../db';
import { combinedAuthMiddleware } from '../middleware';
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateSecureToken,
} from '../auth';
import { isValidEmail, isValidPassword, toCamelCase } from '../utils';
import { isEmailEnabled, sendRegistrationEmail, sendVerificationEmail, sendPasswordResetEmail } from '../email';

const router = Router();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const COOKIE_LIFESPAN_DAYS = parseInt(process.env.COOKIE_LIFESPAN_DAYS || '7', 10);
const COOKIE_MAX_AGE = COOKIE_LIFESPAN_DAYS * 24 * 60 * 60 * 1000;

// POST /register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { email, username, password, registrationToken } = req.body;
    const openRegistration = process.env.OPEN_REGISTRATION === 'true';

    // Validate required fields
    if (!email || !username || !password || (!openRegistration && !registrationToken)) {
      return res.status(400).json({ error: openRegistration
        ? 'Email, username, and password are required'
        : 'Email, username, password, and registration token are required' });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password strength
    const passwordCheck = isValidPassword(password);
    if (!passwordCheck.valid) {
      return res.status(400).json({ error: passwordCheck.message });
    }

    // Validate registration token (skip if open registration)
    let tokenRow: any = null;
    if (!openRegistration) {
      const [tokenRows] = await pool.execute(
        'SELECT * FROM registration_tokens WHERE token = ? AND used = 0 AND expires_at > NOW()',
        [registrationToken]
      );
      tokenRow = (tokenRows as any[])[0];

      if (!tokenRow) {
        return res.status(400).json({ error: 'Invalid, used, or expired registration token' });
      }
    }

    // Check if email or username already exists
    const [existingRows] = await pool.execute(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );
    const existingUser = (existingRows as any[])[0];

    if (existingUser) {
      return res.status(409).json({ error: 'Email or username already in use' });
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const userId = uuid();
    const now = new Date().toISOString();

    const emailEnabled = isEmailEnabled();
    const emailVerified = emailEnabled ? 0 : 1;
    let verificationToken = '';
    let verificationExpires = '';

    if (emailEnabled) {
      verificationToken = generateSecureToken();
      verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
    }

    await pool.execute(
      'INSERT INTO users (id, email, username, password_hash, email_verified, email_verification_token, email_verification_expires, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, email, username, passwordHash, emailVerified, verificationToken, verificationExpires, now, now]
    );

    // Mark registration token as used (only if token was validated)
    if (tokenRow) {
      await pool.execute(
        'UPDATE registration_tokens SET used = 1, used_by = ? WHERE id = ?',
        [userId, tokenRow.id]
      );
    }

    // Send emails
    if (emailEnabled) {
      const verifyUrl = `${FRONTEND_URL}/verify-email`;
      await sendVerificationEmail(email, verificationToken, verifyUrl);
    }
    await sendRegistrationEmail(email, username);

    // Generate tokens
    const accessToken = generateAccessToken(userId, email);
    const refreshToken = generateRefreshToken(userId);

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: COOKIE_MAX_AGE,
    });

    return res.status(201).json({
      user: {
        id: userId,
        email,
        username,
        isAdmin: false,
        emailVerified: !emailEnabled,
        createdAt: now,
      },
      accessToken,
      refreshToken,
    });
  } catch (err: any) {
    console.error('[AUTH] Register error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email/username and password are required' });
    }

    // Find user by email OR username
    const [userRows] = await pool.execute(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [email, email]
    );
    const user = (userRows as any[])[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare password
    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id);

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: COOKIE_MAX_AGE,
    });

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isAdmin: !!user.is_admin,
        emailVerified: !!user.email_verified,
        createdAt: user.created_at,
      },
      accessToken,
      refreshToken,
    });
  } catch (err: any) {
    console.error('[AUTH] Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /refresh
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token provided' });
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Look up user to get email
    const [userRows] = await pool.execute(
      'SELECT id, email FROM users WHERE id = ?',
      [payload.userId]
    );
    const user = (userRows as any[])[0];
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const accessToken = generateAccessToken(user.id, user.email);

    return res.status(200).json({ accessToken });
  } catch (err: any) {
    console.error('[AUTH] Refresh error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /logout
router.post('/logout', (_req: Request, res: Response) => {
  try {
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (err: any) {
    console.error('[AUTH] Logout error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /forgot-password
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!isEmailEnabled()) {
      return res.status(200).json({
        message: 'Email is not enabled. Contact your admin for a password reset token.',
        emailDisabled: true,
      });
    }

    // Always return success to not leak whether email exists
    const [userRows] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    const user = (userRows as any[])[0];

    if (user) {
      const resetToken = generateSecureToken();
      const id = uuid();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

      await pool.execute(
        'INSERT INTO password_resets (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
        [id, user.id, resetToken, expiresAt]
      );

      const resetUrl = `${FRONTEND_URL}/reset-password`;
      await sendPasswordResetEmail(email, resetToken, resetUrl);
      console.log(`[AUTH] Password reset token generated for ${email}`);
    }

    return res.status(200).json({ message: 'If that email exists, a reset link has been sent' });
  } catch (err: any) {
    console.error('[AUTH] Forgot password error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /reset-password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    // Validate password strength
    const passwordCheck = isValidPassword(newPassword);
    if (!passwordCheck.valid) {
      return res.status(400).json({ error: passwordCheck.message });
    }

    // Find valid reset token
    const [resetRows] = await pool.execute(
      'SELECT * FROM password_resets WHERE token = ? AND used = 0 AND expires_at > NOW()',
      [token]
    );
    const resetRow = (resetRows as any[])[0];

    if (!resetRow) {
      return res.status(400).json({ error: 'Invalid, used, or expired reset token' });
    }

    // Hash new password and update user
    const passwordHash = await hashPassword(newPassword);
    const now = new Date().toISOString();

    await pool.execute(
      'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
      [passwordHash, now, resetRow.user_id]
    );

    // Mark token as used
    await pool.execute(
      'UPDATE password_resets SET used = 1 WHERE id = ?',
      [resetRow.id]
    );

    return res.status(200).json({ message: 'Password reset successfully' });
  } catch (err: any) {
    console.error('[AUTH] Reset password error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /verify-email
router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    const [userRows] = await pool.execute(
      'SELECT id FROM users WHERE email_verification_token = ? AND email_verification_expires > NOW()',
      [token]
    );
    const user = (userRows as any[])[0];

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    await pool.execute(
      "UPDATE users SET email_verified = 1, email_verification_token = '', email_verification_expires = '', updated_at = NOW() WHERE id = ?",
      [user.id]
    );

    return res.status(200).json({ message: 'Email verified successfully' });
  } catch (err: any) {
    console.error('[AUTH] Verify email error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /resend-verification
router.post('/resend-verification', combinedAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const pool = getPool();

    if (!isEmailEnabled()) {
      return res.status(400).json({ error: 'Email is not enabled' });
    }

    const userId = (req as any).user.id;
    const [userRows] = await pool.execute(
      'SELECT id, email, email_verified FROM users WHERE id = ?',
      [userId]
    );
    const user = (userRows as any[])[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.email_verified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    const verificationToken = generateSecureToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await pool.execute(
      'UPDATE users SET email_verification_token = ?, email_verification_expires = ?, updated_at = NOW() WHERE id = ?',
      [verificationToken, verificationExpires, userId]
    );

    const verifyUrl = `${FRONTEND_URL}/verify-email`;
    await sendVerificationEmail(user.email, verificationToken, verifyUrl);

    return res.status(200).json({ message: 'Verification email sent' });
  } catch (err: any) {
    console.error('[AUTH] Resend verification error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /me - requires auth
router.get('/me', combinedAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;

    const [userRows] = await pool.execute(
      'SELECT id, email, username, is_admin, email_verified, created_at, updated_at FROM users WHERE id = ?',
      [userId]
    );
    const user = (userRows as any[])[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isAdmin: !!user.is_admin,
        emailVerified: !!user.email_verified,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    });
  } catch (err: any) {
    console.error('[AUTH] Me error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /change-password - change password (requires auth)
router.post('/change-password', combinedAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (!isValidPassword(newPassword).valid) {
      return res.status(400).json({ error: 'New password must be at least 8 characters with uppercase, lowercase, and number' });
    }

    const [userRows] = await pool.execute(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );
    const user = (userRows as any[])[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const valid = await comparePassword(currentPassword, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newHash = await hashPassword(newPassword);
    await pool.execute(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [newHash, userId]
    );

    return res.status(200).json({ message: 'Password changed successfully' });
  } catch (err: any) {
    console.error('[AUTH] Change password error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /account - delete own account and all data
router.delete('/account', combinedAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;

    const conn = await pool.getConnection();
    await conn.beginTransaction();
    try {
      // Delete child records that reference vehicles first
      await conn.execute('DELETE FROM user_config WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM attachments WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM vehicle_shares WHERE vehicle_id IN (SELECT id FROM vehicles WHERE user_id = ?)', [userId]);
      await conn.execute('DELETE FROM extra_field_definitions WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM supply_requisitions WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM inspection_templates WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM plan_templates WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM custom_widget_code WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM service_records WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM upgrade_records WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM fuel_records WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM odometer_records WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM inspections WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM vehicle_notes WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM taxes WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM supplies WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM equipment WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM planner_tasks WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM reminders WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM savings_transactions WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM savings_goals WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM repairs WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM costs WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM loans WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM webhooks WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM vehicles WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM planned_purchases WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM persons WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM api_tokens WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM password_resets WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM users WHERE id = ?', [userId]);
      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

    res.clearCookie('refreshToken');
    return res.status(200).json({ message: 'Account deleted' });
  } catch (err: any) {
    console.error('[AUTH] Delete account error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
