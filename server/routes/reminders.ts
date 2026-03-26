import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getPool } from '../db';
import { combinedAuthMiddleware } from '../middleware';

const router = Router();

// All reminder routes require auth
router.use(combinedAuthMiddleware);

// GET /due - get reminders that are due (must be before /:id to avoid route conflict)
router.get('/due', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;

    const [rows] = await pool.execute(
      'SELECT * FROM reminders WHERE user_id = ? AND remind_at <= NOW() AND sent = 0 AND active = 1 ORDER BY remind_at ASC',
      [userId]
    );

    return res.status(200).json((rows as any[]).map(formatReminder));
  } catch (err: any) {
    console.error('[REMINDERS] Get due error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET / - list all reminders for current user
router.get('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { active, type } = req.query;

    let query = 'SELECT * FROM reminders WHERE user_id = ?';
    const params: any[] = [userId];

    if (active !== undefined) {
      query += ' AND active = ?';
      params.push(active === 'true' ? 1 : 0);
    }

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' ORDER BY remind_at ASC';

    const [rows] = await pool.execute(query, params);

    return res.status(200).json((rows as any[]).map(formatReminder));
  } catch (err: any) {
    console.error('[REMINDERS] List error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - single reminder
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;

    const [rows] = await pool.execute('SELECT * FROM reminders WHERE id = ? AND user_id = ?', [id, userId]);
    const row = (rows as any[])[0];

    if (!row) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    return res.status(200).json(formatReminder(row));
  } catch (err: any) {
    console.error('[REMINDERS] Get error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create reminder
router.post('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { title, description, type, entity_type, entity_id, remind_at, recurring, email_notify, mileage_threshold, current_mileage_at_creation } = req.body;

    if (!title || !type || !remind_at) {
      return res.status(400).json({ error: 'title, type, and remind_at are required' });
    }

    const validTypes = ['cost_due', 'loan_payment', 'inspection', 'insurance', 'savings_goal', 'custom'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
    }

    const validRecurring = ['', 'daily', 'weekly', 'monthly', 'yearly'];
    if (recurring && !validRecurring.includes(recurring)) {
      return res.status(400).json({ error: `Invalid recurring value. Must be one of: ${validRecurring.join(', ')}` });
    }

    const id = uuid();

    await pool.execute(
      'INSERT INTO reminders (id, user_id, title, description, type, entity_type, entity_id, remind_at, recurring, email_notify, mileage_threshold, current_mileage_at_creation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        userId,
        title,
        description || '',
        type,
        entity_type || '',
        entity_id || '',
        remind_at,
        recurring || '',
        email_notify !== undefined ? (email_notify ? 1 : 0) : 1,
        mileage_threshold ?? null,
        current_mileage_at_creation ?? null
      ]
    );

    const [createdRows] = await pool.execute('SELECT * FROM reminders WHERE id = ?', [id]);
    const row = (createdRows as any[])[0];

    return res.status(201).json(formatReminder(row));
  } catch (err: any) {
    console.error('[REMINDERS] Create error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update reminder
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute('SELECT * FROM reminders WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    const { title, description, type, entity_type, entity_id, remind_at, recurring, email_notify, active, mileage_threshold, current_mileage_at_creation } = req.body;

    if (type) {
      const validTypes = ['cost_due', 'loan_payment', 'inspection', 'insurance', 'savings_goal', 'custom'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
      }
    }

    if (recurring !== undefined && recurring !== '') {
      const validRecurring = ['', 'daily', 'weekly', 'monthly', 'yearly'];
      if (!validRecurring.includes(recurring)) {
        return res.status(400).json({ error: `Invalid recurring value. Must be one of: ${validRecurring.join(', ')}` });
      }
    }

    await pool.execute(`
      UPDATE reminders SET
        title = ?,
        description = ?,
        type = ?,
        entity_type = ?,
        entity_id = ?,
        remind_at = ?,
        recurring = ?,
        email_notify = ?,
        active = ?,
        mileage_threshold = ?,
        current_mileage_at_creation = ?
      WHERE id = ? AND user_id = ?
    `, [
      title ?? existing.title,
      description ?? existing.description,
      type ?? existing.type,
      entity_type ?? existing.entity_type,
      entity_id ?? existing.entity_id,
      remind_at ?? existing.remind_at,
      recurring ?? existing.recurring,
      email_notify !== undefined ? (email_notify ? 1 : 0) : existing.email_notify,
      active !== undefined ? (active ? 1 : 0) : existing.active,
      mileage_threshold !== undefined ? mileage_threshold : existing.mileage_threshold,
      current_mileage_at_creation !== undefined ? current_mileage_at_creation : existing.current_mileage_at_creation,
      id,
      userId
    ]);

    const [updatedRows] = await pool.execute('SELECT * FROM reminders WHERE id = ?', [id]);
    const row = (updatedRows as any[])[0];

    return res.status(200).json(formatReminder(row));
  } catch (err: any) {
    console.error('[REMINDERS] Update error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete reminder
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute('SELECT id FROM reminders WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    await pool.execute('DELETE FROM reminders WHERE id = ? AND user_id = ?', [id, userId]);

    return res.status(200).json({ message: 'Reminder deleted' });
  } catch (err: any) {
    console.error('[REMINDERS] Delete error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/snooze - snooze reminder
router.post('/:id/snooze', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { remind_at } = req.body;

    if (!remind_at) {
      return res.status(400).json({ error: 'remind_at is required' });
    }

    const [existingRows] = await pool.execute('SELECT id FROM reminders WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    await pool.execute('UPDATE reminders SET remind_at = ?, sent = 0 WHERE id = ? AND user_id = ?', [remind_at, id, userId]);

    const [updatedRows] = await pool.execute('SELECT * FROM reminders WHERE id = ?', [id]);
    const row = (updatedRows as any[])[0];

    return res.status(200).json(formatReminder(row));
  } catch (err: any) {
    console.error('[REMINDERS] Snooze error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

function formatReminder(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    type: row.type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    remindAt: row.remind_at,
    recurring: row.recurring,
    emailNotify: !!row.email_notify,
    sent: !!row.sent,
    active: !!row.active,
    mileageThreshold: row.mileage_threshold ?? null,
    currentMileageAtCreation: row.current_mileage_at_creation ?? null,
    createdAt: row.created_at,
  };
}

export default router;
