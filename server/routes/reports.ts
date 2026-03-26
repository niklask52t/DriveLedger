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
    const userId = (req as any).user.id;
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

export default router;
