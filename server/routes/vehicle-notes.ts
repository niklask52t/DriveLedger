import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getPool } from '../db';
import { combinedAuthMiddleware } from '../middleware';
import { toCamelCase, toSnakeCase, rowsToCamelCase } from '../utils';

const router = Router();
router.use(combinedAuthMiddleware);

function parseNoteRow(row: any): any {
  const obj = toCamelCase(row);
  if (typeof obj.tags === 'string') obj.tags = JSON.parse(obj.tags);
  obj.isPinned = !!obj.isPinned;
  return obj;
}

// GET / - list all vehicle notes, optional ?vehicleId=xxx
router.get('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const vehicleId = req.query.vehicleId as string | undefined;

    let rows: any[];
    if (vehicleId) {
      const [result] = await pool.execute(
        'SELECT * FROM vehicle_notes WHERE user_id = ? AND vehicle_id = ? ORDER BY is_pinned DESC, created_at DESC',
        [userId, vehicleId]
      );
      rows = result as any[];
    } else {
      const [result] = await pool.execute(
        'SELECT * FROM vehicle_notes WHERE user_id = ? ORDER BY is_pinned DESC, created_at DESC',
        [userId]
      );
      rows = result as any[];
    }

    return res.status(200).json(rows.map(parseNoteRow));
  } catch (err: any) {
    console.error('[VEHICLE-NOTES] List error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - single vehicle note
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const [rows] = await pool.execute('SELECT * FROM vehicle_notes WHERE id = ? AND user_id = ?', [req.params.id, userId]);
    const row = (rows as any[])[0];

    if (!row) {
      return res.status(404).json({ error: 'Vehicle note not found' });
    }

    return res.status(200).json(parseNoteRow(row));
  } catch (err: any) {
    console.error('[VEHICLE-NOTES] Get error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create vehicle note
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
    const tagsStr = data.tags ? JSON.stringify(data.tags) : null;

    await pool.execute(`
      INSERT INTO vehicle_notes (id, user_id, vehicle_id, title, content, is_pinned, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      userId,
      data.vehicle_id,
      data.title,
      data.content || '',
      data.is_pinned ? 1 : 0,
      tagsStr
    ]);

    const [createdRows] = await pool.execute('SELECT * FROM vehicle_notes WHERE id = ?', [id]);
    const created = (createdRows as any[])[0];
    return res.status(201).json(parseNoteRow(created));
  } catch (err: any) {
    console.error('[VEHICLE-NOTES] Create error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update vehicle note
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute('SELECT id FROM vehicle_notes WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Vehicle note not found' });
    }

    const data = toSnakeCase(req.body);
    const tagsStr = data.tags !== undefined ? JSON.stringify(data.tags) : null;

    await pool.execute(`
      UPDATE vehicle_notes SET
        title = COALESCE(?, title),
        content = COALESCE(?, content),
        is_pinned = COALESCE(?, is_pinned),
        tags = COALESCE(?, tags)
      WHERE id = ? AND user_id = ?
    `, [
      data.title ?? null,
      data.content ?? null,
      data.is_pinned !== undefined ? (data.is_pinned ? 1 : 0) : null,
      tagsStr,
      id,
      userId
    ]);

    const [updatedRows] = await pool.execute('SELECT * FROM vehicle_notes WHERE id = ?', [id]);
    const updated = (updatedRows as any[])[0];
    return res.status(200).json(parseNoteRow(updated));
  } catch (err: any) {
    console.error('[VEHICLE-NOTES] Update error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id/pin - toggle is_pinned
router.put('/:id/pin', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute('SELECT * FROM vehicle_notes WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Vehicle note not found' });
    }

    const newPinned = existing.is_pinned ? 0 : 1;
    await pool.execute('UPDATE vehicle_notes SET is_pinned = ? WHERE id = ? AND user_id = ?', [newPinned, id, userId]);

    const [updatedRows] = await pool.execute('SELECT * FROM vehicle_notes WHERE id = ?', [id]);
    const updated = (updatedRows as any[])[0];
    return res.status(200).json(parseNoteRow(updated));
  } catch (err: any) {
    console.error('[VEHICLE-NOTES] Pin error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete vehicle note
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute('SELECT id FROM vehicle_notes WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Vehicle note not found' });
    }

    await pool.execute('DELETE FROM vehicle_notes WHERE id = ? AND user_id = ?', [id, userId]);

    return res.status(200).json({ message: 'Vehicle note deleted' });
  } catch (err: any) {
    console.error('[VEHICLE-NOTES] Delete error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
