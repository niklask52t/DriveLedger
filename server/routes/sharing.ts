import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getPool } from '../db.js';
import { combinedAuthMiddleware } from '../middleware.js';
import { toCamelCase, rowsToCamelCase } from '../utils.js';

const router = Router();
router.use(combinedAuthMiddleware);

const VALID_PERMISSIONS = ['viewer', 'editor'];

// POST /vehicles/:vehicleId/share - Share a vehicle with a user by email
router.post('/vehicles/:vehicleId/share', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { vehicleId } = req.params;
    const { email, permission } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    if (permission && !VALID_PERMISSIONS.includes(permission)) {
      return res.status(400).json({ error: `Invalid permission. Must be one of: ${VALID_PERMISSIONS.join(', ')}` });
    }

    // Verify vehicle ownership
    const [vehicleRows] = await pool.execute(
      'SELECT id FROM vehicles WHERE id = ? AND user_id = ?',
      [vehicleId, userId]
    );
    if ((vehicleRows as any[]).length === 0) {
      return res.status(404).json({ error: 'Vehicle not found or you are not the owner' });
    }

    // Find the user to share with
    const [userRows] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    const targetUser = (userRows as any[])[0];
    if (!targetUser) {
      return res.status(404).json({ error: 'User with that email not found' });
    }

    if (targetUser.id === userId) {
      return res.status(400).json({ error: 'Cannot share a vehicle with yourself' });
    }

    // Check if already shared
    const [existingRows] = await pool.execute(
      'SELECT id FROM vehicle_shares WHERE vehicle_id = ? AND shared_with_user_id = ?',
      [vehicleId, targetUser.id]
    );
    if ((existingRows as any[]).length > 0) {
      return res.status(409).json({ error: 'Vehicle is already shared with this user' });
    }

    const id = uuid();
    await pool.execute(
      `INSERT INTO vehicle_shares (id, vehicle_id, owner_id, shared_with_user_id, permission)
       VALUES (?, ?, ?, ?, ?)`,
      [id, vehicleId, userId, targetUser.id, permission || 'viewer']
    );

    const [createdRows] = await pool.execute('SELECT * FROM vehicle_shares WHERE id = ?', [id]);
    const created = (createdRows as any[])[0];
    return res.status(201).json(toCamelCase(created));
  } catch (err: any) {
    console.error('[SHARING] Share error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /vehicles/:vehicleId/share/:shareId - Remove a share
router.delete('/vehicles/:vehicleId/share/:shareId', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { vehicleId, shareId } = req.params;

    // Verify the share exists and belongs to the vehicle owner
    const [existingRows] = await pool.execute(
      'SELECT id FROM vehicle_shares WHERE id = ? AND vehicle_id = ? AND owner_id = ?',
      [shareId, vehicleId, userId]
    );
    if ((existingRows as any[]).length === 0) {
      return res.status(404).json({ error: 'Share not found' });
    }

    await pool.execute('DELETE FROM vehicle_shares WHERE id = ?', [shareId]);

    return res.status(200).json({ message: 'Share removed' });
  } catch (err: any) {
    console.error('[SHARING] Remove share error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /vehicles/:vehicleId/shares - List shares for a vehicle
router.get('/vehicles/:vehicleId/shares', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { vehicleId } = req.params;

    // Verify vehicle ownership
    const [vehicleRows] = await pool.execute(
      'SELECT id FROM vehicles WHERE id = ? AND user_id = ?',
      [vehicleId, userId]
    );
    if ((vehicleRows as any[]).length === 0) {
      return res.status(404).json({ error: 'Vehicle not found or you are not the owner' });
    }

    const [rows] = await pool.execute(
      `SELECT vs.*, u.email as shared_with_email, u.username as shared_with_username
       FROM vehicle_shares vs
       JOIN users u ON u.id = vs.shared_with_user_id
       WHERE vs.vehicle_id = ?
       ORDER BY vs.created_at DESC`,
      [vehicleId]
    );

    return res.status(200).json(rowsToCamelCase(rows as any[]));
  } catch (err: any) {
    console.error('[SHARING] List shares error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /shared-with-me - List vehicles shared with current user
router.get('/shared-with-me', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;

    const [rows] = await pool.execute(
      `SELECT v.*, vs.permission, vs.id as share_id, u.username as owner_username, u.email as owner_email
       FROM vehicle_shares vs
       JOIN vehicles v ON v.id = vs.vehicle_id
       JOIN users u ON u.id = vs.owner_id
       WHERE vs.shared_with_user_id = ?
       ORDER BY vs.created_at DESC`,
      [userId]
    );

    return res.status(200).json(rowsToCamelCase(rows as any[]));
  } catch (err: any) {
    console.error('[SHARING] Shared-with-me error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
