import { Router, Request, Response } from 'express';
import { getPool } from '../db.js';
import { combinedAuthMiddleware } from '../middleware.js';
import { toSnakeCase } from '../utils.js';

const router = Router();
router.use(combinedAuthMiddleware);

// Allowed record types and their corresponding table names
const RECORD_TYPE_MAP: Record<string, string> = {
  services: 'service_records',
  repairs: 'repairs',
  upgrades: 'upgrade_records',
  fuel: 'fuel_records',
  odometer: 'odometer_records',
  costs: 'costs',
  loans: 'loans',
  supplies: 'supplies',
  equipment: 'equipment',
  inspections: 'inspections',
  vehicleNotes: 'vehicle_notes',
  taxes: 'taxes',
  plannerTasks: 'planner_tasks',
};

// Columns that are safe to bulk-update per record type
const UPDATABLE_COLUMNS: Record<string, string[]> = {
  service_records: ['date', 'description', 'mileage', 'cost', 'notes', 'tags', 'category'],
  repairs: ['date', 'description', 'category', 'notes', 'cost', 'mileage', 'workshop'],
  upgrade_records: ['date', 'description', 'cost', 'mileage', 'notes', 'tags'],
  fuel_records: ['date', 'mileage', 'fuel_amount', 'fuel_cost', 'is_partial_fill', 'is_missed_entry', 'fuel_type', 'station', 'notes', 'tags'],
  odometer_records: ['date', 'mileage', 'notes', 'tags'],
  costs: ['name', 'category', 'amount', 'frequency', 'paid_by', 'start_date', 'end_date', 'notes'],
  loans: ['name', 'total_amount', 'monthly_payment', 'interest_rate', 'start_date', 'duration_months', 'notes'],
  supplies: ['name', 'part_number', 'description', 'quantity', 'unit_cost', 'notes', 'tags'],
  equipment: ['name', 'description', 'is_equipped', 'total_distance', 'notes'],
  inspections: ['date', 'title', 'overall_result', 'mileage', 'cost', 'notes'],
  vehicle_notes: ['title', 'content', 'is_pinned', 'tags'],
  taxes: ['date', 'description', 'cost', 'is_recurring', 'recurring_interval', 'due_date', 'notes', 'tags'],
  planner_tasks: ['title', 'description', 'priority', 'stage', 'category', 'notes'],
};

function getTableName(recordType: string): string | null {
  return RECORD_TYPE_MAP[recordType] || null;
}

