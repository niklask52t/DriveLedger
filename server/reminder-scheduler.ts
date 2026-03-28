import { v4 as uuid } from 'uuid';
import { getPool } from './db';
import { isEmailEnabled, sendReminderEmail } from './email';

const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

function calculateNextRemindAt(currentRemindAt: string, recurring: string): string {
  const date = new Date(currentRemindAt);

  switch (recurring) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      return '';
  }

  return date.toISOString();
}

async function processDueReminders(): Promise<void> {
  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      "SELECT r.*, u.email FROM reminders r JOIN users u ON u.id = r.user_id WHERE r.remind_at <= NOW() AND r.sent = 0 AND r.active = 1"
    );
    const dueReminders = rows as any[];

    if (dueReminders.length === 0) {
      return;
    }

    console.log(`[SCHEDULER] Processing ${dueReminders.length} due reminder(s)`);

    for (const reminder of dueReminders) {
      try {
        // Send email if enabled and requested
        if (reminder.email_notify && isEmailEnabled()) {
          const emailTo = reminder.email || process.env.DEFAULT_REMINDER_EMAIL || '';
          if (emailTo) {
            await sendReminderEmail(
              emailTo,
              reminder.title,
              reminder.description || '',
              reminder.entity_type || ''
            );
          }
        }

        // Mark as sent
        await pool.execute('UPDATE reminders SET sent = 1 WHERE id = ?', [reminder.id]);

        // If recurring, create next reminder
        if (reminder.recurring) {
          const nextRemindAt = calculateNextRemindAt(reminder.remind_at, reminder.recurring);
          if (nextRemindAt) {
            const newId = uuid();
            await pool.execute(
              'INSERT INTO reminders (id, user_id, title, description, type, entity_type, entity_id, remind_at, recurring, email_notify, sent, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)',
              [
                newId,
                reminder.user_id,
                reminder.title,
                reminder.description,
                reminder.type,
                reminder.entity_type,
                reminder.entity_id,
                nextRemindAt,
                reminder.recurring,
                reminder.email_notify
              ]
            );
            console.log(`[SCHEDULER] Created next recurring reminder ${newId} for ${nextRemindAt}`);
          }
        }

        console.log(`[SCHEDULER] Processed reminder ${reminder.id}: "${reminder.title}"`);
      } catch (err) {
        console.error(`[SCHEDULER] Error processing reminder ${reminder.id}:`, err);
      }
    }
  } catch (err) {
    console.error('[SCHEDULER] Error querying due reminders:', err);
  }
}

/**
 * Auto-advance past-due recurring reminders.
 * If a recurring reminder's remind_at is in the past, sent=1, and active=1,
 * advance it to the next occurrence until it is in the future.
 */
async function advancePastDueRecurringReminders(): Promise<void> {
  try {
    const pool = getPool();

    // Check each user's enableAutoReminderRefresh setting
    const [rows] = await pool.execute(
      `SELECT r.* FROM reminders r
       LEFT JOIN user_config uc ON uc.user_id = r.user_id
       WHERE r.remind_at < NOW() AND r.sent = 1 AND r.active = 1
         AND r.recurring != '' AND r.recurring IS NOT NULL
         AND (uc.enable_auto_reminder_refresh IS NULL OR uc.enable_auto_reminder_refresh = 1)`
    );
    const pastDue = rows as any[];

    if (pastDue.length === 0) return;

    console.log(`[SCHEDULER] Advancing ${pastDue.length} past-due recurring reminder(s)`);

    for (const reminder of pastDue) {
      try {
        let nextRemindAt = calculateNextRemindAt(reminder.remind_at, reminder.recurring);
        // Keep advancing until the next occurrence is in the future
        while (nextRemindAt && new Date(nextRemindAt) < new Date()) {
          nextRemindAt = calculateNextRemindAt(nextRemindAt, reminder.recurring);
        }

        if (nextRemindAt) {
          // Create the next occurrence
          const newId = uuid();
          await pool.execute(
            'INSERT INTO reminders (id, user_id, title, description, type, entity_type, entity_id, remind_at, recurring, email_notify, sent, active, vehicle_id, metric, target_mileage, mileage_interval, fixed_interval) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?, ?, ?, ?)',
            [
              newId,
              reminder.user_id,
              reminder.title,
              reminder.description,
              reminder.type,
              reminder.entity_type,
              reminder.entity_id,
              nextRemindAt,
              reminder.recurring,
              reminder.email_notify,
              reminder.vehicle_id || null,
              reminder.metric || 'date',
              reminder.target_mileage || null,
              reminder.mileage_interval || null,
              reminder.fixed_interval || 0,
            ]
          );
          // Deactivate the old one
          await pool.execute('UPDATE reminders SET active = 0 WHERE id = ?', [reminder.id]);
          console.log(`[SCHEDULER] Advanced recurring reminder ${reminder.id} -> ${newId} at ${nextRemindAt}`);
        }
      } catch (err) {
        console.error(`[SCHEDULER] Error advancing reminder ${reminder.id}:`, err);
      }
    }
  } catch (err) {
    console.error('[SCHEDULER] Error advancing past-due recurring reminders:', err);
  }
}

export function startReminderScheduler(): void {
  console.log(`[SCHEDULER] Reminder scheduler started (interval: ${INTERVAL_MS / 1000}s)`);

  // Run once immediately
  processDueReminders();
  advancePastDueRecurringReminders();

  // Then run on interval
  setInterval(processDueReminders, INTERVAL_MS);
  setInterval(advancePastDueRecurringReminders, INTERVAL_MS);
}
