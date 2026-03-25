import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db';
import { combinedAuthMiddleware } from '../middleware';
import { toCamelCase, toSnakeCase, rowsToCamelCase } from '../utils';

const router = Router();
router.use(combinedAuthMiddleware);

// GET / - list all costs, optional ?vehicleId=xxx
router.get('/', (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const vehicleId = req.query.vehicleId as string | undefined;

    let rows: any[];
    if (vehicleId) {
      rows = db.prepare(
        'SELECT * FROM costs WHERE user_id = ? AND vehicle_id = ? ORDER BY created_at DESC'
      ).all(userId, vehicleId) as any[];
    } else {
      rows = db.prepare(
        'SELECT * FROM costs WHERE user_id = ? ORDER BY created_at DESC'
      ).all(userId) as any[];
    }

    return res.status(200).json(rowsToCamelCase(rows));
  } catch (err: any) {
    console.error('[COSTS] List error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - single cost
router.get('/:id', (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const row = db.prepare('SELECT * FROM costs WHERE id = ? AND user_id = ?').get(req.params.id, userId) as any;

    if (!row) {
      return res.status(404).json({ error: 'Cost not found' });
    }

    return res.status(200).json(toCamelCase(row));
  } catch (err: any) {
    console.error('[COSTS] Get error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create cost
router.post('/', (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { vehicleId, name, category, amount } = req.body;

    if (!vehicleId || !name || !category) {
      return res.status(400).json({ error: 'vehicleId, name, and category are required' });
    }

    // Verify vehicle ownership
    const vehicle = db.prepare('SELECT id FROM vehicles WHERE id = ? AND user_id = ?').get(vehicleId, userId) as any;
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const id = uuid();
    const data = toSnakeCase(req.body);

    db.prepare(`
      INSERT INTO costs (id, user_id, vehicle_id, name, category, amount, frequency, paid_by, start_date, end_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      userId,
      data.vehicle_id,
      data.name,
      data.category,
      data.amount || 0,
      data.frequency || 'einmalig',
      data.paid_by || '',
      data.start_date || '',
      data.end_date || '',
      data.notes || ''
    );

    const created = db.prepare('SELECT * FROM costs WHERE id = ?').get(id) as any;
    return res.status(201).json(toCamelCase(created));
  } catch (err: any) {
    console.error('[COSTS] Create error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update cost
router.put('/:id', (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const existing = db.prepare('SELECT id FROM costs WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Cost not found' });
    }

    const data = toSnakeCase(req.body);

    db.prepare(`
      UPDATE costs SET
        name = COALESCE(?, name),
        category = COALESCE(?, category),
        amount = COALESCE(?, amount),
        frequency = COALESCE(?, frequency),
        paid_by = COALESCE(?, paid_by),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        notes = COALESCE(?, notes)
      WHERE id = ? AND user_id = ?
    `).run(
      data.name ?? null,
      data.category ?? null,
      data.amount ?? null,
      data.frequency ?? null,
      data.paid_by ?? null,
      data.start_date ?? null,
      data.end_date ?? null,
      data.notes ?? null,
      id,
      userId
    );

    const updated = db.prepare('SELECT * FROM costs WHERE id = ?').get(id) as any;
    return res.status(200).json(toCamelCase(updated));
  } catch (err: any) {
    console.error('[COSTS] Update error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete cost
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const existing = db.prepare('SELECT id FROM costs WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Cost not found' });
    }

    db.prepare('DELETE FROM costs WHERE id = ? AND user_id = ?').run(id, userId);

    return res.status(200).json({ message: 'Cost deleted' });
  } catch (err: any) {
    console.error('[COSTS] Delete error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
