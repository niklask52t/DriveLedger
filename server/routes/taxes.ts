import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getPool } from '../db';
import { combinedAuthMiddleware } from '../middleware';
import { toCamelCase, toSnakeCase, rowsToCamelCase } from '../utils';
import { fireWebhooks } from '../webhookTrigger.js';

const router = Router();
router.use(combinedAuthMiddleware);

function parseTaxRow(row: any): any {
  const obj = toCamelCase(row);
  if (typeof obj.tags === 'string') obj.tags = JSON.parse(obj.tags);
  obj.isRecurring = !!obj.isRecurring;
  return obj;
}

// GET / - list all taxes, optional ?vehicleId=xxx
router.get('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const vehicleId = req.query.vehicleId as string | undefined;

    let rows: any[];
    if (vehicleId) {
      const [result] = await pool.execute(
        'SELECT * FROM taxes WHERE user_id = ? AND vehicle_id = ? ORDER BY date DESC',
        [userId, vehicleId]
      );
      rows = result as any[];
    } else {
      const [result] = await pool.execute(
        'SELECT * FROM taxes WHERE user_id = ? ORDER BY date DESC',
        [userId]
      );
      rows = result as any[];
    }

    return res.status(200).json(rows.map(parseTaxRow));
  } catch (err: any) {
    console.error('[TAXES] List error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - single tax
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const [rows] = await pool.execute('SELECT * FROM taxes WHERE id = ? AND user_id = ?', [req.params.id, userId]);
    const row = (rows as any[])[0];

    if (!row) {
      return res.status(404).json({ error: 'Tax record not found' });
    }

    return res.status(200).json(parseTaxRow(row));
  } catch (err: any) {
    console.error('[TAXES] Get error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create tax
router.post('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { vehicleId } = req.body;

    if (!vehicleId) {
      return res.status(400).json({ error: 'vehicleId is required' });
    }

    // Verify vehicle ownership
    const [vehicleRows] = await pool.execute('SELECT id FROM vehicles WHERE id = ? AND user_id = ?', [vehicleId, userId]);
    const vehicle = (vehicleRows as any[])[0];
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const id = uuid();
    const data = toSnakeCase(req.body);
    const tagsStr = data.tags ? JSON.stringify(data.tags) : null;

    await pool.execute(`
      INSERT INTO taxes (id, user_id, vehicle_id, date, description, cost, is_recurring, recurring_interval, recurring_interval_unit, due_date, notes, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      userId,
      data.vehicle_id,
      data.date || '',
      data.description || '',
      data.cost || 0,
      data.is_recurring ? 1 : 0,
      data.recurring_interval || '',
      data.recurring_interval_unit || 'months',
      data.due_date || '',
      data.notes || '',
      tagsStr
    ]);

    const [createdRows] = await pool.execute('SELECT * FROM taxes WHERE id = ?', [id]);
    const created = (createdRows as any[])[0];
    const result = parseTaxRow(created);
    fireWebhooks(userId, 'record.created', { type: 'tax', ...result });
    return res.status(201).json(result);
  } catch (err: any) {
    console.error('[TAXES] Create error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update tax
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute('SELECT id FROM taxes WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Tax record not found' });
    }

    const data = toSnakeCase(req.body);
    const tagsStr = data.tags !== undefined ? JSON.stringify(data.tags) : null;

    await pool.execute(`
      UPDATE taxes SET
        date = COALESCE(?, date),
        description = COALESCE(?, description),
        cost = COALESCE(?, cost),
        is_recurring = COALESCE(?, is_recurring),
        recurring_interval = COALESCE(?, recurring_interval),
        recurring_interval_unit = COALESCE(?, recurring_interval_unit),
        due_date = COALESCE(?, due_date),
        notes = COALESCE(?, notes),
        tags = COALESCE(?, tags)
      WHERE id = ? AND user_id = ?
    `, [
      data.date ?? null,
      data.description ?? null,
      data.cost ?? null,
      data.is_recurring !== undefined ? (data.is_recurring ? 1 : 0) : null,
      data.recurring_interval ?? null,
      data.recurring_interval_unit ?? null,
      data.due_date ?? null,
      data.notes ?? null,
      tagsStr,
      id,
      userId
    ]);

    const [updatedRows] = await pool.execute('SELECT * FROM taxes WHERE id = ?', [id]);
    const updated = (updatedRows as any[])[0];
    const result = parseTaxRow(updated);
    fireWebhooks(userId, 'record.updated', { type: 'tax', ...result });
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[TAXES] Update error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/advance - advance a recurring tax to create the next occurrence
router.post('/:id/advance', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;

    const [rows] = await pool.execute('SELECT * FROM taxes WHERE id = ? AND user_id = ?', [id, userId]);
    const row = (rows as any[])[0];
    if (!row) {
      return res.status(404).json({ error: 'Tax record not found' });
    }
    if (!row.is_recurring) {
      return res.status(400).json({ error: 'Tax record is not recurring' });
    }

    // Parse the interval
    const intervalValue = parseInt(row.recurring_interval) || 1;
    const intervalUnit = row.recurring_interval_unit || 'months';

    // Calculate new date
    const baseDate = new Date(row.date);
    let newDate: Date;
    if (intervalUnit === 'days') {
      newDate = new Date(baseDate);
      newDate.setDate(newDate.getDate() + intervalValue);
    } else {
      // months (default)
      newDate = new Date(baseDate);
      newDate.setMonth(newDate.getMonth() + intervalValue);
    }

    // Calculate new due_date if one exists
    let newDueDate = '';
    if (row.due_date) {
      const baseDue = new Date(row.due_date);
      if (intervalUnit === 'days') {
        baseDue.setDate(baseDue.getDate() + intervalValue);
      } else {
        baseDue.setMonth(baseDue.getMonth() + intervalValue);
      }
      newDueDate = baseDue.toISOString().split('T')[0];
    }

    const newId = uuid();
    const newDateStr = newDate.toISOString().split('T')[0];

    await pool.execute(`
      INSERT INTO taxes (id, user_id, vehicle_id, date, description, cost, is_recurring, recurring_interval, recurring_interval_unit, due_date, notes, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newId,
      userId,
      row.vehicle_id,
      newDateStr,
      row.description,
      row.cost,
      row.is_recurring,
      row.recurring_interval,
      row.recurring_interval_unit || 'months',
      newDueDate,
      row.notes,
      row.tags
    ]);

    const [createdRows] = await pool.execute('SELECT * FROM taxes WHERE id = ?', [newId]);
    const created = (createdRows as any[])[0];
    return res.status(201).json(parseTaxRow(created));
  } catch (err: any) {
    console.error('[TAXES] Advance error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete tax
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute('SELECT id FROM taxes WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Tax record not found' });
    }

    await pool.execute('DELETE FROM taxes WHERE id = ? AND user_id = ?', [id, userId]);

    fireWebhooks(userId, 'record.deleted', { type: 'tax', id });
    return res.status(200).json({ message: 'Tax record deleted' });
  } catch (err: any) {
    console.error('[TAXES] Delete error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
