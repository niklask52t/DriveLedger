import crypto from 'crypto';
import { getPool } from './db.js';

/**
 * Fire webhooks for a given user and event.
 * Non-blocking: fires all matching webhooks and catches errors silently.
 */
export async function fireWebhooks(userId: string, event: string, payload: any): Promise<void> {
  try {
    const pool = getPool();

    const [rows] = await pool.execute(
      "SELECT id, url, secret, events FROM webhooks WHERE user_id = ? AND is_active = 1",
      [userId]
    );

    const webhooks = rows as any[];

    for (const wh of webhooks) {
      // Parse events JSON and check if this event is included
      let events: string[];
      try {
        events = typeof wh.events === 'string' ? JSON.parse(wh.events) : wh.events;
      } catch {
        continue;
      }

      if (!Array.isArray(events) || !events.includes(event)) {
        continue;
      }

      const body = JSON.stringify({
        event,
        data: payload,
        timestamp: new Date().toISOString(),
      });

      // Compute HMAC signature
      const signature = crypto
        .createHmac('sha256', wh.secret || '')
        .update(body)
        .digest('hex');

      // Check for Discord webhook URL
      if (wh.url.startsWith('discord://')) {
        const discordUrl = wh.url.replace('discord://', 'https://discord.com/api/webhooks/');
        const [action, type] = event.split('.');
        fetch(discordUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title: `${action}: ${type}`,
              description: JSON.stringify(payload, null, 2).substring(0, 1000),
              color: action === 'created' ? 0x34d399 : action === 'deleted' ? 0xf87171 : 0xfbbf24,
              timestamp: new Date().toISOString(),
            }]
          }),
        }).catch((err) => {
          console.error(`[WEBHOOK] Failed to POST to Discord ${discordUrl}:`, err.message);
        });
      } else {
        // Fire-and-forget standard webhook
        fetch(wh.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Signature': signature,
          },
          body,
        }).catch((err) => {
          console.error(`[WEBHOOK] Failed to POST to ${wh.url}:`, err.message);
        });
      }
    }
  } catch (err: any) {
    console.error('[WEBHOOK] Error querying webhooks:', err.message);
  }
}
