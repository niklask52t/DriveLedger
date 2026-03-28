import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getPool } from '../db';
import { combinedAuthMiddleware } from '../middleware';
import { toCamelCase, rowsToCamelCase } from '../utils';

const router = Router();
router.use(combinedAuthMiddleware);

// GET / - list households user belongs to (as head or member)
router.get('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;

    const [rows] = await pool.execute(`
      SELECT DISTINCT h.* FROM households h
      LEFT JOIN household_members hm ON hm.household_id = h.id
      WHERE h.head_user_id = ? OR hm.user_id = ?
      ORDER BY h.created_at DESC
    `, [userId, userId]);

    const parsed = (rows as any[]).map((r: any) => toCamelCase(r));
    return res.status(200).json(parsed);
  } catch (err: any) {
    console.error('[HOUSEHOLDS] List error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create household (user becomes head)
router.post('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const id = uuid();
    await pool.execute(`
      INSERT INTO households (id, name, head_user_id)
      VALUES (?, ?, ?)
    `, [id, name, userId]);

    const [createdRows] = await pool.execute('SELECT * FROM households WHERE id = ?', [id]);
    const created = toCamelCase((createdRows as any[])[0]);

    return res.status(201).json(created);
  } catch (err: any) {
    console.error('[HOUSEHOLDS] Create error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update household name (head only)
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { name } = req.body;

    const [existingRows] = await pool.execute(
      'SELECT * FROM households WHERE id = ? AND head_user_id = ?',
      [id, userId]
    );
    if (!(existingRows as any[])[0]) {
      return res.status(404).json({ error: 'Household not found or you are not the head' });
    }

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    await pool.execute('UPDATE households SET name = ? WHERE id = ?', [name, id]);

    const [updatedRows] = await pool.execute('SELECT * FROM households WHERE id = ?', [id]);
    return res.status(200).json(toCamelCase((updatedRows as any[])[0]));
  } catch (err: any) {
    console.error('[HOUSEHOLDS] Update error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete household (head only)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute(
      'SELECT * FROM households WHERE id = ? AND head_user_id = ?',
      [id, userId]
    );
    if (!(existingRows as any[])[0]) {
      return res.status(404).json({ error: 'Household not found or you are not the head' });
    }

    await pool.execute('DELETE FROM households WHERE id = ?', [id]);
    return res.status(200).json({ message: 'Household deleted' });
  } catch (err: any) {
    console.error('[HOUSEHOLDS] Delete error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id/members - list members
router.get('/:id/members', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;

    // Verify user is head or member
    const [accessRows] = await pool.execute(`
      SELECT 1 FROM households h
      LEFT JOIN household_members hm ON hm.household_id = h.id
      WHERE h.id = ? AND (h.head_user_id = ? OR hm.user_id = ?)
      LIMIT 1
    `, [id, userId, userId]);

    if (!(accessRows as any[])[0]) {
      return res.status(404).json({ error: 'Household not found or access denied' });
    }

    const [rows] = await pool.execute(`
      SELECT hm.id, hm.household_id, hm.user_id, hm.permissions, hm.created_at,
             u.email, u.username
      FROM household_members hm
      JOIN users u ON u.id = hm.user_id
      WHERE hm.household_id = ?
      ORDER BY hm.created_at ASC
    `, [id]);

    const parsed = (rows as any[]).map((r: any) => {
      const obj = toCamelCase(r);
      if (typeof obj.permissions === 'string') {
        try { obj.permissions = JSON.parse(obj.permissions); } catch { obj.permissions = ['view']; }
      }
      return obj;
    });

    return res.status(200).json(parsed);
  } catch (err: any) {
    console.error('[HOUSEHOLDS] List members error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/members - add a member by email (head only)
router.post('/:id/members', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { email, permissions } = req.body;

    // Verify caller is head
    const [headRows] = await pool.execute(
      'SELECT * FROM households WHERE id = ? AND head_user_id = ?',
      [id, userId]
    );
    if (!(headRows as any[])[0]) {
      return res.status(404).json({ error: 'Household not found or you are not the head' });
    }

    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    // Find user by email
    const [userRows] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    const targetUser = (userRows as any[])[0];
    if (!targetUser) {
      return res.status(404).json({ error: 'User with this email not found' });
    }

    // Cannot add yourself
    if (targetUser.id === userId) {
      return res.status(400).json({ error: 'You are already the head of this household' });
    }

    // Check if already a member
    const [existingMember] = await pool.execute(
      'SELECT id FROM household_members WHERE household_id = ? AND user_id = ?',
      [id, targetUser.id]
    );
    if ((existingMember as any[])[0]) {
      return res.status(409).json({ error: 'User is already a member of this household' });
    }

    const memberId = uuid();
    const permsStr = JSON.stringify(permissions || ['view']);

    await pool.execute(`
      INSERT INTO household_members (id, household_id, user_id, permissions)
      VALUES (?, ?, ?, ?)
    `, [memberId, id, targetUser.id, permsStr]);

    const [createdRows] = await pool.execute(`
      SELECT hm.id, hm.household_id, hm.user_id, hm.permissions, hm.created_at,
             u.email, u.username
      FROM household_members hm
      JOIN users u ON u.id = hm.user_id
      WHERE hm.id = ?
    `, [memberId]);

    const created = toCamelCase((createdRows as any[])[0]);
    if (typeof created.permissions === 'string') {
      try { created.permissions = JSON.parse(created.permissions); } catch { created.permissions = ['view']; }
    }

    return res.status(201).json(created);
  } catch (err: any) {
    console.error('[HOUSEHOLDS] Add member error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id/members/:memberId - remove a member (head only)
router.delete('/:id/members/:memberId', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id, memberId } = req.params;

    // Verify caller is head
    const [headRows] = await pool.execute(
      'SELECT * FROM households WHERE id = ? AND head_user_id = ?',
      [id, userId]
    );
    if (!(headRows as any[])[0]) {
      return res.status(404).json({ error: 'Household not found or you are not the head' });
    }

    const [existingRows] = await pool.execute(
      'SELECT id FROM household_members WHERE id = ? AND household_id = ?',
      [memberId, id]
    );
    if (!(existingRows as any[])[0]) {
      return res.status(404).json({ error: 'Member not found' });
    }

    await pool.execute('DELETE FROM household_members WHERE id = ? AND household_id = ?', [memberId, id]);

    return res.status(200).json({ message: 'Member removed' });
  } catch (err: any) {
    console.error('[HOUSEHOLDS] Remove member error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
