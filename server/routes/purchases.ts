import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getPool } from '../db';
import { combinedAuthMiddleware } from '../middleware';
import { toCamelCase, toSnakeCase, rowsToCamelCase } from '../utils';

const router = Router();
router.use(combinedAuthMiddleware);

// GET / - list all planned purchases
router.get('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.user!.id;
    const [rows] = await pool.execute(
      'SELECT * FROM planned_purchases WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return res.status(200).json(rowsToCamelCase(rows as any[]));
  } catch (err: any) {
    console.error('[PURCHASES] List error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - single purchase
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.user!.id;
    const [rows] = await pool.execute(
      'SELECT * FROM planned_purchases WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    );
    const row = (rows as any[])[0];

    if (!row) {
      return res.status(404).json({ error: 'Planned purchase not found' });
    }

    return res.status(200).json(toCamelCase(row));
  } catch (err: any) {
    console.error('[PURCHASES] Get error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create purchase
router.post('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.user!.id;
    const { brand, model } = req.body;

    if (!brand || !model) {
      return res.status(400).json({ error: 'brand and model are required' });
    }

    const id = uuid();
    const data = toSnakeCase(req.body);

    await pool.execute(`
      INSERT INTO planned_purchases (
        id, user_id, brand, model, variant, price, mobile_de_link, image_url,
        year, mileage, fuel_type, horse_power, down_payment, financing_months,
        interest_rate, monthly_rate, estimated_insurance, estimated_tax,
        estimated_fuel_monthly, estimated_maintenance, notes, pros, cons, rating
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?
      )
    `, [
      id,
      userId,
      data.brand,
      data.model,
      data.variant || '',
      data.price || 0,
      data.mobile_de_link || '',
      data.image_url || '',
      data.year || 0,
      data.mileage || 0,
      data.fuel_type || 'benzin',
      data.horse_power || 0,
      data.down_payment || 0,
      data.financing_months || 0,
      data.interest_rate || 0,
      data.monthly_rate || 0,
      data.estimated_insurance || 0,
      data.estimated_tax || 0,
      data.estimated_fuel_monthly || 0,
      data.estimated_maintenance || 0,
      data.notes || '',
      data.pros || '',
      data.cons || '',
      data.rating || 0
    ]);

    const [createdRows] = await pool.execute('SELECT * FROM planned_purchases WHERE id = ?', [id]);
    const created = (createdRows as any[])[0];
    return res.status(201).json(toCamelCase(created));
  } catch (err: any) {
    console.error('[PURCHASES] Create error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update purchase
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.user!.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute(
      'SELECT id FROM planned_purchases WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Planned purchase not found' });
    }

    const data = toSnakeCase(req.body);

    await pool.execute(`
      UPDATE planned_purchases SET
        brand = COALESCE(?, brand),
        model = COALESCE(?, model),
        variant = COALESCE(?, variant),
        price = COALESCE(?, price),
        mobile_de_link = COALESCE(?, mobile_de_link),
        image_url = COALESCE(?, image_url),
        year = COALESCE(?, year),
        mileage = COALESCE(?, mileage),
        fuel_type = COALESCE(?, fuel_type),
        horse_power = COALESCE(?, horse_power),
        down_payment = COALESCE(?, down_payment),
        financing_months = COALESCE(?, financing_months),
        interest_rate = COALESCE(?, interest_rate),
        monthly_rate = COALESCE(?, monthly_rate),
        estimated_insurance = COALESCE(?, estimated_insurance),
        estimated_tax = COALESCE(?, estimated_tax),
        estimated_fuel_monthly = COALESCE(?, estimated_fuel_monthly),
        estimated_maintenance = COALESCE(?, estimated_maintenance),
        notes = COALESCE(?, notes),
        pros = COALESCE(?, pros),
        cons = COALESCE(?, cons),
        rating = COALESCE(?, rating)
      WHERE id = ? AND user_id = ?
    `, [
      data.brand ?? null,
      data.model ?? null,
      data.variant ?? null,
      data.price ?? null,
      data.mobile_de_link ?? null,
      data.image_url ?? null,
      data.year ?? null,
      data.mileage ?? null,
      data.fuel_type ?? null,
      data.horse_power ?? null,
      data.down_payment ?? null,
      data.financing_months ?? null,
      data.interest_rate ?? null,
      data.monthly_rate ?? null,
      data.estimated_insurance ?? null,
      data.estimated_tax ?? null,
      data.estimated_fuel_monthly ?? null,
      data.estimated_maintenance ?? null,
      data.notes ?? null,
      data.pros ?? null,
      data.cons ?? null,
      data.rating ?? null,
      id,
      userId
    ]);

    const [updatedRows] = await pool.execute('SELECT * FROM planned_purchases WHERE id = ?', [id]);
    const updated = (updatedRows as any[])[0];
    return res.status(200).json(toCamelCase(updated));
  } catch (err: any) {
    console.error('[PURCHASES] Update error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete purchase
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.user!.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute(
      'SELECT id FROM planned_purchases WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Planned purchase not found' });
    }

    await pool.execute('DELETE FROM planned_purchases WHERE id = ? AND user_id = ?', [id, userId]);

    return res.status(200).json({ message: 'Planned purchase deleted' });
  } catch (err: any) {
    console.error('[PURCHASES] Delete error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/convert - convert planned purchase to vehicle
router.post('/:id/convert', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.user!.id;
    const { id } = req.params;

    const [purchaseRows] = await pool.execute(
      'SELECT * FROM planned_purchases WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    const purchase = (purchaseRows as any[])[0];

    if (!purchase) {
      return res.status(404).json({ error: 'Planned purchase not found' });
    }

    const vehicleId = uuid();

    const conn = await pool.getConnection();
    await conn.beginTransaction();
    try {
      // Create vehicle from purchase data
      await conn.execute(`
        INSERT INTO vehicles (
          id, user_id, name, brand, model, variant, purchase_price,
          current_mileage, fuel_type, horse_power, image_url, status,
          mobile_de_link, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        vehicleId,
        userId,
        `${purchase.brand} ${purchase.model}`,
        purchase.brand,
        purchase.model,
        purchase.variant || '',
        purchase.price || 0,
        purchase.mileage || 0,
        purchase.fuel_type || 'benzin',
        purchase.horse_power || 0,
        purchase.image_url || '',
        'owned',
        purchase.mobile_de_link || '',
        purchase.notes || ''
      ]);

      // Delete the planned purchase
      await conn.execute('DELETE FROM planned_purchases WHERE id = ? AND user_id = ?', [id, userId]);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    const [vehicleRows] = await pool.execute('SELECT * FROM vehicles WHERE id = ?', [vehicleId]);
    const vehicle = (vehicleRows as any[])[0];
    return res.status(201).json(toCamelCase(vehicle));
  } catch (err: any) {
    console.error('[PURCHASES] Convert error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
