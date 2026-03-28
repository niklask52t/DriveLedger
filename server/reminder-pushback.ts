import { getPool } from './db.js';

/**
 * When a service, repair, upgrade, or inspection record is created,
 * push back any active recurring reminders linked to that vehicle.
 */
export async function pushbackReminders(userId: string, vehicleId: string, mileage?: number): Promise<void> {
  if (!vehicleId) return;

  const pool = getPool();

  // Find active recurring reminders for this vehicle
  const [reminders] = await pool.execute(
    'SELECT * FROM reminders WHERE user_id = ? AND vehicle_id = ? AND active = 1 AND recurring IS NOT NULL AND recurring != ""',
    [userId, vehicleId]
  );

  for (const reminder of reminders as any[]) {
    const updates: string[] = [];
    const values: any[] = [];

    // Push back date-based reminders
    if (reminder.metric === 'date' || reminder.metric === 'both') {
      if (reminder.recurring === 'daily') {
        updates.push('remind_at = DATE_ADD(NOW(), INTERVAL 1 DAY)');
      } else if (reminder.recurring === 'weekly') {
        updates.push('remind_at = DATE_ADD(NOW(), INTERVAL 1 WEEK)');
      } else if (reminder.recurring === 'monthly') {
        updates.push('remind_at = DATE_ADD(NOW(), INTERVAL 1 MONTH)');
      } else if (reminder.recurring === 'yearly') {
        updates.push('remind_at = DATE_ADD(NOW(), INTERVAL 1 YEAR)');
      }
    }

    // Push back mileage-based reminders
    if ((reminder.metric === 'odometer' || reminder.metric === 'both') && reminder.mileage_interval && mileage) {
      updates.push('target_mileage = ?');
      values.push(mileage + reminder.mileage_interval);
    }

    if (updates.length > 0) {
      values.push(reminder.id, userId);
      await pool.execute(
        `UPDATE reminders SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
        values
      );
    }
  }
}
