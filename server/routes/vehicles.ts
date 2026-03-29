import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import QRCode from 'qrcode';
import { getPool } from '../db';
import { combinedAuthMiddleware } from '../middleware';
import { toCamelCase, toSnakeCase, rowsToCamelCase } from '../utils';
import { fireWebhooks } from '../webhookTrigger.js';

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
        image_url, status, mobile_de_link, notes, color,
        sold_price, sold_date, is_electric, map_data,
        use_hours, odometer_optional, dashboard_metrics,
        odometer_multiplier, odometer_difference, tags, exclude_from_kiosk,
        estimated_insurance, estimated_tax, estimated_maintenance, estimated_financing
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?
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
      data.color || '',
      data.sold_price ?? null,
      data.sold_date ?? null,
      data.is_electric ? 1 : 0,
      data.map_data ? JSON.stringify(data.map_data) : null,
      data.use_hours ? 1 : 0,
      data.odometer_optional ? 1 : 0,
      data.dashboard_metrics ? JSON.stringify(data.dashboard_metrics) : '["total_cost","cost_per_km"]',
      data.odometer_multiplier ?? 1.0,
      data.odometer_difference ?? 0,
      data.tags ? JSON.stringify(data.tags) : null,
      data.exclude_from_kiosk ? 1 : 0,
      data.estimated_insurance || 0,
      data.estimated_tax || 0,
      data.estimated_maintenance || 0,
      data.estimated_financing || 0
    ]);

    const [createdRows] = await pool.execute('SELECT * FROM vehicles WHERE id = ?', [id]);
    const created = (createdRows as any[])[0];
    const result = toCamelCase(created);
    fireWebhooks(userId, 'vehicle.created', result);
    return res.status(201).json(result);
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

    // Handle map_data serialization
    const mapDataValue = data.map_data !== undefined
      ? (data.map_data ? JSON.stringify(data.map_data) : null)
      : undefined;

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
        color = COALESCE(?, color),
        sold_price = COALESCE(?, sold_price),
        sold_date = COALESCE(?, sold_date),
        is_electric = COALESCE(?, is_electric),
        map_data = COALESCE(?, map_data),
        use_hours = COALESCE(?, use_hours),
        odometer_optional = COALESCE(?, odometer_optional),
        dashboard_metrics = COALESCE(?, dashboard_metrics),
        odometer_multiplier = COALESCE(?, odometer_multiplier),
        odometer_difference = COALESCE(?, odometer_difference),
        tags = COALESCE(?, tags),
        exclude_from_kiosk = COALESCE(?, exclude_from_kiosk),
        estimated_insurance = COALESCE(?, estimated_insurance),
        estimated_tax = COALESCE(?, estimated_tax),
        estimated_maintenance = COALESCE(?, estimated_maintenance),
        estimated_financing = COALESCE(?, estimated_financing)
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
      data.sold_price ?? null,
      data.sold_date ?? null,
      data.is_electric !== undefined ? (data.is_electric ? 1 : 0) : null,
      mapDataValue ?? null,
      data.use_hours !== undefined ? (data.use_hours ? 1 : 0) : null,
      data.odometer_optional !== undefined ? (data.odometer_optional ? 1 : 0) : null,
      data.dashboard_metrics !== undefined ? JSON.stringify(data.dashboard_metrics) : null,
      data.odometer_multiplier ?? null,
      data.odometer_difference ?? null,
      data.tags !== undefined ? JSON.stringify(data.tags) : null,
      data.exclude_from_kiosk !== undefined ? (data.exclude_from_kiosk ? 1 : 0) : null,
      data.estimated_insurance ?? null,
      data.estimated_tax ?? null,
      data.estimated_maintenance ?? null,
      data.estimated_financing ?? null,
      id,
      userId
    ]);

    const [updatedRows] = await pool.execute('SELECT * FROM vehicles WHERE id = ?', [id]);
    const updated = (updatedRows as any[])[0];
    const result = toCamelCase(updated);
    fireWebhooks(userId, 'vehicle.updated', result);
    return res.status(200).json(result);
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

    fireWebhooks(userId, 'vehicle.deleted', { id });
    return res.status(200).json({ message: 'Vehicle and all related data deleted' });
  } catch (err: any) {
    console.error('[VEHICLES] Delete error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
