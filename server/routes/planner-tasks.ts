import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getPool } from '../db';
import { combinedAuthMiddleware } from '../middleware';
import { toCamelCase, toSnakeCase, rowsToCamelCase } from '../utils';

const router = Router();
router.use(combinedAuthMiddleware);

// ─── Plan Templates ──────────────────────────────────────

// GET /templates - list plan templates
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const [rows] = await pool.execute('SELECT * FROM plan_templates WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    return res.status(200).json(rowsToCamelCase(rows as any[]));
  } catch (err: any) {
    console.error('[PLANNER-TASKS] List templates error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /templates - create plan template
router.post('/templates', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { name, description, targetType, priority, estimatedCost } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const id = uuid();
    await pool.execute(`
      INSERT INTO plan_templates (id, user_id, name, description, target_type, priority, estimated_cost)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      userId,
      name,
      description || '',
      targetType || 'service',
      priority || 'normal',
      estimatedCost || 0,
    ]);

    const [createdRows] = await pool.execute('SELECT * FROM plan_templates WHERE id = ?', [id]);
    const created = (createdRows as any[])[0];
    return res.status(201).json(toCamelCase(created));
  } catch (err: any) {
    console.error('[PLANNER-TASKS] Create template error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /templates/:id - delete plan template
router.delete('/templates/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute('SELECT id FROM plan_templates WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Template not found' });
    }

    await pool.execute('DELETE FROM plan_templates WHERE id = ? AND user_id = ?', [id, userId]);
    return res.status(200).json({ message: 'Template deleted' });
  } catch (err: any) {
    console.error('[PLANNER-TASKS] Delete template error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /from-template/:templateId - create a task from a template
router.post('/from-template/:templateId', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { templateId } = req.params;
    const { vehicleId } = req.body;

    const [templateRows] = await pool.execute('SELECT * FROM plan_templates WHERE id = ? AND user_id = ?', [templateId, userId]);
    const template = (templateRows as any[])[0];
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (vehicleId) {
      const [vehicleRows] = await pool.execute('SELECT id FROM vehicles WHERE id = ? AND user_id = ?', [vehicleId, userId]);
      if ((vehicleRows as any[]).length === 0) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }
    }

    const id = uuid();
    await pool.execute(`
      INSERT INTO planner_tasks (id, user_id, vehicle_id, title, description, priority, stage, category, notes, target_type, estimated_cost)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      userId,
      vehicleId || null,
      template.name,
      template.description || '',
      template.priority || 'normal',
      'planned',
      template.target_type || 'service',
      '',
      template.target_type || 'service',
      template.estimated_cost || 0,
    ]);

    const [createdRows] = await pool.execute('SELECT * FROM planner_tasks WHERE id = ?', [id]);
    const created = (createdRows as any[])[0];
    return res.status(201).json(toCamelCase(created));
  } catch (err: any) {
    console.error('[PLANNER-TASKS] From template error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

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
      INSERT INTO planner_tasks (id, user_id, vehicle_id, title, description, priority, stage, category, notes, target_type, estimated_cost, reminder_record_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      userId,
      data.vehicle_id || null,
      data.title,
      data.description || '',
      data.priority || 'normal',
      data.stage || 'planned',
      data.category || 'service',
      data.notes || '',
      data.target_type || data.category || 'service',
      data.estimated_cost || 0,
      data.reminder_record_id || null,
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
        notes = COALESCE(?, notes),
        target_type = COALESCE(?, target_type),
        estimated_cost = COALESCE(?, estimated_cost),
        reminder_record_id = COALESCE(?, reminder_record_id),
        updated_at = NOW()
      WHERE id = ? AND user_id = ?
    `, [
      data.vehicle_id ?? null,
      data.title ?? null,
      data.description ?? null,
      data.priority ?? null,
      data.stage ?? null,
      data.category ?? null,
      data.notes ?? null,
      data.target_type ?? null,
      data.estimated_cost ?? null,
      data.reminder_record_id ?? null,
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

    await pool.execute('UPDATE planner_tasks SET stage = ?, updated_at = NOW() WHERE id = ? AND user_id = ?', [stage, id, userId]);

    const [updatedRows] = await pool.execute('SELECT * FROM planner_tasks WHERE id = ?', [id]);
    const updated = (updatedRows as any[])[0];
    return res.status(200).json(toCamelCase(updated));
  } catch (err: any) {
    console.error('[PLANNER-TASKS] Stage update error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/convert - convert a completed plan to a service/repair/upgrade record
router.post('/:id/convert', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { targetType } = req.body; // 'service', 'repair', or 'upgrade'

    const [taskRows] = await pool.execute('SELECT * FROM planner_tasks WHERE id = ? AND user_id = ?', [id, userId]);
    const task = (taskRows as any[])[0];
    if (!task) {
      return res.status(404).json({ error: 'Planner task not found' });
    }

    if (!task.vehicle_id) {
      return res.status(400).json({ error: 'Task must have a vehicle assigned to convert' });
    }

    const recordType = targetType || task.target_type || task.category || 'service';
    const recordId = uuid();
    const today = new Date().toISOString().slice(0, 10);

    if (recordType === 'service') {
      await pool.execute(`
        INSERT INTO service_records (id, user_id, vehicle_id, date, description, mileage, cost, notes, category)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        recordId, userId, task.vehicle_id, today,
        task.description || task.title, 0,
        task.estimated_cost || 0, task.notes || '', 'other'
      ]);
    } else if (recordType === 'repair') {
      await pool.execute(`
        INSERT INTO repairs (id, user_id, vehicle_id, date, description, category, notes, cost, mileage, workshop)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        recordId, userId, task.vehicle_id, today,
        task.description || task.title, task.category || '',
        task.notes || '', task.estimated_cost || 0, 0, ''
      ]);
    } else if (recordType === 'upgrade') {
      await pool.execute(`
        INSERT INTO upgrade_records (id, user_id, vehicle_id, date, description, cost, mileage, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        recordId, userId, task.vehicle_id, today,
        task.description || task.title,
        task.estimated_cost || 0, 0, task.notes || ''
      ]);
    } else {
      return res.status(400).json({ error: `Invalid target type: ${recordType}. Must be service, repair, or upgrade.` });
    }

    // Delete the planner task
    await pool.execute('DELETE FROM planner_tasks WHERE id = ? AND user_id = ?', [id, userId]);

    return res.status(200).json({ message: 'Task converted to record', recordId, recordType });
  } catch (err: any) {
    console.error('[PLANNER-TASKS] Convert error:', err);
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
