import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getPool } from '../db';
import { combinedAuthMiddleware } from '../middleware';
import { toCamelCase, toSnakeCase, rowsToCamelCase } from '../utils';

const router = Router();
router.use(combinedAuthMiddleware);

function parseOdometerRow(row: any): any {
  const obj = toCamelCase(row);
  if (typeof obj.tags === 'string') obj.tags = JSON.parse(obj.tags);
  return obj;
}

// GET / - list all odometer records, optional ?vehicleId=xxx
router.get('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const vehicleId = req.query.vehicleId as string | undefined;

    let rows: any[];
    if (vehicleId) {
      const [result] = await pool.execute(
        'SELECT * FROM odometer_records WHERE user_id = ? AND vehicle_id = ? ORDER BY mileage DESC',
        [userId, vehicleId]
      );
      rows = result as any[];
    } else {
      const [result] = await pool.execute(
        'SELECT * FROM odometer_records WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );
      rows = result as any[];
    }

    return res.status(200).json(rows.map(parseOdometerRow));
  } catch (err: any) {
    console.error('[ODOMETER] List error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - single odometer record
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const [rows] = await pool.execute('SELECT * FROM odometer_records WHERE id = ? AND user_id = ?', [req.params.id, userId]);
    const row = (rows as any[])[0];

    if (!row) {
      return res.status(404).json({ error: 'Odometer record not found' });
    }

    return res.status(200).json(parseOdometerRow(row));
  } catch (err: any) {
    console.error('[ODOMETER] Get error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create odometer record
router.post('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { vehicleId, mileage } = req.body;

    if (!vehicleId || mileage === undefined) {
      return res.status(400).json({ error: 'vehicleId and mileage are required' });
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
      INSERT INTO odometer_records (id, user_id, vehicle_id, date, mileage, notes, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      userId,
      data.vehicle_id,
      data.date || '',
      data.mileage || 0,
      data.notes || '',
      tagsStr
    ]);

    const [createdRows] = await pool.execute('SELECT * FROM odometer_records WHERE id = ?', [id]);
    const created = (createdRows as any[])[0];
    return res.status(201).json(parseOdometerRow(created));
  } catch (err: any) {
    console.error('[ODOMETER] Create error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update odometer record
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute('SELECT id FROM odometer_records WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Odometer record not found' });
    }

    const data = toSnakeCase(req.body);
    const tagsStr = data.tags !== undefined ? JSON.stringify(data.tags) : null;

    await pool.execute(`
      UPDATE odometer_records SET
        date = COALESCE(?, date),
        mileage = COALESCE(?, mileage),
        notes = COALESCE(?, notes),
        tags = COALESCE(?, tags)
      WHERE id = ? AND user_id = ?
    `, [
      data.date ?? null,
      data.mileage ?? null,
      data.notes ?? null,
      tagsStr,
      id,
      userId
    ]);

    const [updatedRows] = await pool.execute('SELECT * FROM odometer_records WHERE id = ?', [id]);
    const updated = (updatedRows as any[])[0];
    return res.status(200).json(parseOdometerRow(updated));
  } catch (err: any) {
    console.error('[ODOMETER] Update error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete odometer record
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute('SELECT id FROM odometer_records WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Odometer record not found' });
    }

    await pool.execute('DELETE FROM odometer_records WHERE id = ? AND user_id = ?', [id, userId]);

    return res.status(200).json({ message: 'Odometer record deleted' });
  } catch (err: any) {
    console.error('[ODOMETER] Delete error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
