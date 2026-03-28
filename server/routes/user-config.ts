import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { combinedAuthMiddleware } from '../middleware';
import { toCamelCase, toSnakeCase } from '../utils';

const router = Router();
router.use(combinedAuthMiddleware);

const BOOLEAN_FIELDS = [
  'use_system_theme', 'use_uk_mpg', 'enable_csv_imports',
  'enable_markdown_notes', 'show_calendar', 'hide_zero_costs',
  'show_vehicle_thumbnail', 'auto_decimal_format',
  'hide_sold_vehicles', 'three_decimal_fuel',
  'enable_auto_fill_odometer',
  'use_descending', 'enable_auto_reminder_refresh', 'show_search',
];

const JSON_FIELDS = ['visible_tabs', 'tab_order', 'column_preferences'];

function parseRow(row: Record<string, any>): Record<string, any> {
  const obj = toCamelCase(row);
  // Remove user_id from response
  delete obj.userId;
  // Parse JSON text fields
  for (const field of JSON_FIELDS) {
    const camelField = field.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
    if (typeof obj[camelField] === 'string') {
      try { obj[camelField] = JSON.parse(obj[camelField]); } catch { obj[camelField] = field === 'column_preferences' ? {} : []; }
    }
  }
  // Convert tinyint booleans
  for (const field of BOOLEAN_FIELDS) {
    const camelField = field.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
    if (camelField in obj) {
      obj[camelField] = !!obj[camelField];
    }
  }
  return obj;
}

// GET / - Get current user's config (create default if not exists, using admin defaults)
router.get('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;

    // Check if user config exists already
    const [existingRows] = await pool.execute('SELECT user_id FROM user_config WHERE user_id = ?', [userId]);
    if ((existingRows as any[]).length === 0) {
      // Fetch admin defaults to use for new user config
      const [defaultRows] = await pool.execute('SELECT * FROM admin_defaults WHERE id = 1');
      const defaults = (defaultRows as any[])[0];

      if (defaults) {
        await pool.execute(
          `INSERT IGNORE INTO user_config (user_id, language, theme, unit_system, fuel_economy_unit, currency, date_format, visible_tabs) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            defaults.language || 'en',
            defaults.theme || 'dark',
            defaults.unit_system || 'metric',
            defaults.fuel_economy_unit || 'l_per_100km',
            defaults.currency || 'EUR',
            defaults.date_format || 'DD.MM.YYYY',
            defaults.visible_tabs || '["dashboard","vehicles","costs","fuel","repairs","inspections","taxes","loans","savings","supplies","equipment","reminders","planner","purchase-planner","services"]',
          ]
        );
      } else {
        await pool.execute('INSERT IGNORE INTO user_config (user_id) VALUES (?)', [userId]);
      }
    }

    const [rows] = await pool.execute(
      'SELECT * FROM user_config WHERE user_id = ?',
      [userId]
    );
    const row = (rows as any[])[0];
    if (!row) {
      return res.status(500).json({ error: 'Failed to retrieve user config' });
    }

    return res.status(200).json(parseRow(row));
  } catch (err: any) {
    console.error('[USER-CONFIG] Get error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT / - Update current user's config (partial update)
router.put('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;

    // Ensure config row exists
    await pool.execute(
      'INSERT IGNORE INTO user_config (user_id) VALUES (?)',
      [userId]
    );

    const body = req.body;
    if (!body || Object.keys(body).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Convert camelCase keys to snake_case and build SET clause
    const snaked = toSnakeCase(body);
    const setClauses: string[] = [];
    const values: any[] = [];

    // Whitelist of allowed fields
    const ALLOWED_FIELDS = [
      'language', 'theme', 'use_system_theme', 'unit_system',
      'fuel_economy_unit', 'use_uk_mpg', 'preferred_gas_unit',
      'visible_tabs', 'tab_order', 'default_tab', 'enable_csv_imports',
      'enable_markdown_notes', 'show_calendar', 'hide_zero_costs',
      'currency', 'date_format', 'column_preferences',
      'vehicle_identifier', 'show_vehicle_thumbnail', 'auto_decimal_format',
      'hide_sold_vehicles', 'three_decimal_fuel',
      'enable_auto_fill_odometer',
      'use_descending', 'enable_auto_reminder_refresh', 'show_search',
    ];

    for (const [key, value] of Object.entries(snaked)) {
      if (!ALLOWED_FIELDS.includes(key)) continue;

      let dbValue = value;
      // Stringify arrays/objects for JSON TEXT fields
      if (JSON_FIELDS.includes(key) && (Array.isArray(value) || (typeof value === 'object' && value !== null))) {
        dbValue = JSON.stringify(value);
      }
      // Convert booleans to tinyint
      if (BOOLEAN_FIELDS.includes(key) && typeof value === 'boolean') {
        dbValue = value ? 1 : 0;
      }

      setClauses.push(`${key} = ?`);
      values.push(dbValue);
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(userId);
    await pool.execute(
      `UPDATE user_config SET ${setClauses.join(', ')} WHERE user_id = ?`,
      values
    );

    // Return updated config
    const [rows] = await pool.execute(
      'SELECT * FROM user_config WHERE user_id = ?',
      [userId]
    );
    const row = (rows as any[])[0];

    return res.status(200).json(parseRow(row));
  } catch (err: any) {
    console.error('[USER-CONFIG] Update error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
