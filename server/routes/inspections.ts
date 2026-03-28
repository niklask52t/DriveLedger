import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getPool } from '../db';
import { combinedAuthMiddleware } from '../middleware';
import { toCamelCase, toSnakeCase, rowsToCamelCase } from '../utils';
import { fireWebhooks } from '../webhookTrigger.js';
import { autoInsertOdometer } from '../auto-odometer.js';
import { pushbackReminders } from '../reminder-pushback.js';

const router = Router();
router.use(combinedAuthMiddleware);

function parseInspectionRow(row: any): any {
  const obj = toCamelCase(row);
  if (typeof obj.items === 'string') obj.items = JSON.parse(obj.items);
  if (typeof obj.results === 'string') obj.results = JSON.parse(obj.results);
  obj.failed = !!obj.failed;
  return obj;
}

function parseTemplateRow(row: any): any {
  const obj = toCamelCase(row);
  if (typeof obj.fields === 'string') obj.fields = JSON.parse(obj.fields);
  return obj;
}

/** Auto-compute failed based on results JSON */
function computeFailed(results: any[]): boolean {
  if (!results || !Array.isArray(results)) return false;
  return results.some((r: any) => r.passed === false);
}

// ─── Templates ─────────────────────────────────────────

// GET /templates - list all inspection templates for the user
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const [rows] = await pool.execute(
      'SELECT * FROM inspection_templates WHERE user_id = ? ORDER BY name ASC',
      [userId]
    );
    return res.status(200).json((rows as any[]).map(parseTemplateRow));
  } catch (err: any) {
    console.error('[INSPECTIONS] List templates error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /templates - create a new template
router.post('/templates', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { name, fields } = req.body;

    if (!name || !fields) {
      return res.status(400).json({ error: 'name and fields are required' });
    }

    const id = uuid();
    const fieldsStr = JSON.stringify(fields);

    await pool.execute(
      'INSERT INTO inspection_templates (id, user_id, name, fields) VALUES (?, ?, ?, ?)',
      [id, userId, name, fieldsStr]
    );

    const [createdRows] = await pool.execute('SELECT * FROM inspection_templates WHERE id = ?', [id]);
    const created = (createdRows as any[])[0];
    return res.status(201).json(parseTemplateRow(created));
  } catch (err: any) {
    console.error('[INSPECTIONS] Create template error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /templates/:id - delete a template
router.delete('/templates/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute(
      'SELECT id FROM inspection_templates WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Template not found' });
    }

    await pool.execute('DELETE FROM inspection_templates WHERE id = ? AND user_id = ?', [id, userId]);
    return res.status(200).json({ message: 'Template deleted' });
  } catch (err: any) {
    console.error('[INSPECTIONS] Delete template error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Inspections ───────────────────────────────────────

// GET / - list all inspections, optional ?vehicleId=xxx
router.get('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const vehicleId = req.query.vehicleId as string | undefined;

    let rows: any[];
    if (vehicleId) {
      const [result] = await pool.execute(
        'SELECT * FROM inspections WHERE user_id = ? AND vehicle_id = ? ORDER BY date DESC',
        [userId, vehicleId]
      );
      rows = result as any[];
    } else {
      const [result] = await pool.execute(
        'SELECT * FROM inspections WHERE user_id = ? ORDER BY date DESC',
        [userId]
      );
      rows = result as any[];
    }

    return res.status(200).json(rows.map(parseInspectionRow));
  } catch (err: any) {
    console.error('[INSPECTIONS] List error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - single inspection
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const [rows] = await pool.execute('SELECT * FROM inspections WHERE id = ? AND user_id = ?', [req.params.id, userId]);
    const row = (rows as any[])[0];

    if (!row) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    return res.status(200).json(parseInspectionRow(row));
  } catch (err: any) {
    console.error('[INSPECTIONS] Get error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create inspection
router.post('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { vehicleId, title } = req.body;

    if (!vehicleId || !title) {
      return res.status(400).json({ error: 'vehicleId and title are required' });
    }

    // Verify vehicle ownership
    const [vehicleRows] = await pool.execute('SELECT id FROM vehicles WHERE id = ? AND user_id = ?', [vehicleId, userId]);
    const vehicle = (vehicleRows as any[])[0];
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const id = uuid();
    const data = toSnakeCase(req.body);
    const itemsStr = data.items ? JSON.stringify(data.items) : null;
    const resultsStr = data.results ? JSON.stringify(data.results) : null;
    const failed = data.results ? (computeFailed(data.results) ? 1 : 0) : 0;

    await pool.execute(`
      INSERT INTO inspections (id, user_id, vehicle_id, date, title, items, overall_result, mileage, cost, notes, template_name, results, failed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      userId,
      data.vehicle_id,
      data.date || '',
      data.title,
      itemsStr,
      data.overall_result || '',
      data.mileage || 0,
      data.cost || 0,
      data.notes || '',
      data.template_name || null,
      resultsStr,
      failed,
    ]);

    // Auto-create planner tasks for failed inspection results with action items
    if (failed && data.results && Array.isArray(data.results)) {
      for (const result of data.results) {
        if (result.passed === false && result.has_action_item) {
          const taskId = uuid();
          await pool.execute(
            `INSERT INTO planner_tasks (id, user_id, vehicle_id, title, description, stage, priority, category, notes, target_type, estimated_cost)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              taskId,
              userId,
              data.vehicle_id,
              result.action_item_description || result.field_description || 'Inspection follow-up',
              `Auto-created from inspection: ${data.title}`,
              'planned',
              result.action_item_priority || 'normal',
              result.action_item_type || 'repair',
              '',
              result.action_item_type || 'repair',
              0,
            ]
          );
        }
      }
    }

    // Auto-insert service record from inspection
    const inspCost = Number(data.cost) || 0;
    if (data.title || inspCost > 0) {
      const serviceId = uuid();
      await pool.execute(`
        INSERT INTO service_records (id, user_id, vehicle_id, date, description, mileage, cost, notes, category)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        serviceId,
        userId,
        data.vehicle_id,
        data.date || '',
        `Inspection: ${data.title}`,
        data.mileage || 0,
        inspCost,
        data.notes || '',
        'other',
      ]);
    }

    const [createdRows] = await pool.execute('SELECT * FROM inspections WHERE id = ?', [id]);
    const created = (createdRows as any[])[0];
    const result = parseInspectionRow(created);
    fireWebhooks(userId, 'record.created', { type: 'inspection', ...result });

    // Auto-insert odometer record if mileage is provided
    const inspMileage = Number(data.mileage) || 0;
    if (inspMileage > 0) {
      await autoInsertOdometer(userId, data.vehicle_id, inspMileage, data.date || '');
    }

    // Push back recurring reminders for this vehicle
    await pushbackReminders(userId, data.vehicle_id, inspMileage || undefined);

    return res.status(201).json(result);
  } catch (err: any) {
    console.error('[INSPECTIONS] Create error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update inspection
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute('SELECT id FROM inspections WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    const data = toSnakeCase(req.body);
    const itemsStr = data.items !== undefined ? JSON.stringify(data.items) : null;
    const resultsStr = data.results !== undefined ? JSON.stringify(data.results) : null;
    const failed = data.results !== undefined ? (computeFailed(data.results) ? 1 : 0) : null;

    await pool.execute(`
      UPDATE inspections SET
        date = COALESCE(?, date),
        title = COALESCE(?, title),
        items = COALESCE(?, items),
        overall_result = COALESCE(?, overall_result),
        mileage = COALESCE(?, mileage),
        cost = COALESCE(?, cost),
        notes = COALESCE(?, notes),
        template_name = COALESCE(?, template_name),
        results = COALESCE(?, results),
        failed = COALESCE(?, failed)
      WHERE id = ? AND user_id = ?
    `, [
      data.date ?? null,
      data.title ?? null,
      itemsStr,
      data.overall_result ?? null,
      data.mileage ?? null,
      data.cost ?? null,
      data.notes ?? null,
      data.template_name ?? null,
      resultsStr,
      failed,
      id,
      userId
    ]);

    // Auto-create planner tasks for failed inspection results with action items (on update)
    if (failed === 1 && data.results !== undefined && Array.isArray(data.results)) {
      for (const result of data.results) {
        if (result.passed === false && result.has_action_item) {
          const taskId = uuid();
          // Get vehicle_id from the existing inspection
          const [inspRow] = await pool.execute('SELECT vehicle_id FROM inspections WHERE id = ?', [id]);
          const inspVehicleId = (inspRow as any[])[0]?.vehicle_id;
          await pool.execute(
            `INSERT INTO planner_tasks (id, user_id, vehicle_id, title, description, stage, priority, category, notes, target_type, estimated_cost)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              taskId,
              userId,
              inspVehicleId,
              result.action_item_description || result.field_description || 'Inspection follow-up',
              `Auto-created from inspection update: ${data.title || 'Inspection'}`,
              'planned',
              result.action_item_priority || 'normal',
              result.action_item_type || 'repair',
              '',
              result.action_item_type || 'repair',
              0,
            ]
          );
        }
      }
    }

    const [updatedRows] = await pool.execute('SELECT * FROM inspections WHERE id = ?', [id]);
    const updated = (updatedRows as any[])[0];
    const result = parseInspectionRow(updated);
    fireWebhooks(userId, 'record.updated', { type: 'inspection', ...result });
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[INSPECTIONS] Update error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete inspection
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute('SELECT id FROM inspections WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    await pool.execute('DELETE FROM inspections WHERE id = ? AND user_id = ?', [id, userId]);

    fireWebhooks(userId, 'record.deleted', { type: 'inspection', id });
    return res.status(200).json({ message: 'Inspection deleted' });
  } catch (err: any) {
    console.error('[INSPECTIONS] Delete error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