// POST /bulk/edit - Bulk update records
router.post('/edit', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { recordType, ids, updates } = req.body;

    if (!recordType || !Array.isArray(ids) || ids.length === 0 || !updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'recordType, ids (non-empty array), and updates (object) are required' });
    }

    const tableName = getTableName(recordType);
    if (!tableName) {
      return res.status(400).json({ error: `Invalid recordType: ${recordType}` });
    }

    const allowedColumns = UPDATABLE_COLUMNS[tableName] || [];
    const snakeUpdates = toSnakeCase(updates);

    // Build SET clause with only allowed columns
    const setClauses: string[] = [];
    const values: any[] = [];

    for (const [col, val] of Object.entries(snakeUpdates)) {
      if (allowedColumns.includes(col)) {
        setClauses.push(`${col} = ?`);
        if (col === 'tags') {
          values.push(val ? JSON.stringify(val) : null);
        } else {
          values.push(val);
        }
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Build placeholders for IN clause
    const placeholders = ids.map(() => '?').join(', ');
    const query = `UPDATE ${tableName} SET ${setClauses.join(', ')} WHERE id IN (${placeholders}) AND user_id = ?`;
    values.push(...ids, userId);

    const [result] = await pool.execute(query, values);
    const affected = (result as any).affectedRows || 0;

    return res.status(200).json({ message: 'Bulk edit complete', affected });
  } catch (err: any) {
    console.error('[BULK] Edit error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /bulk/delete - Bulk delete records
router.post('/delete', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { recordType, ids } = req.body;

    if (!recordType || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'recordType and ids (non-empty array) are required' });
    }

    const tableName = getTableName(recordType);
    if (!tableName) {
      return res.status(400).json({ error: `Invalid recordType: ${recordType}` });
    }

    const placeholders = ids.map(() => '?').join(', ');
    const [result] = await pool.execute(
      `DELETE FROM ${tableName} WHERE id IN (${placeholders}) AND user_id = ?`,
      [...ids, userId]
    );

    const affected = (result as any).affectedRows || 0;

    return res.status(200).json({ message: 'Bulk delete complete', affected });
  } catch (err: any) {
    console.error('[BULK] Delete error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /bulk/move - Move records between service/repair/upgrade types
router.post('/move', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { fromType, toType, ids } = req.body;

    if (!fromType || !toType || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'fromType, toType, and ids (non-empty array) are required' });
    }

    // Only allow moves between services, repairs, and upgrades
    const MOVEABLE_TYPES = ['services', 'repairs', 'upgrades'];
    if (!MOVEABLE_TYPES.includes(fromType) || !MOVEABLE_TYPES.includes(toType)) {
      return res.status(400).json({ error: `fromType and toType must be one of: ${MOVEABLE_TYPES.join(', ')}` });
    }

    if (fromType === toType) {
      return res.status(400).json({ error: 'fromType and toType must be different' });
    }

    const fromTable = getTableName(fromType)!;
    const toTable = getTableName(toType)!;

    const conn = await pool.getConnection();
    await conn.beginTransaction();
    try {
      const placeholders = ids.map(() => '?').join(', ');

      // Fetch source records
      const [sourceRows] = await conn.execute(
        `SELECT * FROM ${fromTable} WHERE id IN (${placeholders}) AND user_id = ?`,
        [...ids, userId]
      );
      const records = sourceRows as any[];

      if (records.length === 0) {
        await conn.rollback();
        return res.status(404).json({ error: 'No matching records found' });
      }

      // Insert into target table with common fields
      for (const r of records) {
        await conn.execute(
          `INSERT INTO ${toTable} (id, user_id, vehicle_id, date, description, cost, mileage, notes, tags, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            r.id,
            r.user_id,
            r.vehicle_id,
            r.date || '',
            r.description || '',
            r.cost || 0,
            r.mileage || 0,
            r.notes || '',
            r.tags || null,
            r.created_at || new Date().toISOString(),
          ]
        );
      }

      // Delete from source
      await conn.execute(
        `DELETE FROM ${fromTable} WHERE id IN (${placeholders}) AND user_id = ?`,
        [...ids, userId]
      );

      await conn.commit();

      return res.status(200).json({ message: 'Bulk move complete', moved: records.length });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err: any) {
    console.error('[BULK] Move error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /bulk/tag - Bulk add/remove tags
router.post('/tag', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { recordType, ids, addTags, removeTags } = req.body;

    if (!recordType || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'recordType and ids (non-empty array) are required' });
    }

    const tableName = getTableName(recordType);
    if (!tableName) {
      return res.status(400).json({ error: `Invalid recordType: ${recordType}` });
    }

    // Check that the table supports tags
    const allowedColumns = UPDATABLE_COLUMNS[tableName] || [];
    if (!allowedColumns.includes('tags')) {
      return res.status(400).json({ error: `Record type ${recordType} does not support tags` });
    }

    const placeholders = ids.map(() => '?').join(', ');

    // Fetch existing records
    const [rows] = await pool.execute(
      `SELECT id, tags FROM ${tableName} WHERE id IN (${placeholders}) AND user_id = ?`,
      [...ids, userId]
    );

    const records = rows as any[];
    let updated = 0;

    for (const record of records) {
      let tags: string[];
      try {
        tags = typeof record.tags === 'string' ? JSON.parse(record.tags) : (record.tags || []);
      } catch {
        tags = [];
      }
      if (!Array.isArray(tags)) tags = [];

      // Add tags
      if (Array.isArray(addTags)) {
        for (const tag of addTags) {
          if (!tags.includes(tag)) {
            tags.push(tag);
          }
        }
      }

      // Remove tags
      if (Array.isArray(removeTags)) {
        tags = tags.filter((t: string) => !removeTags.includes(t));
      }

      await pool.execute(
        `UPDATE ${tableName} SET tags = ? WHERE id = ? AND user_id = ?`,
        [JSON.stringify(tags), record.id, userId]
      );
      updated++;
    }

    return res.status(200).json({ message: 'Bulk tag update complete', affected: updated });
  } catch (err: any) {
    console.error('[BULK] Tag error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
