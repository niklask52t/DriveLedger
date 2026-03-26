import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getPool } from '../db';
import { combinedAuthMiddleware } from '../middleware';
import { toCamelCase, toSnakeCase, rowsToCamelCase } from '../utils';

const router = Router();
router.use(combinedAuthMiddleware);

// GET / - list all planner tasks, optional ?vehicleId=xxx&stage=xxx
router.get('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const vehicleId = req.query.vehicleId as string | undefined;
    const stage = req.query.stage as string | undefined;

    let query = 'SELECT * FROM planner_tasks WHERE user_id = ?';
    const params: any[] = [userId];

    if (vehicleId) {
      query += ' AND vehicle_id = ?';
      params.push(vehicleId);
    }

    if (stage) {
      query += ' AND stage = ?';
      params.push(stage);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await pool.execute(query, params);
    return res.status(200).json(rowsToCamelCase(rows as any[]));
  } catch (err: any) {
    console.error('[PLANNER-TASKS] List error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - single planner task
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const [rows] = await pool.execute('SELECT * FROM planner_tasks WHERE id = ? AND user_id = ?', [req.params.id, userId]);
    const row = (rows as any[])[0];

    if (!row) {
      return res.status(404).json({ error: 'Planner task not found' });
    }

    return res.status(200).json(toCamelCase(row));
  } catch (err: any) {
    console.error('[PLANNER-TASKS] Get error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create planner task
router.post('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    // If vehicleId provided, verify vehicle ownership
    const { vehicleId } = req.body;
    if (vehicleId) {
      const [vehicleRows] = await pool.execute('SELECT id FROM vehicles WHERE id = ? AND user_id = ?', [vehicleId, userId]);
      const vehicle = (vehicleRows as any[])[0];
      if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }
    }

    const id = uuid();
    const data = toSnakeCase(req.body);

    await pool.execute(`
      INSERT INTO planner_tasks (id, user_id, vehicle_id, title, description, priority, stage, category, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      userId,
      data.vehicle_id || null,
      data.title,
      data.description || '',
      data.priority || 'normal',
      data.stage || 'planned',
      data.category || 'service',
      data.notes || ''
    ]);

    const [createdRows] = await pool.execute('SELECT * FROM planner_tasks WHERE id = ?', [id]);
    const created = (createdRows as any[])[0];
    return res.status(201).json(toCamelCase(created));
  } catch (err: any) {
    console.error('[PLANNER-TASKS] Create error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update planner task
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute('SELECT id FROM planner_tasks WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Planner task not found' });
    }

    const data = toSnakeCase(req.body);

    await pool.execute(`
      UPDATE planner_tasks SET
        vehicle_id = COALESCE(?, vehicle_id),
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        priority = COALESCE(?, priority),
        stage = COALESCE(?, stage),
        category = COALESCE(?, category),
        notes = COALESCE(?, notes)
      WHERE id = ? AND user_id = ?
    `, [
      data.vehicle_id ?? null,
      data.title ?? null,
      data.description ?? null,
      data.priority ?? null,
      data.stage ?? null,
      data.category ?? null,
      data.notes ?? null,
      id,
      userId
    ]);

    const [updatedRows] = await pool.execute('SELECT * FROM planner_tasks WHERE id = ?', [id]);
    const updated = (updatedRows as any[])[0];
    return res.status(200).json(toCamelCase(updated));
  } catch (err: any) {
    console.error('[PLANNER-TASKS] Update error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id/stage - quick stage update
router.put('/:id/stage', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { stage } = req.body;

    if (!stage) {
      return res.status(400).json({ error: 'stage is required' });
    }

    const [existingRows] = await pool.execute('SELECT id FROM planner_tasks WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Planner task not found' });
    }

    await pool.execute('UPDATE planner_tasks SET stage = ? WHERE id = ? AND user_id = ?', [stage, id, userId]);

    const [updatedRows] = await pool.execute('SELECT * FROM planner_tasks WHERE id = ?', [id]);
    const updated = (updatedRows as any[])[0];
    return res.status(200).json(toCamelCase(updated));
  } catch (err: any) {
    console.error('[PLANNER-TASKS] Stage update error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete planner task
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute('SELECT id FROM planner_tasks WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Planner task not found' });
    }

    await pool.execute('DELETE FROM planner_tasks WHERE id = ? AND user_id = ?', [id, userId]);

    return res.status(200).json({ message: 'Planner task deleted' });
  } catch (err: any) {
    console.error('[PLANNER-TASKS] Delete error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
