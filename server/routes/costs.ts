import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getPool } from '../db';
import { combinedAuthMiddleware } from '../middleware';
import { toCamelCase, toSnakeCase, rowsToCamelCase } from '../utils';

const router = Router();
router.use(combinedAuthMiddleware);

// GET / - list all costs, optional ?vehicleId=xxx
router.get('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const vehicleId = req.query.vehicleId as string | undefined;

    let rows: any[];
    if (vehicleId) {
      const [result] = await pool.execute(
        'SELECT * FROM costs WHERE user_id = ? AND vehicle_id = ? ORDER BY created_at DESC',
        [userId, vehicleId]
      );
      rows = result as any[];
    } else {
      const [result] = await pool.execute(
        'SELECT * FROM costs WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );
      rows = result as any[];
    }

    const parsed = rows.map((r: any) => {
      const obj = toCamelCase(r);
      if (typeof obj.tags === 'string') obj.tags = JSON.parse(obj.tags);
      return obj;
    });

    return res.status(200).json(parsed);
  } catch (err: any) {
    console.error('[COSTS] List error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - single cost
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const [rows] = await pool.execute('SELECT * FROM costs WHERE id = ? AND user_id = ?', [req.params.id, userId]);
    const row = (rows as any[])[0];

    if (!row) {
      return res.status(404).json({ error: 'Cost not found' });
    }

    const obj = toCamelCase(row);
    if (typeof obj.tags === 'string') obj.tags = JSON.parse(obj.tags);
    return res.status(200).json(obj);
  } catch (err: any) {
    console.error('[COSTS] Get error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create cost
router.post('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { vehicleId, name, category, amount } = req.body;

    if (!vehicleId || !name || !category) {
      return res.status(400).json({ error: 'vehicleId, name, and category are required' });
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
      INSERT INTO costs (id, user_id, vehicle_id, name, category, amount, frequency, paid_by, start_date, end_date, notes, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
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
      data.notes || '',
      tagsStr
    ]);

    const [createdRows] = await pool.execute('SELECT * FROM costs WHERE id = ?', [id]);
    const created = (createdRows as any[])[0];
    const createdObj = toCamelCase(created);
    if (typeof createdObj.tags === 'string') createdObj.tags = JSON.parse(createdObj.tags);
    return res.status(201).json(createdObj);
  } catch (err: any) {
    console.error('[COSTS] Create error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update cost
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute('SELECT id FROM costs WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Cost not found' });
    }

    const data = toSnakeCase(req.body);
    const tagsStr = data.tags !== undefined ? JSON.stringify(data.tags) : null;

    await pool.execute(`
      UPDATE costs SET
        name = COALESCE(?, name),
        category = COALESCE(?, category),
        amount = COALESCE(?, amount),
        frequency = COALESCE(?, frequency),
        paid_by = COALESCE(?, paid_by),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        notes = COALESCE(?, notes),
        tags = COALESCE(?, tags)
      WHERE id = ? AND user_id = ?
    `, [
      data.name ?? null,
      data.category ?? null,
      data.amount ?? null,
      data.frequency ?? null,
      data.paid_by ?? null,
      data.start_date ?? null,
      data.end_date ?? null,
      data.notes ?? null,
      tagsStr,
      id,
      userId
    ]);

    const [updatedRows] = await pool.execute('SELECT * FROM costs WHERE id = ?', [id]);
    const updated = (updatedRows as any[])[0];
    const updatedObj = toCamelCase(updated);
    if (typeof updatedObj.tags === 'string') updatedObj.tags = JSON.parse(updatedObj.tags);
    return res.status(200).json(updatedObj);
  } catch (err: any) {
    console.error('[COSTS] Update error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete cost
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute('SELECT id FROM costs WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Cost not found' });
    }

    await pool.execute('DELETE FROM costs WHERE id = ? AND user_id = ?', [id, userId]);

    return res.status(200).json({ message: 'Cost deleted' });
  } catch (err: any) {
    console.error('[COSTS] Delete error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
