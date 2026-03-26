import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getPool } from '../db.js';
import { combinedAuthMiddleware } from '../middleware.js';

const router = Router();
router.use(combinedAuthMiddleware);

/**
 * POST /api/import/lubelogger
 *
 * Accepts a LubeLogger export (JSON format) and maps it to DriveLedger format.
 *
 * Expected input shape (LubeLogger export):
 * {
 *   vehicles: [{ id, make, model, year, licensePlate, ... }],
 *   serviceRecords: [{ vehicleId, date, description, cost, odometer, notes, ... }],
 *   repairRecords: [{ vehicleId, date, description, cost, odometer, notes, ... }],
 *   upgradeRecords: [{ vehicleId, date, description, cost, odometer, notes, ... }],
 *   gasRecords: [{ vehicleId, date, odometer, gallons, cost, isFillToFull, missedFuelUp, ... }],
 *   odometerRecords: [{ vehicleId, date, odometer, notes, ... }],
 *   notes: [{ vehicleId, description, ... }],
 *   taxRecords: [{ vehicleId, date, description, cost, notes, ... }]
 * }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const data = req.body;

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Invalid data format. Expected a JSON object.' });
    }

    const summary: Record<string, number> = {
      vehicles: 0,
      services: 0,
      repairs: 0,
      upgrades: 0,
      fuel: 0,
      odometer: 0,
      notes: 0,
      taxes: 0,
    };

    // Map LubeLogger vehicle IDs to new DriveLedger UUIDs
    const vehicleIdMap: Record<string, string> = {};

    const conn = await pool.getConnection();
    await conn.beginTransaction();
    try {
      // Import vehicles
      if (Array.isArray(data.vehicles)) {
        for (const v of data.vehicles) {
          const newId = uuid();
          const oldId = String(v.id || v.vehicleId || newId);
          vehicleIdMap[oldId] = newId;

          await conn.execute(
            `INSERT INTO vehicles (id, user_id, name, brand, model, variant, license_plate, purchase_price, current_mileage, fuel_type, horse_power, image_url, status, mobile_de_link, notes, color)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              newId,
              userId,
              v.name || `${v.make || v.brand || ''} ${v.model || ''}`.trim() || 'Imported Vehicle',
              v.make || v.brand || '',
              v.model || '',
              v.trim || v.variant || '',
              v.licensePlate || v.license_plate || '',
              v.purchasePrice || v.purchase_price || 0,
              v.odometer || v.currentMileage || v.current_mileage || 0,
              mapFuelType(v.fuelType || v.fuel_type || ''),
              v.horsePower || v.horse_power || 0,
              v.imageUrl || v.image_url || '',
              'owned',
              '',
              v.notes || '',
              '',
            ]
          );
          summary.vehicles++;
        }
      }

      // Helper to resolve vehicle ID
      const resolveVehicleId = (record: any): string | null => {
        const rawId = String(record.vehicleId || record.vehicle_id || record.VehicleId || '');
        return vehicleIdMap[rawId] || null;
      };

      // Import service records
      if (Array.isArray(data.serviceRecords)) {
        for (const r of data.serviceRecords) {
          const vehicleId = resolveVehicleId(r);
          if (!vehicleId) continue;

          await conn.execute(
            `INSERT INTO service_records (id, user_id, vehicle_id, date, description, mileage, cost, notes, tags, category)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              uuid(),
              userId,
              vehicleId,
              r.date || r.Date || '',
              r.description || r.Description || '',
              r.odometer || r.Odometer || r.mileage || 0,
              r.cost || r.Cost || 0,
              r.notes || r.Notes || '',
              r.tags ? JSON.stringify(r.tags) : null,
              r.category || 'other',
            ]
          );
          summary.services++;
        }
      }

      // Import repair records
      if (Array.isArray(data.repairRecords)) {
        for (const r of data.repairRecords) {
          const vehicleId = resolveVehicleId(r);
          if (!vehicleId) continue;

          await conn.execute(
            `INSERT INTO repairs (id, user_id, vehicle_id, date, description, category, notes, cost, mileage, workshop)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              uuid(),
              userId,
              vehicleId,
              r.date || r.Date || '',
              r.description || r.Description || '',
              r.category || '',
              r.notes || r.Notes || '',
              r.cost || r.Cost || 0,
              r.odometer || r.Odometer || r.mileage || 0,
              r.workshop || r.shop || '',
            ]
          );
          summary.repairs++;
        }
      }

      // Import upgrade records
      if (Array.isArray(data.upgradeRecords)) {
        for (const r of data.upgradeRecords) {
          const vehicleId = resolveVehicleId(r);
          if (!vehicleId) continue;

          await conn.execute(
            `INSERT INTO upgrade_records (id, user_id, vehicle_id, date, description, cost, mileage, notes, tags)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              uuid(),
              userId,
              vehicleId,
              r.date || r.Date || '',
              r.description || r.Description || '',
              r.cost || r.Cost || 0,
              r.odometer || r.Odometer || r.mileage || 0,
              r.notes || r.Notes || '',
              r.tags ? JSON.stringify(r.tags) : null,
            ]
          );
          summary.upgrades++;
        }
      }

      // Import gas/fuel records (LubeLogger calls them gasRecords)
      const fuelRecords = data.gasRecords || data.fuelRecords;
      if (Array.isArray(fuelRecords)) {
        for (const r of fuelRecords) {
          const vehicleId = resolveVehicleId(r);
          if (!vehicleId) continue;

          await conn.execute(
            `INSERT INTO fuel_records (id, user_id, vehicle_id, date, mileage, fuel_amount, fuel_cost, is_partial_fill, is_missed_entry, fuel_type, station, notes, tags)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              uuid(),
              userId,
              vehicleId,
              r.date || r.Date || '',
              r.odometer || r.Odometer || r.mileage || 0,
              r.gallons || r.fuelAmount || r.fuel_amount || r.liters || 0,
              r.cost || r.Cost || r.fuelCost || r.fuel_cost || 0,
              (r.isFillToFull === false || r.isPartialFill || r.is_partial_fill) ? 1 : 0,
              (r.missedFuelUp || r.isMissedEntry || r.is_missed_entry) ? 1 : 0,
              r.fuelType || r.fuel_type || '',
              r.station || '',
              r.notes || r.Notes || '',
              r.tags ? JSON.stringify(r.tags) : null,
            ]
          );
          summary.fuel++;
        }
      }

      // Import odometer records
      if (Array.isArray(data.odometerRecords)) {
        for (const r of data.odometerRecords) {
          const vehicleId = resolveVehicleId(r);
          if (!vehicleId) continue;

          await conn.execute(
            `INSERT INTO odometer_records (id, user_id, vehicle_id, date, mileage, notes, tags)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              uuid(),
              userId,
              vehicleId,
              r.date || r.Date || '',
              r.odometer || r.Odometer || r.mileage || 0,
              r.notes || r.Notes || '',
              r.tags ? JSON.stringify(r.tags) : null,
            ]
          );
          summary.odometer++;
        }
      }

      // Import notes (LubeLogger has vehicle notes)
      if (Array.isArray(data.notes)) {
        for (const r of data.notes) {
          const vehicleId = resolveVehicleId(r);
          if (!vehicleId) continue;

          await conn.execute(
            `INSERT INTO vehicle_notes (id, user_id, vehicle_id, title, content, is_pinned, tags)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              uuid(),
              userId,
              vehicleId,
              r.title || r.Title || 'Imported Note',
              r.description || r.Description || r.content || r.Content || '',
              0,
              r.tags ? JSON.stringify(r.tags) : null,
            ]
          );
          summary.notes++;
        }
      }

      // Import tax records
      if (Array.isArray(data.taxRecords)) {
        for (const r of data.taxRecords) {
          const vehicleId = resolveVehicleId(r);
          if (!vehicleId) continue;

          await conn.execute(
            `INSERT INTO taxes (id, user_id, vehicle_id, date, description, cost, is_recurring, recurring_interval, due_date, notes, tags)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              uuid(),
              userId,
              vehicleId,
              r.date || r.Date || '',
              r.description || r.Description || '',
              r.cost || r.Cost || 0,
              r.isRecurring ? 1 : 0,
              r.recurringInterval || r.recurring_interval || '',
              r.dueDate || r.due_date || '',
              r.notes || r.Notes || '',
              r.tags ? JSON.stringify(r.tags) : null,
            ]
          );
          summary.taxes++;
        }
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    return res.status(200).json({
      message: 'LubeLogger import complete',
      imported: summary,
    });
  } catch (err: any) {
    console.error('[LUBELOGGER-IMPORT] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Maps common fuel type names to DriveLedger fuel types.
 */
function mapFuelType(type: string): string {
  const lower = type.toLowerCase();
  if (lower.includes('diesel')) return 'diesel';
  if (lower.includes('electric') || lower.includes('ev')) return 'elektro';
  if (lower.includes('hybrid')) return 'hybrid';
  if (lower.includes('gas') || lower.includes('lpg') || lower.includes('cng')) return 'gas';
  if (lower.includes('petrol') || lower.includes('gasoline') || lower.includes('benzin')) return 'benzin';
  return type || 'benzin';
}

export default router;
