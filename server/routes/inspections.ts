import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getPool } from '../db';
import { combinedAuthMiddleware } from '../middleware';
import { toCamelCase, toSnakeCase, rowsToCamelCase } from '../utils';

const router = Router();
router.use(combinedAuthMiddleware);

function parseInspectionRow(row: any): any {
  const obj = toCamelCase(row);
  if (typeof obj.items === 'string') obj.items = JSON.parse(obj.items);
  return obj;
}

// GET / - list all inspections, optional ?vehicleId=xxx
router.get('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const vehicleId = req.query.vehicleId as string | undefined;

    let rows: any[];
    if (vehicleId) {
      const [result] = await pool.execute(
        'SELECT * FROM inspections WHERE user_id = ? AND vehicle_id = ? ORDER BY date DESC',
        [userId, vehicleId]
      );
      rows = result as any[];
    } else {
      const [result] = await pool.execute(
        'SELECT * FROM inspections WHERE user_id = ? ORDER BY date DESC',
        [userId]
      );
      rows = result as any[];
    }

    return res.status(200).json(rows.map(parseInspectionRow));
  } catch (err: any) {
    console.error('[INSPECTIONS] List error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - single inspection
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const [rows] = await pool.execute('SELECT * FROM inspections WHERE id = ? AND user_id = ?', [req.params.id, userId]);
    const row = (rows as any[])[0];

    if (!row) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    return res.status(200).json(parseInspectionRow(row));
  } catch (err: any) {
    console.error('[INSPECTIONS] Get error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create inspection
router.post('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { vehicleId, title } = req.body;

    if (!vehicleId || !title) {
      return res.status(400).json({ error: 'vehicleId and title are required' });
    }

    // Verify vehicle ownership
    const [vehicleRows] = await pool.execute('SELECT id FROM vehicles WHERE id = ? AND user_id = ?', [vehicleId, userId]);
    const vehicle = (vehicleRows as any[])[0];
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const id = uuid();
    const data = toSnakeCase(req.body);
    const itemsStr = data.items ? JSON.stringify(data.items) : null;

    await pool.execute(`
      INSERT INTO inspections (id, user_id, vehicle_id, date, title, items, overall_result, mileage, cost, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      userId,
      data.vehicle_id,
      data.date || '',
      data.title,
      itemsStr,
      data.overall_result || '',
      data.mileage || 0,
      data.cost || 0,
      data.notes || ''
    ]);

    const [createdRows] = await pool.execute('SELECT * FROM inspections WHERE id = ?', [id]);
    const created = (createdRows as any[])[0];
    return res.status(201).json(parseInspectionRow(created));
  } catch (err: any) {
    console.error('[INSPECTIONS] Create error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update inspection
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute('SELECT id FROM inspections WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    const data = toSnakeCase(req.body);
    const itemsStr = data.items !== undefined ? JSON.stringify(data.items) : null;

    await pool.execute(`
      UPDATE inspections SET
        date = COALESCE(?, date),
        title = COALESCE(?, title),
        items = COALESCE(?, items),
        overall_result = COALESCE(?, overall_result),
        mileage = COALESCE(?, mileage),
        cost = COALESCE(?, cost),
        notes = COALESCE(?, notes)
      WHERE id = ? AND user_id = ?
    `, [
      data.date ?? null,
      data.title ?? null,
      itemsStr,
      data.overall_result ?? null,
      data.mileage ?? null,
      data.cost ?? null,
      data.notes ?? null,
      id,
      userId
    ]);

    const [updatedRows] = await pool.execute('SELECT * FROM inspections WHERE id = ?', [id]);
    const updated = (updatedRows as any[])[0];
    return res.status(200).json(parseInspectionRow(updated));
  } catch (err: any) {
    console.error('[INSPECTIONS] Update error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete inspection
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute('SELECT id FROM inspections WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    await pool.execute('DELETE FROM inspections WHERE id = ? AND user_id = ?', [id, userId]);

    return res.status(200).json({ message: 'Inspection deleted' });
  } catch (err: any) {
    console.error('[INSPECTIONS] Delete error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
