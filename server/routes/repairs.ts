import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db';
import { combinedAuthMiddleware } from '../middleware';
import { toCamelCase, toSnakeCase, rowsToCamelCase } from '../utils';

const router = Router();
router.use(combinedAuthMiddleware);

// GET / - list all repairs, optional ?vehicleId=xxx
router.get('/', (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const vehicleId = req.query.vehicleId as string | undefined;

    let rows: any[];
    if (vehicleId) {
      rows = db.prepare(
        'SELECT * FROM repairs WHERE user_id = ? AND vehicle_id = ? ORDER BY created_at DESC'
      ).all(userId, vehicleId) as any[];
    } else {
      rows = db.prepare(
        'SELECT * FROM repairs WHERE user_id = ? ORDER BY created_at DESC'
      ).all(userId) as any[];
    }

    return res.status(200).json(rowsToCamelCase(rows));
  } catch (err: any) {
    console.error('[REPAIRS] List error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - single repair
router.get('/:id', (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const row = db.prepare('SELECT * FROM repairs WHERE id = ? AND user_id = ?').get(req.params.id, userId) as any;

    if (!row) {
      return res.status(404).json({ error: 'Repair not found' });
    }

    return res.status(200).json(toCamelCase(row));
  } catch (err: any) {
    console.error('[REPAIRS] Get error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create repair
router.post('/', (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { vehicleId, description } = req.body;

    if (!vehicleId || !description) {
      return res.status(400).json({ error: 'vehicleId and description are required' });
    }

    // Verify vehicle ownership
    const vehicle = db.prepare('SELECT id FROM vehicles WHERE id = ? AND user_id = ?').get(vehicleId, userId) as any;
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const id = uuid();
    const data = toSnakeCase(req.body);

    db.prepare(`
      INSERT INTO repairs (id, user_id, vehicle_id, date, description, category, notes, cost, mileage, workshop)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      userId,
      data.vehicle_id,
      data.date || '',
      data.description,
      data.category || '',
      data.notes || '',
      data.cost || 0,
      data.mileage || 0,
      data.workshop || ''
    );

    const created = db.prepare('SELECT * FROM repairs WHERE id = ?').get(id) as any;
    return res.status(201).json(toCamelCase(created));
  } catch (err: any) {
    console.error('[REPAIRS] Create error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update repair
router.put('/:id', (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const existing = db.prepare('SELECT id FROM repairs WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Repair not found' });
    }

    const data = toSnakeCase(req.body);

    db.prepare(`
      UPDATE repairs SET
        date = COALESCE(?, date),
        description = COALESCE(?, description),
        category = COALESCE(?, category),
        notes = COALESCE(?, notes),
        cost = COALESCE(?, cost),
        mileage = COALESCE(?, mileage),
        workshop = COALESCE(?, workshop)
      WHERE id = ? AND user_id = ?
    `).run(
      data.date ?? null,
      data.description ?? null,
      data.category ?? null,
      data.notes ?? null,
      data.cost ?? null,
      data.mileage ?? null,
      data.workshop ?? null,
      id,
      userId
    );

    const updated = db.prepare('SELECT * FROM repairs WHERE id = ?').get(id) as any;
    return res.status(200).json(toCamelCase(updated));
  } catch (err: any) {
    console.error('[REPAIRS] Update error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete repair
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const existing = db.prepare('SELECT id FROM repairs WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Repair not found' });
    }

    db.prepare('DELETE FROM repairs WHERE id = ? AND user_id = ?').run(id, userId);

    return res.status(200).json({ message: 'Repair deleted' });
  } catch (err: any) {
    console.error('[REPAIRS] Delete error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
