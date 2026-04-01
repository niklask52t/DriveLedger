import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { combinedAuthMiddleware } from '../middleware';
import { rowsToCamelCase } from '../utils';

const router = Router();
router.use(combinedAuthMiddleware);

// GET /vehicle/:vehicleId/maintenance?year=YYYY - aggregate maintenance report
router.get('/vehicle/:vehicleId/maintenance', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.user!.id;
    const { vehicleId } = req.params;
    const year = req.query.year as string | undefined;

    // Verify vehicle ownership
    const [vehicleRows] = await pool.execute('SELECT * FROM vehicles WHERE id = ? AND user_id = ?', [vehicleId, userId]);
    const vehicle = (vehicleRows as any[])[0];
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    let dateFilter = '';
    const params: any[] = [userId, vehicleId];

    if (year) {
      dateFilter = ' AND date LIKE ?';
      params.push(`${year}%`);
    }

    // Query all record types for this vehicle
    const baseParams = [userId, vehicleId];
    const yearParams = year ? [...baseParams, `${year}%`] : baseParams;

    const [services] = await pool.execute(
      `SELECT * FROM service_records WHERE user_id = ? AND vehicle_id = ?${dateFilter} ORDER BY date DESC`,
      yearParams
    );

    const [repairs] = await pool.execute(
      `SELECT * FROM repairs WHERE user_id = ? AND vehicle_id = ?${dateFilter} ORDER BY date DESC`,
      yearParams
    );

    const [upgrades] = await pool.execute(
      `SELECT * FROM upgrade_records WHERE user_id = ? AND vehicle_id = ?${dateFilter} ORDER BY date DESC`,
      yearParams
    );

    const [fuel] = await pool.execute(
      `SELECT * FROM fuel_records WHERE user_id = ? AND vehicle_id = ?${dateFilter} ORDER BY date DESC`,
      yearParams
    );

    const [inspections] = await pool.execute(
      `SELECT * FROM inspections WHERE user_id = ? AND vehicle_id = ?${dateFilter} ORDER BY date DESC`,
      yearParams
    );

    const [taxes] = await pool.execute(
      `SELECT * FROM taxes WHERE user_id = ? AND vehicle_id = ?${dateFilter} ORDER BY date DESC`,
      yearParams
    );

    const serviceRows = rowsToCamelCase(services as any[]);
    const repairRows = rowsToCamelCase(repairs as any[]);
    const upgradeRows = rowsToCamelCase(upgrades as any[]);
    const fuelRows = rowsToCamelCase(fuel as any[]);
    const inspectionRows = rowsToCamelCase(inspections as any[]);
    const taxRows = rowsToCamelCase(taxes as any[]);

    // Calculate totals
    const serviceCost = serviceRows.reduce((sum: number, r: any) => sum + (r.cost || 0), 0);
    const repairCost = repairRows.reduce((sum: number, r: any) => sum + (r.cost || 0), 0);
    const upgradeCost = upgradeRows.reduce((sum: number, r: any) => sum + (r.cost || 0), 0);
    const fuelCost = fuelRows.reduce((sum: number, r: any) => sum + (r.fuelCost || 0), 0);
    const inspectionCost = inspectionRows.reduce((sum: number, r: any) => sum + (r.cost || 0), 0);
    const taxCost = taxRows.reduce((sum: number, r: any) => sum + (r.cost || 0), 0);
    const totalCost = serviceCost + repairCost + upgradeCost + fuelCost + inspectionCost + taxCost;

    const totalFuelAmount = fuelRows.reduce((sum: number, r: any) => sum + (r.fuelAmount || 0), 0);

    const report = {
      vehicleId,
      vehicleName: vehicle.name,
      year: year || 'all',
      summary: {
        totalCost: Math.round(totalCost * 100) / 100,
        serviceCost: Math.round(serviceCost * 100) / 100,
        repairCost: Math.round(repairCost * 100) / 100,
        upgradeCost: Math.round(upgradeCost * 100) / 100,
        fuelCost: Math.round(fuelCost * 100) / 100,
        inspectionCost: Math.round(inspectionCost * 100) / 100,
        taxCost: Math.round(taxCost * 100) / 100,
        totalFuelAmount: Math.round(totalFuelAmount * 100) / 100,
        serviceCount: serviceRows.length,
        repairCount: repairRows.length,
        upgradeCount: upgradeRows.length,
        fuelCount: fuelRows.length,
        inspectionCount: inspectionRows.length,
        taxCount: taxRows.length,
      },
      services: serviceRows,
      repairs: repairRows,
      upgrades: upgradeRows,
      fuel: fuelRows,
      inspections: inspectionRows,
      taxes: taxRows,
    };

    return res.status(200).json(report);
  } catch (err: any) {
    console.error('[REPORTS] Maintenance report error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /vehicle/:vehicleId/history?year=YYYY - chronological history of all records
router.get('/vehicle/:vehicleId/history', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.user!.id;
    const { vehicleId } = req.params;
    const year = req.query.year as string | undefined;

    // Verify vehicle ownership
    const [vehicleRows] = await pool.execute('SELECT id FROM vehicles WHERE id = ? AND user_id = ?', [vehicleId, userId]);
    const vehicle = (vehicleRows as any[])[0];
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const dateFilter = year ? ' AND date LIKE ?' : '';
    const baseParams = [userId, vehicleId];
    const yearParams = year ? [...baseParams, `${year}%`] : baseParams;

    const queries = [
      { type: 'service', query: `SELECT id, 'service' as record_type, description, cost, date, mileage FROM service_records WHERE user_id = ? AND vehicle_id = ?${dateFilter}` },
      { type: 'repair', query: `SELECT id, 'repair' as record_type, description, cost, date, mileage FROM repairs WHERE user_id = ? AND vehicle_id = ?${dateFilter}` },
      { type: 'upgrade', query: `SELECT id, 'upgrade' as record_type, description, cost, date, mileage FROM upgrade_records WHERE user_id = ? AND vehicle_id = ?${dateFilter}` },
      { type: 'fuel', query: `SELECT id, 'fuel' as record_type, CONCAT(fuel_amount, ' L') as description, fuel_cost as cost, date, mileage FROM fuel_records WHERE user_id = ? AND vehicle_id = ?${dateFilter}` },
      { type: 'tax', query: `SELECT id, 'tax' as record_type, description, cost, date, 0 as mileage FROM taxes WHERE user_id = ? AND vehicle_id = ?${dateFilter}` },
      { type: 'inspection', query: `SELECT id, 'inspection' as record_type, title as description, cost, date, mileage FROM inspections WHERE user_id = ? AND vehicle_id = ?${dateFilter}` },
      { type: 'odometer', query: `SELECT id, 'odometer' as record_type, notes as description, 0 as cost, date, mileage FROM odometer_records WHERE user_id = ? AND vehicle_id = ?${dateFilter}` },
    ];

    const allRecords: any[] = [];
    for (const q of queries) {
      const [rows] = await pool.execute(q.query, yearParams);
      allRecords.push(...(rows as any[]));
    }

    // Sort by date descending
    allRecords.sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      return dateB.localeCompare(dateA);
    });

    // Convert snake_case to camelCase for the record_type field
    const result = allRecords.map(r => ({
      id: r.id,
      recordType: r.record_type,
      description: r.description || '',
      cost: r.cost || 0,
      date: r.date || '',
      mileage: r.mileage || 0,
    }));

    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[REPORTS] Vehicle history error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /vehicle/:vehicleId/monthly - Monthly aggregated data for charts
router.get('/vehicle/:vehicleId/monthly', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.user!.id;
    const { vehicleId } = req.params;

    // Verify vehicle ownership
    const [vehicleRows] = await pool.execute('SELECT * FROM vehicles WHERE id = ? AND user_id = ?', [vehicleId, userId]);
    const vehicle = (vehicleRows as any[])[0];
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Cost by month per type
    const [services] = await pool.execute(
      `SELECT DATE_FORMAT(date, '%Y-%m') as month, SUM(cost) as total FROM service_records WHERE user_id = ? AND vehicle_id = ? GROUP BY month ORDER BY month`,
      [userId, vehicleId]
    );
    const [repairs] = await pool.execute(
      `SELECT DATE_FORMAT(date, '%Y-%m') as month, SUM(cost) as total FROM repairs WHERE user_id = ? AND vehicle_id = ? GROUP BY month ORDER BY month`,
      [userId, vehicleId]
    );
    const [upgrades] = await pool.execute(
      `SELECT DATE_FORMAT(date, '%Y-%m') as month, SUM(cost) as total FROM upgrade_records WHERE user_id = ? AND vehicle_id = ? GROUP BY month ORDER BY month`,
      [userId, vehicleId]
    );
    const [fuel] = await pool.execute(
      `SELECT DATE_FORMAT(date, '%Y-%m') as month, SUM(fuel_cost) as total, SUM(fuel_amount) as liters FROM fuel_records WHERE user_id = ? AND vehicle_id = ? GROUP BY month ORDER BY month`,
      [userId, vehicleId]
    );
    const [taxes] = await pool.execute(
      `SELECT DATE_FORMAT(date, '%Y-%m') as month, SUM(cost) as total FROM taxes WHERE user_id = ? AND vehicle_id = ? GROUP BY month ORDER BY month`,
      [userId, vehicleId]
    );

    // Distance by month
    const [odometer] = await pool.execute(
      `SELECT DATE_FORMAT(date, '%Y-%m') as month, MAX(mileage) - MIN(mileage) as distance FROM odometer_records WHERE user_id = ? AND vehicle_id = ? GROUP BY month ORDER BY month`,
      [userId, vehicleId]
    );

    // Fuel economy by month (L/100km)
    const [fuelEconomy] = await pool.execute(
      `SELECT DATE_FORMAT(f.date, '%Y-%m') as month,
              SUM(f.fuel_amount) as totalLiters,
              MAX(f.mileage) - MIN(f.mileage) as distance
       FROM fuel_records f
       WHERE f.user_id = ? AND f.vehicle_id = ? AND f.is_partial_fill = 0
       GROUP BY month
       HAVING distance > 0
       ORDER BY month`,
      [userId, vehicleId]
    );

    res.json({
      costByMonth: { services, repairs, upgrades, fuel, taxes },
      distanceByMonth: odometer,
      fuelEconomyByMonth: (fuelEconomy as any[]).map(r => ({
        month: r.month,
        lPer100km: r.distance > 0 ? (r.totalLiters / r.distance) * 100 : 0,
      })),
    });
  } catch (err: any) {
    console.error('[REPORTS] Monthly report error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
