import { getPool } from './db.js';

/**
 * Returns an array of vehicle IDs that the user owns or has been shared with.
 */
export async function getAccessibleVehicleIds(userId: string): Promise<string[]> {
  const pool = getPool();

  // Owned vehicles
  const [ownedRows] = await pool.execute('SELECT id FROM vehicles WHERE user_id = ?', [userId]);
  const ownedIds = (ownedRows as any[]).map((r: any) => r.id);

  // Shared vehicles
  const [sharedRows] = await pool.execute(
    'SELECT vehicle_id FROM vehicle_shares WHERE shared_with_user_id = ?',
    [userId]
  );
  const sharedIds = (sharedRows as any[]).map((r: any) => r.vehicle_id);

  // Combine and deduplicate
  return [...new Set([...ownedIds, ...sharedIds])];
}

/**
 * Checks if a user can access a specific vehicle (owns it or has it shared).
 */
export async function canAccessVehicle(userId: string, vehicleId: string): Promise<boolean> {
  const pool = getPool();

  const [owned] = await pool.execute(
    'SELECT id FROM vehicles WHERE id = ? AND user_id = ?',
    [vehicleId, userId]
  );
  if ((owned as any[]).length > 0) return true;

  const [shared] = await pool.execute(
    'SELECT id FROM vehicle_shares WHERE vehicle_id = ? AND shared_with_user_id = ?',
    [vehicleId, userId]
  );
  return (shared as any[]).length > 0;
}

/**
 * Checks if a user can edit a specific vehicle (owns it or has 'editor' share).
 */
export async function canEditVehicle(userId: string, vehicleId: string): Promise<boolean> {
  const pool = getPool();

  const [owned] = await pool.execute(
    'SELECT id FROM vehicles WHERE id = ? AND user_id = ?',
    [vehicleId, userId]
  );
  if ((owned as any[]).length > 0) return true;

  const [shared] = await pool.execute(
    "SELECT id FROM vehicle_shares WHERE vehicle_id = ? AND shared_with_user_id = ? AND permission = 'editor'",
    [vehicleId, userId]
  );
  return (shared as any[]).length > 0;
}
