import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getPool } from '../db';
import { combinedAuthMiddleware } from '../middleware';
import { toCamelCase, rowsToCamelCase } from '../utils';

const router = Router();
router.use(combinedAuthMiddleware);

// GET / - list persons for current user
router.get('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const [rows] = await pool.execute('SELECT * FROM persons WHERE user_id = ? ORDER BY name ASC', [userId]);
    return res.status(200).json(rowsToCamelCase(rows as any[]));
  } catch (err: any) {
    console.error('[PERSONS] List error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create person
router.post('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const id = uuid();
    const color = req.body.color || '';

    await pool.execute('INSERT INTO persons (id, user_id, name, color) VALUES (?, ?, ?, ?)', [
      id,
      userId,
      name,
      color
    ]);

    const [createdRows] = await pool.execute('SELECT * FROM persons WHERE id = ?', [id]);
    const created = (createdRows as any[])[0];
    return res.status(201).json(toCamelCase(created));
  } catch (err: any) {
    console.error('[PERSONS] Create error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update person
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute('SELECT id FROM persons WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Person not found' });
    }

    await pool.execute(`
      UPDATE persons SET
        name = COALESCE(?, name),
        color = COALESCE(?, color)
      WHERE id = ? AND user_id = ?
    `, [
      req.body.name ?? null,
      req.body.color ?? null,
      id,
      userId
    ]);

    const [updatedRows] = await pool.execute('SELECT * FROM persons WHERE id = ?', [id]);
    const updated = (updatedRows as any[])[0];
    return res.status(200).json(toCamelCase(updated));
  } catch (err: any) {
    console.error('[PERSONS] Update error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete person
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute('SELECT id FROM persons WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Person not found' });
    }

    await pool.execute('DELETE FROM persons WHERE id = ? AND user_id = ?', [id, userId]);

    return res.status(200).json({ message: 'Person deleted' });
  } catch (err: any) {
    console.error('[PERSONS] Delete error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
