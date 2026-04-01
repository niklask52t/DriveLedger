import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getPool } from '../db';
import { combinedAuthMiddleware } from '../middleware';
import { toCamelCase, toSnakeCase, rowsToCamelCase } from '../utils';

const router = Router();
router.use(combinedAuthMiddleware);

function parseEquipmentRow(row: any): any {
  const obj = toCamelCase(row);
  obj.isEquipped = !!obj.isEquipped;
  return obj;
}

// GET /distance-summary - total distance per equipment from linked odometer records
router.get('/distance-summary', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.user!.id;

    // Get all odometer records with equipment_ids
    const [odomRows] = await pool.execute(
      'SELECT mileage, initial_mileage, equipment_ids FROM odometer_records WHERE user_id = ? AND equipment_ids IS NOT NULL',
      [userId]
    );
    const records = odomRows as any[];

    const distanceMap: Record<string, number> = {};
    for (const r of records) {
      let eqIds: string[] = [];
      if (typeof r.equipment_ids === 'string') {
        try { eqIds = JSON.parse(r.equipment_ids); } catch { continue; }
      } else if (Array.isArray(r.equipment_ids)) {
        eqIds = r.equipment_ids;
      }
      const dist = (r.mileage || 0) - (r.initial_mileage || 0);
      if (dist <= 0) continue;
      for (const eqId of eqIds) {
        distanceMap[eqId] = (distanceMap[eqId] || 0) + dist;
      }
    }

    return res.status(200).json(distanceMap);
  } catch (err: any) {
    console.error('[EQUIPMENT] Distance summary error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET / - list all equipment, optional ?vehicleId=xxx
router.get('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.user!.id;
    const vehicleId = req.query.vehicleId as string | undefined;

    let rows: any[];
    if (vehicleId) {
      const [result] = await pool.execute(
        'SELECT * FROM equipment WHERE user_id = ? AND vehicle_id = ? ORDER BY created_at DESC',
        [userId, vehicleId]
      );
      rows = result as any[];
    } else {
      const [result] = await pool.execute(
        'SELECT * FROM equipment WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );
      rows = result as any[];
    }

    return res.status(200).json(rows.map(parseEquipmentRow));
  } catch (err: any) {
    console.error('[EQUIPMENT] List error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - single equipment
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.user!.id;
    const [rows] = await pool.execute('SELECT * FROM equipment WHERE id = ? AND user_id = ?', [req.params.id, userId]);
    const row = (rows as any[])[0];

    if (!row) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    return res.status(200).json(parseEquipmentRow(row));
  } catch (err: any) {
    console.error('[EQUIPMENT] Get error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create equipment
router.post('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.user!.id;
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

    await pool.execute(`
      INSERT INTO equipment (id, user_id, vehicle_id, name, description, is_equipped, total_distance, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      userId,
      data.vehicle_id || null,
      data.name,
      data.description || '',
      data.is_equipped !== undefined ? (data.is_equipped ? 1 : 0) : 1,
      data.total_distance || 0,
      data.notes || ''
    ]);

    const [createdRows] = await pool.execute('SELECT * FROM equipment WHERE id = ?', [id]);
    const created = (createdRows as any[])[0];
    return res.status(201).json(parseEquipmentRow(created));
  } catch (err: any) {
    console.error('[EQUIPMENT] Create error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update equipment
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.user!.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute('SELECT id FROM equipment WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    const data = toSnakeCase(req.body);

    await pool.execute(`
      UPDATE equipment SET
        vehicle_id = COALESCE(?, vehicle_id),
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        is_equipped = COALESCE(?, is_equipped),
        total_distance = COALESCE(?, total_distance),
        notes = COALESCE(?, notes)
      WHERE id = ? AND user_id = ?
    `, [
      data.vehicle_id ?? null,
      data.name ?? null,
      data.description ?? null,
      data.is_equipped !== undefined ? (data.is_equipped ? 1 : 0) : null,
      data.total_distance ?? null,
      data.notes ?? null,
      id,
      userId
    ]);

    const [updatedRows] = await pool.execute('SELECT * FROM equipment WHERE id = ?', [id]);
    const updated = (updatedRows as any[])[0];
    return res.status(200).json(parseEquipmentRow(updated));
  } catch (err: any) {
    console.error('[EQUIPMENT] Update error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id/reassign - reassign equipment to different vehicle
router.put('/:id/reassign', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.user!.id;
    const { id } = req.params;
    const { vehicleId } = req.body;

    const [existingRows] = await pool.execute('SELECT id FROM equipment WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    // If vehicleId provided, verify vehicle ownership
    if (vehicleId) {
      const [vehicleRows] = await pool.execute('SELECT id FROM vehicles WHERE id = ? AND user_id = ?', [vehicleId, userId]);
      const vehicle = (vehicleRows as any[])[0];
      if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }
    }

    await pool.execute('UPDATE equipment SET vehicle_id = ? WHERE id = ? AND user_id = ?', [vehicleId || null, id, userId]);

    const [updatedRows] = await pool.execute('SELECT * FROM equipment WHERE id = ?', [id]);
    const updated = (updatedRows as any[])[0];
    return res.status(200).json(parseEquipmentRow(updated));
  } catch (err: any) {
    console.error('[EQUIPMENT] Reassign error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete equipment
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.user!.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute('SELECT id FROM equipment WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    await pool.execute('DELETE FROM equipment WHERE id = ? AND user_id = ?', [id, userId]);

    return res.status(200).json({ message: 'Equipment deleted' });
  } catch (err: any) {
    console.error('[EQUIPMENT] Delete error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
