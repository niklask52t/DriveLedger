import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db';
import { combinedAuthMiddleware } from '../middleware';

const router = Router();

// All reminder routes require auth
router.use(combinedAuthMiddleware);

// GET /due - get reminders that are due (must be before /:id to avoid route conflict)
router.get('/due', (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const rows = db.prepare(
      "SELECT * FROM reminders WHERE user_id = ? AND remind_at <= datetime('now') AND sent = 0 AND active = 1 ORDER BY remind_at ASC"
    ).all(userId) as any[];

    return res.status(200).json(rows.map(formatReminder));
  } catch (err: any) {
    console.error('[REMINDERS] Get due error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET / - list all reminders for current user
router.get('/', (req: Request, res: Response) => {
  try {
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

    const rows = db.prepare(query).all(...params) as any[];

    return res.status(200).json(rows.map(formatReminder));
  } catch (err: any) {
    console.error('[REMINDERS] List error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - single reminder
router.get('/:id', (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const row = db.prepare('SELECT * FROM reminders WHERE id = ? AND user_id = ?').get(id, userId) as any;

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
router.post('/', (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { title, description, type, entity_type, entity_id, remind_at, recurring, email_notify } = req.body;

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

    db.prepare(
      'INSERT INTO reminders (id, user_id, title, description, type, entity_type, entity_id, remind_at, recurring, email_notify) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      id,
      userId,
      title,
      description || '',
      type,
      entity_type || '',
      entity_id || '',
      remind_at,
      recurring || '',
      email_notify !== undefined ? (email_notify ? 1 : 0) : 1
    );

    const row = db.prepare('SELECT * FROM reminders WHERE id = ?').get(id) as any;

    return res.status(201).json(formatReminder(row));
  } catch (err: any) {
    console.error('[REMINDERS] Create error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update reminder
router.put('/:id', (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM reminders WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    const { title, description, type, entity_type, entity_id, remind_at, recurring, email_notify, active } = req.body;

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

    db.prepare(`
      UPDATE reminders SET
        title = ?,
        description = ?,
        type = ?,
        entity_type = ?,
        entity_id = ?,
        remind_at = ?,
        recurring = ?,
        email_notify = ?,
        active = ?
      WHERE id = ? AND user_id = ?
    `).run(
      title ?? existing.title,
      description ?? existing.description,
      type ?? existing.type,
      entity_type ?? existing.entity_type,
      entity_id ?? existing.entity_id,
      remind_at ?? existing.remind_at,
      recurring ?? existing.recurring,
      email_notify !== undefined ? (email_notify ? 1 : 0) : existing.email_notify,
      active !== undefined ? (active ? 1 : 0) : existing.active,
      id,
      userId
    );

    const row = db.prepare('SELECT * FROM reminders WHERE id = ?').get(id) as any;

    return res.status(200).json(formatReminder(row));
  } catch (err: any) {
    console.error('[REMINDERS] Update error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete reminder
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const existing = db.prepare('SELECT id FROM reminders WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    db.prepare('DELETE FROM reminders WHERE id = ? AND user_id = ?').run(id, userId);

    return res.status(200).json({ message: 'Reminder deleted' });
  } catch (err: any) {
    console.error('[REMINDERS] Delete error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/snooze - snooze reminder
router.post('/:id/snooze', (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { remind_at } = req.body;

    if (!remind_at) {
      return res.status(400).json({ error: 'remind_at is required' });
    }

    const existing = db.prepare('SELECT id FROM reminders WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    db.prepare('UPDATE reminders SET remind_at = ?, sent = 0 WHERE id = ? AND user_id = ?').run(remind_at, id, userId);

    const row = db.prepare('SELECT * FROM reminders WHERE id = ?').get(id) as any;

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
    createdAt: row.created_at,
  };
}

export default router;
