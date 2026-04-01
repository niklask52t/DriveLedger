import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getPool } from '../db.js';
import { combinedAuthMiddleware } from '../middleware.js';
import { toCamelCase } from '../utils.js';

const router = Router();
router.use(combinedAuthMiddleware);

// Admin-only middleware
function requireAdmin(req: Request, res: Response, next: () => void) {
  const user = req.user!;
  if (!user?.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

router.use(requireAdmin);

// GET / - list all custom widget code entries for the user
router.get('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.user!.id;

    const [rows] = await pool.execute(
      'SELECT * FROM custom_widget_code WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC',
      [userId]
    );

    const parsed = (rows as any[]).map((r: any) => {
      const obj = toCamelCase(r);
      obj.enabled = !!obj.enabled;
      return obj;
    });

    return res.status(200).json(parsed);
  } catch (err: any) {
    console.error('[CUSTOM-WIDGETS] List error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create custom widget code
router.post('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.user!.id;
    const { name, code, enabled, sortOrder } = req.body;

    if (!name || code === undefined || code === null) {
      return res.status(400).json({ error: 'name and code are required' });
    }

    // Get max sort_order
    const [maxRows] = await pool.execute(
      'SELECT COALESCE(MAX(sort_order), -1) as max_order FROM custom_widget_code WHERE user_id = ?',
      [userId]
    );
    const maxOrder = (maxRows as any[])[0]?.max_order ?? -1;

    const id = uuid();
    const enabledVal = enabled !== undefined ? (enabled ? 1 : 0) : 1;
    const sortOrderVal = sortOrder !== undefined ? sortOrder : maxOrder + 1;

    await pool.execute(`
      INSERT INTO custom_widget_code (id, user_id, name, code, enabled, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id, userId, name, code, enabledVal, sortOrderVal]);

    const [createdRows] = await pool.execute('SELECT * FROM custom_widget_code WHERE id = ?', [id]);
    const created = toCamelCase((createdRows as any[])[0]);
    created.enabled = !!created.enabled;

    return res.status(201).json(created);
  } catch (err: any) {
    console.error('[CUSTOM-WIDGETS] Create error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update custom widget code
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.user!.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute(
      'SELECT id FROM custom_widget_code WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    if (!(existingRows as any[])[0]) {
      return res.status(404).json({ error: 'Custom widget not found' });
    }

    const { name, code, enabled, sortOrder } = req.body;
    const enabledVal = enabled !== undefined ? (enabled ? 1 : 0) : undefined;

    await pool.execute(`
      UPDATE custom_widget_code SET
        name = COALESCE(?, name),
        code = COALESCE(?, code),
        enabled = COALESCE(?, enabled),
        sort_order = COALESCE(?, sort_order)
      WHERE id = ? AND user_id = ?
    `, [
      name ?? null,
      code ?? null,
      enabledVal ?? null,
      sortOrder ?? null,
      id,
      userId,
    ]);

    const [updatedRows] = await pool.execute('SELECT * FROM custom_widget_code WHERE id = ?', [id]);
    const updated = toCamelCase((updatedRows as any[])[0]);
    updated.enabled = !!updated.enabled;

    return res.status(200).json(updated);
  } catch (err: any) {
    console.error('[CUSTOM-WIDGETS] Update error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete custom widget code
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.user!.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute(
      'SELECT id FROM custom_widget_code WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    if (!(existingRows as any[])[0]) {
      return res.status(404).json({ error: 'Custom widget not found' });
    }

    await pool.execute('DELETE FROM custom_widget_code WHERE id = ? AND user_id = ?', [id, userId]);

    return res.status(200).json({ message: 'Custom widget deleted' });
  } catch (err: any) {
    console.error('[CUSTOM-WIDGETS] Delete error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /preview/:id - returns the widget's HTML/JS wrapped in a safe container
router.get('/preview/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.user!.id;
    const { id } = req.params;

    const [rows] = await pool.execute(
      'SELECT * FROM custom_widget_code WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    const widget = (rows as any[])[0];
    if (!widget) {
      return res.status(404).json({ error: 'Custom widget not found' });
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #18181b; color: #fafafa; font-size: 14px; }
    * { box-sizing: border-box; }
    h1, h2, h3, h4 { margin-top: 0; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px; text-align: left; border-bottom: 1px solid #27272a; }
    th { color: #a1a1aa; font-size: 12px; text-transform: uppercase; }
    .card { background: #27272a; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
    .stat { font-size: 24px; font-weight: 600; }
    .label { font-size: 12px; color: #71717a; text-transform: uppercase; }
    .green { color: #34d399; }
    .red { color: #f87171; }
    .violet { color: #8b5cf6; }
    .amber { color: #fbbf24; }
  </style>
</head>
<body>
  ${widget.code}
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
  } catch (err: any) {
    console.error('[CUSTOM-WIDGETS] Preview error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
