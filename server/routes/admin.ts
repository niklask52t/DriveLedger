import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getPool } from '../db';
import { combinedAuthMiddleware, adminMiddleware } from '../middleware';
import { generateSecureToken, hashPassword } from '../auth';
import { toCamelCase, rowsToCamelCase } from '../utils';

const router = Router();

// All admin routes require auth + admin
router.use(combinedAuthMiddleware);
router.use(adminMiddleware);

// GET /users - list all users
router.get('/users', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT id, email, username, is_admin, email_verified, created_at, updated_at FROM users ORDER BY created_at DESC'
    );

    const users = (rows as any[]).map((row) => ({
      id: row.id,
      email: row.email,
      username: row.username,
      isAdmin: !!row.is_admin,
      emailVerified: !!row.email_verified,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return res.status(200).json(users);
  } catch (err: any) {
    console.error('[ADMIN] List users error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /registration-tokens - generate a new registration token
router.post('/registration-tokens', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const adminId = (req as any).user.id;
    const id = uuid();
    const token = generateSecureToken();

    // Token expires in 7 days by default, or custom duration from body
    const expiresInDays = req.body.expiresInDays || 7;
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

    await pool.execute(
      'INSERT INTO registration_tokens (id, token, created_by, expires_at) VALUES (?, ?, ?, ?)',
      [id, token, adminId, expiresAt]
    );

    return res.status(201).json({
      id,
      token,
      createdBy: adminId,
      expiresAt,
      used: false,
    });
  } catch (err: any) {
    console.error('[ADMIN] Create registration token error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /registration-tokens - list all registration tokens
router.get('/registration-tokens', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT * FROM registration_tokens ORDER BY created_at DESC'
    );

    const tokens = (rows as any[]).map((row) => ({
      id: row.id,
      token: row.token,
      createdBy: row.created_by,
      usedBy: row.used_by,
      used: !!row.used,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    }));

    return res.status(200).json(tokens);
  } catch (err: any) {
    console.error('[ADMIN] List registration tokens error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /registration-tokens/:id - delete a registration token
router.delete('/registration-tokens/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { id } = req.params;

    const [existingRows] = await pool.execute('SELECT id FROM registration_tokens WHERE id = ?', [id]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Registration token not found' });
    }

    await pool.execute('DELETE FROM registration_tokens WHERE id = ?', [id]);

    return res.status(200).json({ message: 'Registration token deleted' });
  } catch (err: any) {
    console.error('[ADMIN] Delete registration token error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /users/:id - delete a user and ALL their data
router.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    const adminId = (req as any).user.id;

    // Prevent admin from deleting themselves
    if (id === adminId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const [userRows] = await pool.execute('SELECT id, email, username FROM users WHERE id = ?', [id]);
    const user = (userRows as any[])[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete all user data in a transaction
    const conn = await pool.getConnection();
    await conn.beginTransaction();
    try {
      // Delete savings transactions first (depends on savings_goals)
      await conn.execute('DELETE FROM savings_transactions WHERE user_id = ?', [id]);
      await conn.execute('DELETE FROM reminders WHERE user_id = ?', [id]);
      await conn.execute('DELETE FROM savings_goals WHERE user_id = ?', [id]);
      await conn.execute('DELETE FROM costs WHERE user_id = ?', [id]);
      await conn.execute('DELETE FROM loans WHERE user_id = ?', [id]);
      await conn.execute('DELETE FROM repairs WHERE user_id = ?', [id]);
      await conn.execute('DELETE FROM planned_purchases WHERE user_id = ?', [id]);
      await conn.execute('DELETE FROM persons WHERE user_id = ?', [id]);
      await conn.execute('DELETE FROM api_tokens WHERE user_id = ?', [id]);
      await conn.execute('DELETE FROM password_resets WHERE user_id = ?', [id]);
      await conn.execute('DELETE FROM vehicles WHERE user_id = ?', [id]);
      await conn.execute('DELETE FROM users WHERE id = ?', [id]);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    return res.status(200).json({ message: `User ${user.username} and all their data deleted` });
  } catch (err: any) {
    console.error('[ADMIN] Delete user error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /users/:id/reset-password - admin generates a password reset token for a specific user
router.post('/users/:id/reset-password', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const { id } = req.params;

    const [userRows] = await pool.execute('SELECT id, email, username FROM users WHERE id = ?', [id]);
    const user = (userRows as any[])[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const resetToken = generateSecureToken();
    const tokenId = uuid();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    await pool.execute(
      'INSERT INTO password_resets (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
      [tokenId, user.id, resetToken, expiresAt]
    );

    console.log(`[ADMIN] Password reset token generated for user ${user.username} (${user.email})`);

    return res.status(200).json({
      message: `Password reset token generated for ${user.username}`,
      token: resetToken,
      expiresAt,
      userId: user.id,
      username: user.username,
      email: user.email,
    });
  } catch (err: any) {
    console.error('[ADMIN] Reset password for user error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
