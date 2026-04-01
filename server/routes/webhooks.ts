import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import { getPool } from '../db.js';
import { combinedAuthMiddleware } from '../middleware.js';
import { toCamelCase, rowsToCamelCase } from '../utils.js';

const router = Router();
router.use(combinedAuthMiddleware);

const VALID_EVENTS = [
  'vehicle.created',
  'vehicle.updated',
  'vehicle.deleted',
  'record.created',
  'record.updated',
  'record.deleted',
];

// GET / - list all webhooks for current user
router.get('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.user!.id;

    const [rows] = await pool.execute(
      'SELECT * FROM webhooks WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    const parsed = (rows as any[]).map((r: any) => {
      const obj = toCamelCase(r);
      if (typeof obj.events === 'string') obj.events = JSON.parse(obj.events);
      return obj;
    });

    return res.status(200).json(parsed);
  } catch (err: any) {
    console.error('[WEBHOOKS] List error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create a webhook
router.post('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.user!.id;
    const { url, events, isActive } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'url is required' });
    }

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'events must be a non-empty array' });
    }

    // Validate events
    for (const ev of events) {
      if (!VALID_EVENTS.includes(ev)) {
        return res.status(400).json({ error: `Invalid event: ${ev}. Valid events: ${VALID_EVENTS.join(', ')}` });
      }
    }

    const id = uuid();
    const secret = crypto.randomBytes(32).toString('hex');

    await pool.execute(
      `INSERT INTO webhooks (id, user_id, url, events, is_active, secret) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, userId, url, JSON.stringify(events), isActive !== false ? 1 : 0, secret]
    );

    const [createdRows] = await pool.execute('SELECT * FROM webhooks WHERE id = ?', [id]);
    const created = (createdRows as any[])[0];
    const obj = toCamelCase(created);
    if (typeof obj.events === 'string') obj.events = JSON.parse(obj.events);
    // Include the secret only on creation
    obj.secret = secret;
    return res.status(201).json(obj);
  } catch (err: any) {
    console.error('[WEBHOOKS] Create error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update a webhook
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.user!.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute(
      'SELECT id FROM webhooks WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    const { url, events, isActive } = req.body;

    // Validate events if provided
    if (events !== undefined) {
      if (!Array.isArray(events) || events.length === 0) {
        return res.status(400).json({ error: 'events must be a non-empty array' });
      }
      for (const ev of events) {
        if (!VALID_EVENTS.includes(ev)) {
          return res.status(400).json({ error: `Invalid event: ${ev}` });
        }
      }
    }

    await pool.execute(
      `UPDATE webhooks SET
        url = COALESCE(?, url),
        events = COALESCE(?, events),
        is_active = COALESCE(?, is_active)
      WHERE id = ? AND user_id = ?`,
      [
        url ?? null,
        events !== undefined ? JSON.stringify(events) : null,
        isActive !== undefined ? (isActive ? 1 : 0) : null,
        id,
        userId,
      ]
    );

    const [updatedRows] = await pool.execute('SELECT * FROM webhooks WHERE id = ?', [id]);
    const updated = (updatedRows as any[])[0];
    const obj = toCamelCase(updated);
    if (typeof obj.events === 'string') obj.events = JSON.parse(obj.events);
    return res.status(200).json(obj);
  } catch (err: any) {
    console.error('[WEBHOOKS] Update error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete a webhook
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.user!.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute(
      'SELECT id FROM webhooks WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    await pool.execute('DELETE FROM webhooks WHERE id = ? AND user_id = ?', [id, userId]);

    return res.status(200).json({ message: 'Webhook deleted' });
  } catch (err: any) {
    console.error('[WEBHOOKS] Delete error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
