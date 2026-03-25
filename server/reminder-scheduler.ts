import { v4 as uuid } from 'uuid';
import db from './db';
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
    const dueReminders = db.prepare(
      "SELECT r.*, u.email FROM reminders r JOIN users u ON u.id = r.user_id WHERE r.remind_at <= datetime('now') AND r.sent = 0 AND r.active = 1"
    ).all() as any[];

    if (dueReminders.length === 0) {
      return;
    }

    console.log(`[SCHEDULER] Processing ${dueReminders.length} due reminder(s)`);

    for (const reminder of dueReminders) {
      try {
        // Send email if enabled and requested
        if (reminder.email_notify && isEmailEnabled()) {
          await sendReminderEmail(
            reminder.email,
            reminder.title,
            reminder.description || '',
            reminder.entity_type || ''
          );
        }

        // Mark as sent
        db.prepare('UPDATE reminders SET sent = 1 WHERE id = ?').run(reminder.id);

        // If recurring, create next reminder
        if (reminder.recurring) {
          const nextRemindAt = calculateNextRemindAt(reminder.remind_at, reminder.recurring);
          if (nextRemindAt) {
            const newId = uuid();
            db.prepare(
              'INSERT INTO reminders (id, user_id, title, description, type, entity_type, entity_id, remind_at, recurring, email_notify, sent, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)'
            ).run(
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

export function startReminderScheduler(): void {
  console.log(`[SCHEDULER] Reminder scheduler started (interval: ${INTERVAL_MS / 1000}s)`);

  // Run once immediately
  processDueReminders();

  // Then run on interval
  setInterval(processDueReminders, INTERVAL_MS);
}
