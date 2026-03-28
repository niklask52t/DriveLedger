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

    // For date-based: remind_at <= NOW()
    // For odometer-based: target_mileage <= vehicle's current_mileage
    // For both: whichever comes first
    const [rows] = await pool.execute(
      `SELECT r.* FROM reminders r
       LEFT JOIN vehicles v ON r.vehicle_id = v.id
       WHERE r.user_id = ? AND r.sent = 0 AND r.active = 1
       AND (
         (r.metric = 'date' AND r.remind_at <= NOW())
         OR (r.metric = 'odometer' AND r.target_mileage IS NOT NULL AND v.current_mileage IS NOT NULL AND r.target_mileage <= v.current_mileage)
         OR (r.metric = 'both' AND (
           (r.remind_at IS NOT NULL AND r.remind_at <= NOW())
           OR (r.target_mileage IS NOT NULL AND v.current_mileage IS NOT NULL AND r.target_mileage <= v.current_mileage)
         ))
       )
       ORDER BY r.remind_at ASC`,
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
    const { title, description, type, entity_type, entity_id, remind_at, recurring, email_notify, mileage_threshold, current_mileage_at_creation, metric, target_mileage, mileage_interval, vehicle_id, fixed_interval, custom_thresholds } = req.body;

    const effectiveMetric = metric || 'date';

    if (!title || !type) {
      return res.status(400).json({ error: 'title and type are required' });
    }

    // For date or both metric, remind_at is required
    if ((effectiveMetric === 'date' || effectiveMetric === 'both') && !remind_at) {
      return res.status(400).json({ error: 'remind_at is required for date-based reminders' });
    }

    // For odometer or both metric, target_mileage and vehicle_id are required
    if ((effectiveMetric === 'odometer' || effectiveMetric === 'both') && (!target_mileage || !vehicle_id)) {
      return res.status(400).json({ error: 'target_mileage and vehicle_id are required for mileage-based reminders' });
    }

    const validMetrics = ['date', 'odometer', 'both'];
    if (!validMetrics.includes(effectiveMetric)) {
      return res.status(400).json({ error: `Invalid metric. Must be one of: ${validMetrics.join(', ')}` });
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
      'INSERT INTO reminders (id, user_id, title, description, type, entity_type, entity_id, remind_at, recurring, email_notify, mileage_threshold, current_mileage_at_creation, metric, target_mileage, mileage_interval, vehicle_id, fixed_interval, custom_thresholds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        userId,
        title,
        description || '',
        type,
        entity_type || '',
        entity_id || '',
        remind_at || null,
        recurring || '',
        email_notify !== undefined ? (email_notify ? 1 : 0) : 1,
        mileage_threshold ?? null,
        current_mileage_at_creation ?? null,
        effectiveMetric,
        target_mileage ?? null,
        mileage_interval ?? null,
        vehicle_id || null,
        fixed_interval ? 1 : 0,
        custom_thresholds ? (typeof custom_thresholds === 'string' ? custom_thresholds : JSON.stringify(custom_thresholds)) : null
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

    const { title, description, type, entity_type, entity_id, remind_at, recurring, email_notify, active, mileage_threshold, current_mileage_at_creation, metric, target_mileage, mileage_interval, vehicle_id, fixed_interval, custom_thresholds } = req.body;

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
        current_mileage_at_creation = ?,
        metric = ?,
        target_mileage = ?,
        mileage_interval = ?,
        vehicle_id = ?,
        fixed_interval = ?,
        custom_thresholds = ?
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
      metric !== undefined ? metric : existing.metric,
      target_mileage !== undefined ? target_mileage : existing.target_mileage,
      mileage_interval !== undefined ? mileage_interval : existing.mileage_interval,
      vehicle_id !== undefined ? vehicle_id : existing.vehicle_id,
      fixed_interval !== undefined ? (fixed_interval ? 1 : 0) : existing.fixed_interval,
      custom_thresholds !== undefined ? (custom_thresholds ? (typeof custom_thresholds === 'string' ? custom_thresholds : JSON.stringify(custom_thresholds)) : null) : existing.custom_thresholds,
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

    const [existingRows] = await pool.execute('SELECT * FROM reminders WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    const metric = existing.metric || 'date';

    // For date-based or both: require remind_at
    if ((metric === 'date' || metric === 'both') && !remind_at) {
      return res.status(400).json({ error: 'remind_at is required for date-based reminders' });
    }

    // Build update fields
    const updates: string[] = ['sent = 0'];
    const params: any[] = [];

    if (remind_at) {
      updates.push('remind_at = ?');
      params.push(remind_at);
    }

    // For recurring mileage reminders, bump target_mileage by mileage_interval
    if ((metric === 'odometer' || metric === 'both') && existing.mileage_interval && existing.target_mileage) {
      updates.push('target_mileage = ?');
      params.push(existing.target_mileage + existing.mileage_interval);
    }

    params.push(id, userId);
    await pool.execute(`UPDATE reminders SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, params);

    const [updatedRows] = await pool.execute('SELECT * FROM reminders WHERE id = ?', [id]);
    const row = (updatedRows as any[])[0];

    return res.status(200).json(formatReminder(row));
  } catch (err: any) {
    console.error('[REMINDERS] Snooze error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/complete - mark reminder as done (with recurring mileage handling)
router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute('SELECT * FROM reminders WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    const metric = existing.metric || 'date';
    const hasRecurring = existing.recurring && existing.recurring !== '';
    const hasMileageInterval = existing.mileage_interval && existing.mileage_interval > 0;

    // If recurring (date or mileage), reset for next occurrence instead of deactivating
    if (hasRecurring || hasMileageInterval) {
      const updates: string[] = ['sent = 0'];
      const params: any[] = [];

      // Bump mileage target if applicable
      if ((metric === 'odometer' || metric === 'both') && hasMileageInterval && existing.target_mileage) {
        updates.push('target_mileage = ?');
        params.push(existing.target_mileage + existing.mileage_interval);
      }

      // Bump date if applicable and recurring
      if ((metric === 'date' || metric === 'both') && hasRecurring && existing.remind_at) {
        const isFixedInterval = !!existing.fixed_interval;
        // If fixed_interval: advance from the ORIGINAL due date + interval (not from today)
        // If not fixed_interval: advance from today + interval (existing behavior)
        const baseDate = isFixedInterval ? new Date(existing.remind_at) : new Date();
        const next = new Date(baseDate);
        switch (existing.recurring) {
          case 'daily': next.setDate(next.getDate() + 1); break;
          case 'weekly': next.setDate(next.getDate() + 7); break;
          case 'monthly': next.setMonth(next.getMonth() + 1); break;
          case 'yearly': next.setFullYear(next.getFullYear() + 1); break;
        }
        updates.push('remind_at = ?');
        params.push(next.toISOString());
      }

      params.push(id, userId);
      await pool.execute(`UPDATE reminders SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, params);
    } else {
      // Non-recurring: just deactivate
      await pool.execute('UPDATE reminders SET active = 0 WHERE id = ? AND user_id = ?', [id, userId]);
    }

    const [updatedRows] = await pool.execute('SELECT * FROM reminders WHERE id = ?', [id]);
    const row = (updatedRows as any[])[0];

    return res.status(200).json(formatReminder(row));
  } catch (err: any) {
    console.error('[REMINDERS] Complete error:', err);
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
    metric: row.metric || 'date',
    targetMileage: row.target_mileage ?? null,
    mileageInterval: row.mileage_interval ?? null,
    vehicleId: row.vehicle_id || null,
    fixedInterval: !!row.fixed_interval,
    customThresholds: row.custom_thresholds ? (typeof row.custom_thresholds === 'string' ? JSON.parse(row.custom_thresholds) : row.custom_thresholds) : null,
    createdAt: row.created_at,
  };
}

export default router;
