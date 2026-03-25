import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db';
import { authMiddleware } from '../middleware';
import { generateApiTokenPair, hashToken, hashPassword } from '../auth';
import { toCamelCase, rowsToCamelCase } from '../utils';

const router = Router();

// Use JWT-only auth middleware - API tokens should not manage other API tokens
router.use(authMiddleware);

// GET / - list all API tokens for current user (no hashes, only prefix + metadata)
router.get('/', (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const rows = db.prepare(
      'SELECT id, user_id, name, token_prefix, permissions, active, last_used, created_at FROM api_tokens WHERE user_id = ? ORDER BY created_at DESC'
    ).all(userId) as any[];

    return res.status(200).json(rowsToCamelCase(rows));
  } catch (err: any) {
    console.error('[API-TOKENS] List error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create new API token pair
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { name, permissions } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const id = uuid();
    const { token, secret } = generateApiTokenPair();

    // Hash the token with SHA-256 and the secret with bcrypt
    const tokenHash = hashToken(token);
    const secretHash = await hashPassword(secret);
    const tokenPrefix = token.substring(0, 10) + '...';

    const permissionsJson = JSON.stringify(permissions || ['read', 'write', 'delete']);

    db.prepare(`
      INSERT INTO api_tokens (id, user_id, name, token_hash, secret_hash, token_prefix, permissions)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, name, tokenHash, secretHash, tokenPrefix, permissionsJson);

    // Return the unhashed token and secret ONLY THIS ONCE
    return res.status(201).json({
      id,
      name,
      token,
      secret,
      tokenPrefix,
      permissions: permissions || ['read', 'write', 'delete'],
      active: true,
      createdAt: new Date().toISOString(),
      warning: 'Store these credentials securely. The token and secret will not be shown again.',
    });
  } catch (err: any) {
    console.error('[API-TOKENS] Create error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - revoke/delete an API token
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const existing = db.prepare(
      'SELECT id FROM api_tokens WHERE id = ? AND user_id = ?'
    ).get(id, userId) as any;

    if (!existing) {
      return res.status(404).json({ error: 'API token not found' });
    }

    db.prepare('DELETE FROM api_tokens WHERE id = ? AND user_id = ?').run(id, userId);

    return res.status(200).json({ message: 'API token deleted' });
  } catch (err: any) {
    console.error('[API-TOKENS] Delete error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /:id - toggle active status
router.patch('/:id', (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const existing = db.prepare(
      'SELECT id, active FROM api_tokens WHERE id = ? AND user_id = ?'
    ).get(id, userId) as any;

    if (!existing) {
      return res.status(404).json({ error: 'API token not found' });
    }

    const newActive = existing.active ? 0 : 1;
    db.prepare('UPDATE api_tokens SET active = ? WHERE id = ? AND user_id = ?').run(newActive, id, userId);

    const updated = db.prepare(
      'SELECT id, user_id, name, token_prefix, permissions, active, last_used, created_at FROM api_tokens WHERE id = ?'
    ).get(id) as any;

    return res.status(200).json(toCamelCase(updated));
  } catch (err: any) {
    console.error('[API-TOKENS] Toggle error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
