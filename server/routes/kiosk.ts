import { Router, Request, Response, NextFunction } from 'express';
import { getPool } from '../db.js';
import { rowsToCamelCase } from '../utils.js';

const router = Router();

const KIOSK_TOKEN = process.env.KIOSK_TOKEN || '';

/**
 * Kiosk auth middleware.
 * Validates the kiosk token from query param or Authorization header.
 * Also resolves the user from the kiosk_user_id query param or KIOSK_USER_ID env var.
 */
async function kioskAuthMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!KIOSK_TOKEN) {
    res.status(503).json({ error: 'Kiosk mode is not configured. Set KIOSK_TOKEN env var.' });
    return;
  }

  const token = (req.query.token as string) || req.headers['x-kiosk-token'] as string;

  if (!token || token !== KIOSK_TOKEN) {
    res.status(401).json({ error: 'Invalid or missing kiosk token' });
    return;
  }

  // Resolve the user ID for kiosk display
  const kioskUserId = (req.query.userId as string) || process.env.KIOSK_USER_ID;
  if (!kioskUserId) {
    res.status(400).json({ error: 'userId query param or KIOSK_USER_ID env var is required' });
    return;
  }

  // Verify user exists
  try {
    const pool = getPool();
    const [userRows] = await pool.execute('SELECT id FROM users WHERE id = ?', [kioskUserId]);
    if ((userRows as any[]).length === 0) {
      res.status(404).json({ error: 'Kiosk user not found' });
      return;
    }

    (req as any).kioskUserId = kioskUserId;
    next();
  } catch (err) {
    console.error('[KIOSK] Middleware error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

router.use(kioskAuthMiddleware);

// GET /kiosk/stream - SSE endpoint for real-time kiosk updates
router.get('/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send initial connected event
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  // Send an update immediately, then poll every 30 seconds
  const sendUpdate = async () => {
    try {
      const pool = getPool();
      const userId = (req as any).kioskUserId;

      const [vehicles] = await pool.execute(
        'SELECT * FROM vehicles WHERE user_id = ? AND (exclude_from_kiosk = 0 OR exclude_from_kiosk IS NULL) ORDER BY created_at DESC',
        [userId]
      );
      const [reminders] = await pool.execute(
        'SELECT * FROM reminders WHERE user_id = ? AND active = 1 AND remind_at <= NOW()',
        [userId]
      );

      res.write(`data: ${JSON.stringify({
        type: 'update',
        vehicles: rowsToCamelCase(vehicles as any[]),
        reminders: rowsToCamelCase(reminders as any[]),
      })}\n\n`);
    } catch {
      // Connection may have closed, ignore errors
    }
  };

  // Send first update immediately
  sendUpdate();

  const interval = setInterval(sendUpdate, 30000);

  req.on('close', () => {
    clearInterval(interval);
  });
});

// GET /kiosk/vehicles - Returns all vehicles for the kiosk user (read-only)
router.get('/vehicles', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).kioskUserId;

    const [rows] = await pool.execute(
      'SELECT * FROM vehicles WHERE user_id = ? AND (exclude_from_kiosk = 0 OR exclude_from_kiosk IS NULL) ORDER BY created_at DESC',
      [userId]
    );

    return res.status(200).json(rowsToCamelCase(rows as any[]));
  } catch (err: any) {
    console.error('[KIOSK] Vehicles error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /kiosk/reminders - Returns all due reminders for the kiosk user
router.get('/reminders', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).kioskUserId;

    const [rows] = await pool.execute(
      `SELECT * FROM reminders
       WHERE user_id = ? AND active = 1
       ORDER BY remind_at ASC`,
      [userId]
    );

    return res.status(200).json(rowsToCamelCase(rows as any[]));
  } catch (err: any) {
    console.error('[KIOSK] Reminders error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /kiosk/vehicles/:vehicleId/info - Detailed vehicle stats for kiosk display
router.get('/vehicles/:vehicleId/info', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).kioskUserId;
    const { vehicleId } = req.params;

    // Get vehicle
    const [vehicleRows] = await pool.execute(
      'SELECT * FROM vehicles WHERE id = ? AND user_id = ? AND (exclude_from_kiosk = 0 OR exclude_from_kiosk IS NULL)',
      [vehicleId, userId]
    );
    const vehicle = (vehicleRows as any[])[0];
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found or excluded from kiosk' });
    }

    // Recent services (last 5)
    const [services] = await pool.execute(
      'SELECT * FROM service_records WHERE user_id = ? AND vehicle_id = ? ORDER BY date DESC LIMIT 5',
      [userId, vehicleId]
    );

    // Upcoming reminders
    const [reminders] = await pool.execute(
      'SELECT * FROM reminders WHERE user_id = ? AND vehicle_id = ? AND active = 1 AND sent = 0 ORDER BY remind_at ASC LIMIT 5',
      [userId, vehicleId]
    );

    // Fuel economy (last 10 records)
    const [fuelRecords] = await pool.execute(
      'SELECT * FROM fuel_records WHERE user_id = ? AND vehicle_id = ? ORDER BY date DESC LIMIT 10',
      [userId, vehicleId]
    );
    const fuelArr = fuelRecords as any[];
    let avgEconomy = 0;
    if (fuelArr.length >= 2) {
      let totalFuel = 0;
      let totalDistance = 0;
      for (let i = 0; i < fuelArr.length - 1; i++) {
        totalFuel += fuelArr[i].fuel_amount || 0;
        totalDistance += (fuelArr[i].mileage || 0) - (fuelArr[i + 1].mileage || 0);
      }
      if (totalDistance > 0 && totalFuel > 0) {
        avgEconomy = (totalFuel / totalDistance) * 100; // l/100km
      }
    }

    // Total costs
    const [costRows] = await pool.execute(
      `SELECT
        COALESCE(SUM(s.cost), 0) as service_cost,
        COALESCE(SUM(f.fuel_cost), 0) as fuel_cost
       FROM (SELECT 1) dummy
       LEFT JOIN (SELECT cost FROM service_records WHERE user_id = ? AND vehicle_id = ?) s ON 1=1
       LEFT JOIN (SELECT fuel_cost FROM fuel_records WHERE user_id = ? AND vehicle_id = ?) f ON 1=1`,
      [userId, vehicleId, userId, vehicleId]
    );

    // Get separate sums more reliably
    const [svcSum] = await pool.execute('SELECT COALESCE(SUM(cost),0) as total FROM service_records WHERE user_id=? AND vehicle_id=?', [userId, vehicleId]);
    const [fuelSum] = await pool.execute('SELECT COALESCE(SUM(fuel_cost),0) as total FROM fuel_records WHERE user_id=? AND vehicle_id=?', [userId, vehicleId]);
    const [repairSum] = await pool.execute('SELECT COALESCE(SUM(cost),0) as total FROM repairs WHERE user_id=? AND vehicle_id=?', [userId, vehicleId]);
    const [upgradeSum] = await pool.execute('SELECT COALESCE(SUM(cost),0) as total FROM upgrade_records WHERE user_id=? AND vehicle_id=?', [userId, vehicleId]);

    return res.status(200).json({
      vehicle: rowsToCamelCase([vehicle])[0],
      recentServices: rowsToCamelCase(services as any[]),
      upcomingReminders: rowsToCamelCase(reminders as any[]),
      fuelEconomy: {
        avgLPer100km: Math.round(avgEconomy * 100) / 100,
        recordCount: fuelArr.length,
      },
      totalCosts: {
        services: Number((svcSum as any[])[0]?.total || 0),
        fuel: Number((fuelSum as any[])[0]?.total || 0),
        repairs: Number((repairSum as any[])[0]?.total || 0),
        upgrades: Number((upgradeSum as any[])[0]?.total || 0),
      },
    });
  } catch (err: any) {
    console.error('[KIOSK] Vehicle info error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
