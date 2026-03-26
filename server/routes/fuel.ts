import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getPool } from '../db';
import { combinedAuthMiddleware } from '../middleware';
import { toCamelCase, toSnakeCase, rowsToCamelCase } from '../utils';

const router = Router();
router.use(combinedAuthMiddleware);

function parseFuelRow(row: any): any {
  const obj = toCamelCase(row);
  if (typeof obj.tags === 'string') obj.tags = JSON.parse(obj.tags);
  obj.isPartialFill = !!obj.isPartialFill;
  obj.isMissedEntry = !!obj.isMissedEntry;
  return obj;
}

// GET / - list all fuel records, optional ?vehicleId=xxx
router.get('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const vehicleId = req.query.vehicleId as string | undefined;

    let rows: any[];
    if (vehicleId) {
      const [result] = await pool.execute(
        'SELECT * FROM fuel_records WHERE user_id = ? AND vehicle_id = ? ORDER BY date DESC, mileage DESC',
        [userId, vehicleId]
      );
      rows = result as any[];
    } else {
      const [result] = await pool.execute(
        'SELECT * FROM fuel_records WHERE user_id = ? ORDER BY date DESC, mileage DESC',
        [userId]
      );
      rows = result as any[];
    }

    return res.status(200).json(rows.map(parseFuelRow));
  } catch (err: any) {
    console.error('[FUEL] List error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /vehicle/:vehicleId/consumption - calculate L/100km from consecutive non-partial fills
router.get('/vehicle/:vehicleId/consumption', async (req: Request, res: Response) => {
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

    // Get all non-partial, non-missed fuel records ordered by mileage
    const [rows] = await pool.execute(
      'SELECT mileage, fuel_amount, fuel_cost, date FROM fuel_records WHERE user_id = ? AND vehicle_id = ? AND is_partial_fill = 0 AND is_missed_entry = 0 ORDER BY mileage ASC',
      [userId, vehicleId]
    );
    const records = rows as any[];

    const consumptionEntries: any[] = [];
    for (let i = 1; i < records.length; i++) {
      const prev = records[i - 1];
      const curr = records[i];
      const distanceKm = curr.mileage - prev.mileage;
      if (distanceKm > 0) {
        const litersPer100km = (curr.fuel_amount / distanceKm) * 100;
        const costPerKm = curr.fuel_cost / distanceKm;
        consumptionEntries.push({
          date: curr.date,
          mileage: curr.mileage,
          distanceKm,
          fuelAmount: curr.fuel_amount,
          fuelCost: curr.fuel_cost,
          litersPer100km: Math.round(litersPer100km * 100) / 100,
          costPerKm: Math.round(costPerKm * 100) / 100,
        });
      }
    }

    const avgConsumption = consumptionEntries.length > 0
      ? Math.round((consumptionEntries.reduce((sum, e) => sum + e.litersPer100km, 0) / consumptionEntries.length) * 100) / 100
      : 0;

    return res.status(200).json({
      vehicleId,
      averageConsumption: avgConsumption,
      entries: consumptionEntries,
    });
  } catch (err: any) {
    console.error('[FUEL] Consumption error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - single fuel record
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const [rows] = await pool.execute('SELECT * FROM fuel_records WHERE id = ? AND user_id = ?', [req.params.id, userId]);
    const row = (rows as any[])[0];

    if (!row) {
      return res.status(404).json({ error: 'Fuel record not found' });
    }

    return res.status(200).json(parseFuelRow(row));
  } catch (err: any) {
    console.error('[FUEL] Get error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create fuel record
router.post('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { vehicleId, mileage, fuelAmount } = req.body;

    if (!vehicleId || mileage === undefined || fuelAmount === undefined) {
      return res.status(400).json({ error: 'vehicleId, mileage, and fuelAmount are required' });
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
      INSERT INTO fuel_records (id, user_id, vehicle_id, date, mileage, fuel_amount, fuel_cost, is_partial_fill, is_missed_entry, fuel_type, station, notes, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      userId,
      data.vehicle_id,
      data.date || '',
      data.mileage || 0,
      data.fuel_amount || 0,
      data.fuel_cost || 0,
      data.is_partial_fill ? 1 : 0,
      data.is_missed_entry ? 1 : 0,
      data.fuel_type || '',
      data.station || '',
      data.notes || '',
      tagsStr
    ]);

    const [createdRows] = await pool.execute('SELECT * FROM fuel_records WHERE id = ?', [id]);
    const created = (createdRows as any[])[0];
    return res.status(201).json(parseFuelRow(created));
  } catch (err: any) {
    console.error('[FUEL] Create error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update fuel record
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute('SELECT id FROM fuel_records WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Fuel record not found' });
    }

    const data = toSnakeCase(req.body);
    const tagsStr = data.tags !== undefined ? JSON.stringify(data.tags) : null;

    await pool.execute(`
      UPDATE fuel_records SET
        date = COALESCE(?, date),
        mileage = COALESCE(?, mileage),
        fuel_amount = COALESCE(?, fuel_amount),
        fuel_cost = COALESCE(?, fuel_cost),
        is_partial_fill = COALESCE(?, is_partial_fill),
        is_missed_entry = COALESCE(?, is_missed_entry),
        fuel_type = COALESCE(?, fuel_type),
        station = COALESCE(?, station),
        notes = COALESCE(?, notes),
        tags = COALESCE(?, tags)
      WHERE id = ? AND user_id = ?
    `, [
      data.date ?? null,
      data.mileage ?? null,
      data.fuel_amount ?? null,
      data.fuel_cost ?? null,
      data.is_partial_fill !== undefined ? (data.is_partial_fill ? 1 : 0) : null,
      data.is_missed_entry !== undefined ? (data.is_missed_entry ? 1 : 0) : null,
      data.fuel_type ?? null,
      data.station ?? null,
      data.notes ?? null,
      tagsStr,
      id,
      userId
    ]);

    const [updatedRows] = await pool.execute('SELECT * FROM fuel_records WHERE id = ?', [id]);
    const updated = (updatedRows as any[])[0];
    return res.status(200).json(parseFuelRow(updated));
  } catch (err: any) {
    console.error('[FUEL] Update error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete fuel record
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute('SELECT id FROM fuel_records WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Fuel record not found' });
    }

    await pool.execute('DELETE FROM fuel_records WHERE id = ? AND user_id = ?', [id, userId]);

    return res.status(200).json({ message: 'Fuel record deleted' });
  } catch (err: any) {
    console.error('[FUEL] Delete error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
