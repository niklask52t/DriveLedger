import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db';
import { combinedAuthMiddleware } from '../middleware';
import { toCamelCase, rowsToCamelCase } from '../utils';

const router = Router();
router.use(combinedAuthMiddleware);

// GET / - list persons for current user
router.get('/', (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const rows = db.prepare('SELECT * FROM persons WHERE user_id = ? ORDER BY name ASC').all(userId) as any[];
    return res.status(200).json(rowsToCamelCase(rows));
  } catch (err: any) {
    console.error('[PERSONS] List error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create person
router.post('/', (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const id = uuid();
    const color = req.body.color || '';

    db.prepare('INSERT INTO persons (id, user_id, name, color) VALUES (?, ?, ?, ?)').run(
      id,
      userId,
      name,
      color
    );

    const created = db.prepare('SELECT * FROM persons WHERE id = ?').get(id) as any;
    return res.status(201).json(toCamelCase(created));
  } catch (err: any) {
    console.error('[PERSONS] Create error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update person
router.put('/:id', (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const existing = db.prepare('SELECT id FROM persons WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Person not found' });
    }

    db.prepare(`
      UPDATE persons SET
        name = COALESCE(?, name),
        color = COALESCE(?, color)
      WHERE id = ? AND user_id = ?
    `).run(
      req.body.name ?? null,
      req.body.color ?? null,
      id,
      userId
    );

    const updated = db.prepare('SELECT * FROM persons WHERE id = ?').get(id) as any;
    return res.status(200).json(toCamelCase(updated));
  } catch (err: any) {
    console.error('[PERSONS] Update error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete person
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const existing = db.prepare('SELECT id FROM persons WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Person not found' });
    }

    db.prepare('DELETE FROM persons WHERE id = ? AND user_id = ?').run(id, userId);

    return res.status(200).json({ message: 'Person deleted' });
  } catch (err: any) {
    console.error('[PERSONS] Delete error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
