import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getPool } from '../db';
import { combinedAuthMiddleware } from '../middleware';
import { toCamelCase, toSnakeCase, rowsToCamelCase } from '../utils';

const router = Router();
router.use(combinedAuthMiddleware);

function parseSupplyRow(row: any): any {
  const obj = toCamelCase(row);
  if (typeof obj.tags === 'string') obj.tags = JSON.parse(obj.tags);
  return obj;
}

// GET / - list all supplies, optional ?vehicleId=xxx
router.get('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const vehicleId = req.query.vehicleId as string | undefined;

    let rows: any[];
    if (vehicleId) {
      const [result] = await pool.execute(
        'SELECT * FROM supplies WHERE user_id = ? AND vehicle_id = ? ORDER BY created_at DESC',
        [userId, vehicleId]
      );
      rows = result as any[];
    } else {
      const [result] = await pool.execute(
        'SELECT * FROM supplies WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );
      rows = result as any[];
    }

    return res.status(200).json(rows.map(parseSupplyRow));
  } catch (err: any) {
    console.error('[SUPPLIES] List error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - single supply
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const [rows] = await pool.execute('SELECT * FROM supplies WHERE id = ? AND user_id = ?', [req.params.id, userId]);
    const row = (rows as any[])[0];

    if (!row) {
      return res.status(404).json({ error: 'Supply not found' });
    }

    return res.status(200).json(parseSupplyRow(row));
  } catch (err: any) {
    console.error('[SUPPLIES] Get error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create supply (vehicle_id can be NULL for shop supplies)
router.post('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    // If vehicleId provided, verify vehicle ownership
    const { vehicleId } = req.body;
    if (vehicleId) {
      const [vehicleRows] = await pool.execute('SELECT id FROM vehicles WHERE id = ? AND user_id = ?', [vehicleId, userId]);
      const vehicle = (vehicleRows as any[])[0];
      if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }
    }

    const id = uuid();
    const data = toSnakeCase(req.body);
    const tagsStr = data.tags ? JSON.stringify(data.tags) : null;

    await pool.execute(`
      INSERT INTO supplies (id, user_id, vehicle_id, name, part_number, description, quantity, unit_cost, notes, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      userId,
      data.vehicle_id || null,
      data.name,
      data.part_number || '',
      data.description || '',
      data.quantity || 0,
      data.unit_cost || 0,
      data.notes || '',
      tagsStr
    ]);

    const [createdRows] = await pool.execute('SELECT * FROM supplies WHERE id = ?', [id]);
    const created = (createdRows as any[])[0];
    return res.status(201).json(parseSupplyRow(created));
  } catch (err: any) {
    console.error('[SUPPLIES] Create error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update supply
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute('SELECT id FROM supplies WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Supply not found' });
    }

    const data = toSnakeCase(req.body);
    const tagsStr = data.tags !== undefined ? JSON.stringify(data.tags) : null;

    await pool.execute(`
      UPDATE supplies SET
        vehicle_id = COALESCE(?, vehicle_id),
        name = COALESCE(?, name),
        part_number = COALESCE(?, part_number),
        description = COALESCE(?, description),
        quantity = COALESCE(?, quantity),
        unit_cost = COALESCE(?, unit_cost),
        notes = COALESCE(?, notes),
        tags = COALESCE(?, tags)
      WHERE id = ? AND user_id = ?
    `, [
      data.vehicle_id ?? null,
      data.name ?? null,
      data.part_number ?? null,
      data.description ?? null,
      data.quantity ?? null,
      data.unit_cost ?? null,
      data.notes ?? null,
      tagsStr,
      id,
      userId
    ]);

    const [updatedRows] = await pool.execute('SELECT * FROM supplies WHERE id = ?', [id]);
    const updated = (updatedRows as any[])[0];
    return res.status(200).json(parseSupplyRow(updated));
  } catch (err: any) {
    console.error('[SUPPLIES] Update error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete supply
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute('SELECT id FROM supplies WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Supply not found' });
    }

    await pool.execute('DELETE FROM supplies WHERE id = ? AND user_id = ?', [id, userId]);

    return res.status(200).json({ message: 'Supply deleted' });
  } catch (err: any) {
    console.error('[SUPPLIES] Delete error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
