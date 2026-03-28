import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getPool } from '../db';
import { combinedAuthMiddleware } from '../middleware';
import { toCamelCase, rowsToCamelCase } from '../utils';

const router = Router();
router.use(combinedAuthMiddleware);

function parseFieldRow(row: any): any {
  const obj = toCamelCase(row);
  obj.isRequired = !!obj.isRequired;
  return obj;
}

// GET / - list all extra field definitions for the user
router.get('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;

    const [rows] = await pool.execute(
      'SELECT * FROM extra_field_definitions WHERE user_id = ? ORDER BY record_type, sort_order ASC',
      [userId]
    );

    return res.status(200).json((rows as any[]).map(parseFieldRow));
  } catch (err: any) {
    console.error('[EXTRA-FIELDS] List error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create a field definition
router.post('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { recordType, fieldName, fieldType, isRequired, sortOrder } = req.body;

    if (!recordType || !fieldName) {
      return res.status(400).json({ error: 'recordType and fieldName are required' });
    }

    const id = uuid();
    await pool.execute(`
      INSERT INTO extra_field_definitions (id, user_id, record_type, field_name, field_type, is_required, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      userId,
      recordType,
      fieldName,
      fieldType || 'text',
      isRequired ? 1 : 0,
      sortOrder ?? 0,
    ]);

    const [createdRows] = await pool.execute('SELECT * FROM extra_field_definitions WHERE id = ?', [id]);
    const created = (createdRows as any[])[0];
    return res.status(201).json(parseFieldRow(created));
  } catch (err: any) {
    console.error('[EXTRA-FIELDS] Create error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update a field definition
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute(
      'SELECT id FROM extra_field_definitions WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    if ((existingRows as any[]).length === 0) {
      return res.status(404).json({ error: 'Field definition not found' });
    }

    const { recordType, fieldName, fieldType, isRequired, sortOrder } = req.body;

    await pool.execute(`
      UPDATE extra_field_definitions SET
        record_type = COALESCE(?, record_type),
        field_name = COALESCE(?, field_name),
        field_type = COALESCE(?, field_type),
        is_required = COALESCE(?, is_required),
        sort_order = COALESCE(?, sort_order)
      WHERE id = ? AND user_id = ?
    `, [
      recordType ?? null,
      fieldName ?? null,
      fieldType ?? null,
      isRequired !== undefined ? (isRequired ? 1 : 0) : null,
      sortOrder ?? null,
      id,
      userId,
    ]);

    const [updatedRows] = await pool.execute('SELECT * FROM extra_field_definitions WHERE id = ?', [id]);
    const updated = (updatedRows as any[])[0];
    return res.status(200).json(parseFieldRow(updated));
  } catch (err: any) {
    console.error('[EXTRA-FIELDS] Update error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete a field definition
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute(
      'SELECT id FROM extra_field_definitions WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    if ((existingRows as any[]).length === 0) {
      return res.status(404).json({ error: 'Field definition not found' });
    }

    await pool.execute('DELETE FROM extra_field_definitions WHERE id = ? AND user_id = ?', [id, userId]);

    return res.status(200).json({ message: 'Field definition deleted' });
  } catch (err: any) {
    console.error('[EXTRA-FIELDS] Delete error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
