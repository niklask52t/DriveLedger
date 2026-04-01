import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getPool } from '../db';
import { combinedAuthMiddleware } from '../middleware';
import { toCamelCase, rowsToCamelCase } from '../utils';

const router = Router();
router.use(combinedAuthMiddleware);

const VALID_WIDGET_TYPES = [
  'cost_summary', 'fuel_economy', 'upcoming_reminders',
  'recent_records', 'vehicle_status', 'custom_chart',
];

// GET / - list all widgets for user
router.get('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.user!.id;

    const [rows] = await pool.execute(
      'SELECT * FROM dashboard_widgets WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC',
      [userId]
    );

    const parsed = (rows as any[]).map((r: any) => {
      const obj = toCamelCase(r);
      if (typeof obj.config === 'string') {
        try { obj.config = JSON.parse(obj.config); } catch { obj.config = null; }
      }
      return obj;
    });

    return res.status(200).json(parsed);
  } catch (err: any) {
    console.error('[WIDGETS] List error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create widget
router.post('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.user!.id;
    const { name, type, config } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'name and type are required' });
    }

    if (!VALID_WIDGET_TYPES.includes(type)) {
      return res.status(400).json({ error: `Invalid widget type. Must be one of: ${VALID_WIDGET_TYPES.join(', ')}` });
    }

    // Get max sort_order
    const [maxRows] = await pool.execute(
      'SELECT COALESCE(MAX(sort_order), -1) as max_order FROM dashboard_widgets WHERE user_id = ?',
      [userId]
    );
    const maxOrder = (maxRows as any[])[0]?.max_order ?? -1;

    const id = uuid();
    const configStr = config ? JSON.stringify(config) : null;

    await pool.execute(`
      INSERT INTO dashboard_widgets (id, user_id, name, widget_type, config, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id, userId, name, type, configStr, maxOrder + 1]);

    const [createdRows] = await pool.execute('SELECT * FROM dashboard_widgets WHERE id = ?', [id]);
    const created = (createdRows as any[])[0];
    const createdObj = toCamelCase(created);
    if (typeof createdObj.config === 'string') {
      try { createdObj.config = JSON.parse(createdObj.config); } catch { createdObj.config = null; }
    }

    return res.status(201).json(createdObj);
  } catch (err: any) {
    console.error('[WIDGETS] Create error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update widget
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.user!.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute(
      'SELECT id FROM dashboard_widgets WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    if (!(existingRows as any[])[0]) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    const { name, type, config, sortOrder } = req.body;

    if (type && !VALID_WIDGET_TYPES.includes(type)) {
      return res.status(400).json({ error: `Invalid widget type. Must be one of: ${VALID_WIDGET_TYPES.join(', ')}` });
    }

    const configStr = config !== undefined ? JSON.stringify(config) : undefined;

    await pool.execute(`
      UPDATE dashboard_widgets SET
        name = COALESCE(?, name),
        widget_type = COALESCE(?, widget_type),
        config = COALESCE(?, config),
        sort_order = COALESCE(?, sort_order)
      WHERE id = ? AND user_id = ?
    `, [
      name ?? null,
      type ?? null,
      configStr ?? null,
      sortOrder ?? null,
      id,
      userId,
    ]);

    const [updatedRows] = await pool.execute('SELECT * FROM dashboard_widgets WHERE id = ?', [id]);
    const updated = (updatedRows as any[])[0];
    const updatedObj = toCamelCase(updated);
    if (typeof updatedObj.config === 'string') {
      try { updatedObj.config = JSON.parse(updatedObj.config); } catch { updatedObj.config = null; }
    }

    return res.status(200).json(updatedObj);
  } catch (err: any) {
    console.error('[WIDGETS] Update error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete widget
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.user!.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute(
      'SELECT id FROM dashboard_widgets WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    if (!(existingRows as any[])[0]) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    await pool.execute('DELETE FROM dashboard_widgets WHERE id = ? AND user_id = ?', [id, userId]);

    return res.status(200).json({ message: 'Widget deleted' });
  } catch (err: any) {
    console.error('[WIDGETS] Delete error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
