import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import QRCode from 'qrcode';
import { getPool } from '../db';
import { combinedAuthMiddleware } from '../middleware';
import { toCamelCase, toSnakeCase, rowsToCamelCase } from '../utils';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const router = Router();
router.use(combinedAuthMiddleware);

// GET / - list all vehicles for current user
router.get('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const [rows] = await pool.execute('SELECT * FROM vehicles WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    return res.status(200).json(rowsToCamelCase(rows as any[]));
  } catch (err: any) {
    console.error('[VEHICLES] List error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - get single vehicle
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const [rows] = await pool.execute('SELECT * FROM vehicles WHERE id = ? AND user_id = ?', [req.params.id, userId]);
    const row = (rows as any[])[0];

    if (!row) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    return res.status(200).json(toCamelCase(row));
  } catch (err: any) {
    console.error('[VEHICLES] Get error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create vehicle
router.post('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const id = uuid();
    const data = toSnakeCase(req.body);

    await pool.execute(`
      INSERT INTO vehicles (
        id, user_id, name, brand, model, variant, license_plate, hsn, tsn,
        first_registration, purchase_price, purchase_date, current_mileage,
        annual_mileage, fuel_type, avg_consumption, fuel_price, horse_power,
        image_url, status, mobile_de_link, notes, color
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
    `, [
      id,
      userId,
      data.name || '',
      data.brand || '',
      data.model || '',
      data.variant || '',
      data.license_plate || '',
      data.hsn || '',
      data.tsn || '',
      data.first_registration || '',
      data.purchase_price || 0,
      data.purchase_date || '',
      data.current_mileage || 0,
      data.annual_mileage || 0,
      data.fuel_type || 'benzin',
      data.avg_consumption || 0,
      data.fuel_price || 0,
      data.horse_power || 0,
      data.image_url || '',
      data.status || 'owned',
      data.mobile_de_link || '',
      data.notes || '',
      data.color || ''
    ]);

    const [createdRows] = await pool.execute('SELECT * FROM vehicles WHERE id = ?', [id]);
    const created = (createdRows as any[])[0];
    return res.status(201).json(toCamelCase(created));
  } catch (err: any) {
    console.error('[VEHICLES] Create error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update vehicle
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;

    // Verify ownership
    const [existingRows] = await pool.execute('SELECT id FROM vehicles WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const data = toSnakeCase(req.body);

    await pool.execute(`
      UPDATE vehicles SET
        name = COALESCE(?, name),
        brand = COALESCE(?, brand),
        model = COALESCE(?, model),
        variant = COALESCE(?, variant),
        license_plate = COALESCE(?, license_plate),
        hsn = COALESCE(?, hsn),
        tsn = COALESCE(?, tsn),
        first_registration = COALESCE(?, first_registration),
        purchase_price = COALESCE(?, purchase_price),
        purchase_date = COALESCE(?, purchase_date),
        current_mileage = COALESCE(?, current_mileage),
        annual_mileage = COALESCE(?, annual_mileage),
        fuel_type = COALESCE(?, fuel_type),
        avg_consumption = COALESCE(?, avg_consumption),
        fuel_price = COALESCE(?, fuel_price),
        horse_power = COALESCE(?, horse_power),
        image_url = COALESCE(?, image_url),
        status = COALESCE(?, status),
        mobile_de_link = COALESCE(?, mobile_de_link),
        notes = COALESCE(?, notes),
        color = COALESCE(?, color)
      WHERE id = ? AND user_id = ?
    `, [
      data.name ?? null,
      data.brand ?? null,
      data.model ?? null,
      data.variant ?? null,
      data.license_plate ?? null,
      data.hsn ?? null,
      data.tsn ?? null,
      data.first_registration ?? null,
      data.purchase_price ?? null,
      data.purchase_date ?? null,
      data.current_mileage ?? null,
      data.annual_mileage ?? null,
      data.fuel_type ?? null,
      data.avg_consumption ?? null,
      data.fuel_price ?? null,
      data.horse_power ?? null,
      data.image_url ?? null,
      data.status ?? null,
      data.mobile_de_link ?? null,
      data.notes ?? null,
      data.color ?? null,
      id,
      userId
    ]);

    const [updatedRows] = await pool.execute('SELECT * FROM vehicles WHERE id = ?', [id]);
    const updated = (updatedRows as any[])[0];
    return res.status(200).json(toCamelCase(updated));
  } catch (err: any) {
    console.error('[VEHICLES] Update error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id/qr - Generate QR code PNG for the vehicle's detail URL
router.get('/:id/qr', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;

    // Verify ownership
    const [existingRows] = await pool.execute('SELECT id FROM vehicles WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const url = `${FRONTEND_URL}/vehicle/${id}`;
    const qrBuffer = await QRCode.toBuffer(url, {
      type: 'png',
      width: 300,
      margin: 2,
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="vehicle-${id}-qr.png"`);
    return res.status(200).send(qrBuffer);
  } catch (err: any) {
    console.error('[VEHICLES] QR error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete vehicle + cascade
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;

    // Verify ownership
    const [existingRows] = await pool.execute('SELECT id FROM vehicles WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Cascade delete related data
    const conn = await pool.getConnection();
    await conn.beginTransaction();
    try {
      // Delete savings transactions for savings goals of this vehicle
      await conn.execute(`
        DELETE FROM savings_transactions WHERE savings_goal_id IN (
          SELECT id FROM savings_goals WHERE vehicle_id = ? AND user_id = ?
        )
      `, [id, userId]);

      await conn.execute('DELETE FROM costs WHERE vehicle_id = ? AND user_id = ?', [id, userId]);
      await conn.execute('DELETE FROM loans WHERE vehicle_id = ? AND user_id = ?', [id, userId]);
      await conn.execute('DELETE FROM repairs WHERE vehicle_id = ? AND user_id = ?', [id, userId]);
      await conn.execute('DELETE FROM savings_goals WHERE vehicle_id = ? AND user_id = ?', [id, userId]);
      await conn.execute('DELETE FROM service_records WHERE vehicle_id = ? AND user_id = ?', [id, userId]);
      await conn.execute('DELETE FROM upgrade_records WHERE vehicle_id = ? AND user_id = ?', [id, userId]);
      await conn.execute('DELETE FROM fuel_records WHERE vehicle_id = ? AND user_id = ?', [id, userId]);
      await conn.execute('DELETE FROM odometer_records WHERE vehicle_id = ? AND user_id = ?', [id, userId]);
      await conn.execute('DELETE FROM inspections WHERE vehicle_id = ? AND user_id = ?', [id, userId]);
      await conn.execute('DELETE FROM vehicle_notes WHERE vehicle_id = ? AND user_id = ?', [id, userId]);
      await conn.execute('DELETE FROM taxes WHERE vehicle_id = ? AND user_id = ?', [id, userId]);
      await conn.execute('DELETE FROM planner_tasks WHERE vehicle_id = ? AND user_id = ?', [id, userId]);
      await conn.execute('DELETE FROM supplies WHERE vehicle_id = ? AND user_id = ?', [id, userId]);
      await conn.execute('DELETE FROM equipment WHERE vehicle_id = ? AND user_id = ?', [id, userId]);
      await conn.execute('DELETE FROM vehicle_shares WHERE vehicle_id = ?', [id]);
      await conn.execute('DELETE FROM vehicles WHERE id = ? AND user_id = ?', [id, userId]);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    return res.status(200).json({ message: 'Vehicle and all related data deleted' });
  } catch (err: any) {
    console.error('[VEHICLES] Delete error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
