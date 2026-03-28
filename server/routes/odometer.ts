import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getPool } from '../db';
import { combinedAuthMiddleware } from '../middleware';
import { toCamelCase, toSnakeCase, rowsToCamelCase } from '../utils';
import { fireWebhooks } from '../webhookTrigger.js';

const router = Router();
router.use(combinedAuthMiddleware);

function parseOdometerRow(row: any): any {
  const obj = toCamelCase(row);
  if (typeof obj.tags === 'string') obj.tags = JSON.parse(obj.tags);
  if (typeof obj.equipmentIds === 'string') {
    try { obj.equipmentIds = JSON.parse(obj.equipmentIds); } catch { obj.equipmentIds = []; }
  }
  if (!obj.equipmentIds) obj.equipmentIds = [];
  // Compute distance traveled
  obj.distanceTraveled = (obj.mileage || 0) - (obj.initialMileage || 0);
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
    const equipmentIdsStr = data.equipment_ids ? JSON.stringify(data.equipment_ids) : null;

    await pool.execute(`
      INSERT INTO odometer_records (id, user_id, vehicle_id, date, mileage, initial_mileage, notes, tags, equipment_ids)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      userId,
      data.vehicle_id,
      data.date || '',
      data.mileage || 0,
      data.initial_mileage || 0,
      data.notes || '',
      tagsStr,
      equipmentIdsStr
    ]);

    const [createdRows] = await pool.execute('SELECT * FROM odometer_records WHERE id = ?', [id]);
    const created = (createdRows as any[])[0];
    const result = parseOdometerRow(created);
    fireWebhooks(userId, 'record.created', { type: 'odometer', ...result });
    return res.status(201).json(result);
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
    const equipmentIdsStr = data.equipment_ids !== undefined ? JSON.stringify(data.equipment_ids) : null;

    await pool.execute(`
      UPDATE odometer_records SET
        date = COALESCE(?, date),
        mileage = COALESCE(?, mileage),
        initial_mileage = COALESCE(?, initial_mileage),
        notes = COALESCE(?, notes),
        tags = COALESCE(?, tags),
        equipment_ids = COALESCE(?, equipment_ids)
      WHERE id = ? AND user_id = ?
    `, [
      data.date ?? null,
      data.mileage ?? null,
      data.initial_mileage ?? null,
      data.notes ?? null,
      tagsStr,
      equipmentIdsStr,
      id,
      userId
    ]);

    const [updatedRows] = await pool.execute('SELECT * FROM odometer_records WHERE id = ?', [id]);
    const updated = (updatedRows as any[])[0];
    const result = parseOdometerRow(updated);
    fireWebhooks(userId, 'record.updated', { type: 'odometer', ...result });
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[ODOMETER] Update error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /recalculate/:vehicleId - recalculate distances for all odometer records
router.post('/recalculate/:vehicleId', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { vehicleId } = req.params;

    // Verify vehicle ownership
    const [vehicleRows] = await pool.execute('SELECT id FROM vehicles WHERE id = ? AND user_id = ?', [vehicleId, userId]);
    const vehicle = (vehicleRows as any[])[0];
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Get all odometer records sorted by date ascending, then mileage ascending
    const [rows] = await pool.execute(
      'SELECT * FROM odometer_records WHERE user_id = ? AND vehicle_id = ? ORDER BY date ASC, mileage ASC',
      [userId, vehicleId]
    );
    const records = rows as any[];

    // Recalculate: each record's initial_mileage = previous record's mileage
    for (let i = 0; i < records.length; i++) {
      const initialMileage = i === 0 ? 0 : records[i - 1].mileage;
      await pool.execute(
        'UPDATE odometer_records SET initial_mileage = ? WHERE id = ?',
        [initialMileage, records[i].id]
      );
    }

    // Return updated records
    const [updatedRows] = await pool.execute(
      'SELECT * FROM odometer_records WHERE user_id = ? AND vehicle_id = ? ORDER BY mileage DESC',
      [userId, vehicleId]
    );

    return res.status(200).json((updatedRows as any[]).map(parseOdometerRow));
  } catch (err: any) {
    console.error('[ODOMETER] Recalculate error:', err);
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

    fireWebhooks(userId, 'record.deleted', { type: 'odometer', id });
    return res.status(200).json({ message: 'Odometer record deleted' });
  } catch (err: any) {
    console.error('[ODOMETER] Delete error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
