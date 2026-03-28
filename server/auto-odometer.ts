import { v4 as uuid } from 'uuid';
import { getPool } from './db.js';

/**
 * Automatically inserts an odometer record when a fuel, service, repair,
 * upgrade, or inspection record is created with a mileage value.
 * Also updates the vehicle's current_mileage if this reading is higher.
 */
export async function autoInsertOdometer(userId: string, vehicleId: string, mileage: number, date: string): Promise<void> {
  // Check global ENV toggle (defaults to true if not set)
  if (process.env.AUTO_INSERT_ODOMETER === 'false') return;

  if (!mileage || mileage <= 0 || !vehicleId) return;

  const pool = getPool();

  // Check if odometer record already exists for this date+vehicle+mileage
  const [existing] = await pool.execute(
    'SELECT id FROM odometer_records WHERE user_id = ? AND vehicle_id = ? AND date = ? AND mileage = ?',
    [userId, vehicleId, date, mileage]
  );
  if ((existing as any[]).length > 0) return;

  // Insert new odometer record
  const id = uuid();
  await pool.execute(
    'INSERT INTO odometer_records (id, user_id, vehicle_id, date, mileage, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
    [id, userId, vehicleId, date, mileage, 'Auto-created']
  );

  // Also update vehicle's current_mileage if this is higher
  await pool.execute(
    'UPDATE vehicles SET current_mileage = GREATEST(current_mileage, ?) WHERE id = ? AND user_id = ?',
    [mileage, vehicleId, userId]
  );
}
