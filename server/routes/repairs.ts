import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getPool } from '../db';
import { combinedAuthMiddleware } from '../middleware';
import { toCamelCase, toSnakeCase, rowsToCamelCase } from '../utils';

const router = Router();
router.use(combinedAuthMiddleware);

// GET / - list all repairs, optional ?vehicleId=xxx
router.get('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const vehicleId = req.query.vehicleId as string | undefined;

    let rows: any[];
    if (vehicleId) {
      const [result] = await pool.execute(
        'SELECT * FROM repairs WHERE user_id = ? AND vehicle_id = ? ORDER BY created_at DESC',
        [userId, vehicleId]
      );
      rows = result as any[];
    } else {
      const [result] = await pool.execute(
        'SELECT * FROM repairs WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );
      rows = result as any[];
    }

    return res.status(200).json(rowsToCamelCase(rows));
  } catch (err: any) {
    console.error('[REPAIRS] List error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - single repair
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const [rows] = await pool.execute('SELECT * FROM repairs WHERE id = ? AND user_id = ?', [req.params.id, userId]);
    const row = (rows as any[])[0];

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
router.post('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { vehicleId, description } = req.body;

    if (!vehicleId || !description) {
      return res.status(400).json({ error: 'vehicleId and description are required' });
    }

    // Verify vehicle ownership
    const [vehicleRows] = await pool.execute('SELECT id FROM vehicles WHERE id = ? AND user_id = ?', [vehicleId, userId]);
    const vehicle = (vehicleRows as any[])[0];
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const id = uuid();
    const data = toSnakeCase(req.body);

    await pool.execute(`
      INSERT INTO repairs (id, user_id, vehicle_id, date, description, category, notes, cost, mileage, workshop)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
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
    ]);

    const [createdRows] = await pool.execute('SELECT * FROM repairs WHERE id = ?', [id]);
    const created = (createdRows as any[])[0];
    return res.status(201).json(toCamelCase(created));
  } catch (err: any) {
    console.error('[REPAIRS] Create error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update repair
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute('SELECT id FROM repairs WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Repair not found' });
    }

    const data = toSnakeCase(req.body);

    await pool.execute(`
      UPDATE repairs SET
        date = COALESCE(?, date),
        description = COALESCE(?, description),
        category = COALESCE(?, category),
        notes = COALESCE(?, notes),
        cost = COALESCE(?, cost),
        mileage = COALESCE(?, mileage),
        workshop = COALESCE(?, workshop)
      WHERE id = ? AND user_id = ?
    `, [
      data.date ?? null,
      data.description ?? null,
      data.category ?? null,
      data.notes ?? null,
      data.cost ?? null,
      data.mileage ?? null,
      data.workshop ?? null,
      id,
      userId
    ]);

    const [updatedRows] = await pool.execute('SELECT * FROM repairs WHERE id = ?', [id]);
    const updated = (updatedRows as any[])[0];
    return res.status(200).json(toCamelCase(updated));
  } catch (err: any) {
    console.error('[REPAIRS] Update error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete repair
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute('SELECT id FROM repairs WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Repair not found' });
    }

    await pool.execute('DELETE FROM repairs WHERE id = ? AND user_id = ?', [id, userId]);

    return res.status(200).json({ message: 'Repair deleted' });
  } catch (err: any) {
    console.error('[REPAIRS] Delete error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
