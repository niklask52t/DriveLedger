import { Router, Request, Response, NextFunction } from 'express';
import { getPool } from '../db.js';
import { rowsToCamelCase } from '../utils.js';

const router = Router();

const KIOSK_TOKEN = process.env.KIOSK_TOKEN || '';

/**
 * Kiosk auth middleware.
 * Validates the kiosk token from query param or Authorization header.
 * Also resolves the user from the kiosk_user_id query param or KIOSK_USER_ID env var.
 */
async function kioskAuthMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!KIOSK_TOKEN) {
    res.status(503).json({ error: 'Kiosk mode is not configured. Set KIOSK_TOKEN env var.' });
    return;
  }

  const token = (req.query.token as string) || req.headers['x-kiosk-token'] as string;

  if (!token || token !== KIOSK_TOKEN) {
    res.status(401).json({ error: 'Invalid or missing kiosk token' });
    return;
  }

  // Resolve the user ID for kiosk display
  const kioskUserId = (req.query.userId as string) || process.env.KIOSK_USER_ID;
  if (!kioskUserId) {
    res.status(400).json({ error: 'userId query param or KIOSK_USER_ID env var is required' });
    return;
  }

  // Verify user exists
  const pool = getPool();
  const [userRows] = await pool.execute('SELECT id FROM users WHERE id = ?', [kioskUserId]);
  if ((userRows as any[]).length === 0) {
    res.status(404).json({ error: 'Kiosk user not found' });
    return;
  }

  (req as any).kioskUserId = kioskUserId;
  next();
}

router.use(kioskAuthMiddleware);

// GET /kiosk/vehicles - Returns all vehicles for the kiosk user (read-only)
router.get('/vehicles', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).kioskUserId;

    const [rows] = await pool.execute(
      'SELECT * FROM vehicles WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    return res.status(200).json(rowsToCamelCase(rows as any[]));
  } catch (err: any) {
    console.error('[KIOSK] Vehicles error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /kiosk/reminders - Returns all due reminders for the kiosk user
router.get('/reminders', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).kioskUserId;

    const [rows] = await pool.execute(
      `SELECT * FROM reminders
       WHERE user_id = ? AND active = 1
       ORDER BY remind_at ASC`,
      [userId]
    );

    return res.status(200).json(rowsToCamelCase(rows as any[]));
  } catch (err: any) {
    console.error('[KIOSK] Reminders error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
