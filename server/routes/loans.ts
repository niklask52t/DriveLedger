import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getPool } from '../db';
import { combinedAuthMiddleware } from '../middleware';
import { toCamelCase, toSnakeCase, rowsToCamelCase } from '../utils';

const router = Router();
router.use(combinedAuthMiddleware);

// GET / - list all loans, optional ?vehicleId=xxx
router.get('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const vehicleId = req.query.vehicleId as string | undefined;

    let rows: any[];
    if (vehicleId) {
      const [result] = await pool.execute(
        'SELECT * FROM loans WHERE user_id = ? AND vehicle_id = ? ORDER BY created_at DESC',
        [userId, vehicleId]
      );
      rows = result as any[];
    } else {
      const [result] = await pool.execute(
        'SELECT * FROM loans WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );
      rows = result as any[];
    }

    return res.status(200).json(rowsToCamelCase(rows));
  } catch (err: any) {
    console.error('[LOANS] List error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - single loan
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const [rows] = await pool.execute('SELECT * FROM loans WHERE id = ? AND user_id = ?', [req.params.id, userId]);
    const row = (rows as any[])[0];

    if (!row) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    return res.status(200).json(toCamelCase(row));
  } catch (err: any) {
    console.error('[LOANS] Get error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create loan
router.post('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { vehicleId, name } = req.body;

    if (!vehicleId || !name) {
      return res.status(400).json({ error: 'vehicleId and name are required' });
    }

    // Verify vehicle ownership
    const [vehicleRows] = await pool.execute('SELECT id FROM vehicles WHERE id = ? AND user_id = ?', [vehicleId, userId]);
    const vehicle = (vehicleRows as any[])[0];
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const id = uuid();
    const data = toSnakeCase(req.body);

    await pool.execute(`
      INSERT INTO loans (id, user_id, vehicle_id, name, total_amount, monthly_payment, interest_rate, start_date, duration_months, additional_savings_per_month, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      userId,
      data.vehicle_id,
      data.name,
      data.total_amount || 0,
      data.monthly_payment || 0,
      data.interest_rate || 0,
      data.start_date || '',
      data.duration_months || 0,
      data.additional_savings_per_month || 0,
      data.notes || ''
    ]);

    const [createdRows] = await pool.execute('SELECT * FROM loans WHERE id = ?', [id]);
    const created = (createdRows as any[])[0];
    return res.status(201).json(toCamelCase(created));
  } catch (err: any) {
    console.error('[LOANS] Create error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update loan
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute('SELECT id FROM loans WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const data = toSnakeCase(req.body);

    await pool.execute(`
      UPDATE loans SET
        name = COALESCE(?, name),
        total_amount = COALESCE(?, total_amount),
        monthly_payment = COALESCE(?, monthly_payment),
        interest_rate = COALESCE(?, interest_rate),
        start_date = COALESCE(?, start_date),
        duration_months = COALESCE(?, duration_months),
        additional_savings_per_month = COALESCE(?, additional_savings_per_month),
        notes = COALESCE(?, notes)
      WHERE id = ? AND user_id = ?
    `, [
      data.name ?? null,
      data.total_amount ?? null,
      data.monthly_payment ?? null,
      data.interest_rate ?? null,
      data.start_date ?? null,
      data.duration_months ?? null,
      data.additional_savings_per_month ?? null,
      data.notes ?? null,
      id,
      userId
    ]);

    const [updatedRows] = await pool.execute('SELECT * FROM loans WHERE id = ?', [id]);
    const updated = (updatedRows as any[])[0];
    return res.status(200).json(toCamelCase(updated));
  } catch (err: any) {
    console.error('[LOANS] Update error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete loan
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute('SELECT id FROM loans WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    await pool.execute('DELETE FROM loans WHERE id = ? AND user_id = ?', [id, userId]);

    return res.status(200).json({ message: 'Loan deleted' });
  } catch (err: any) {
    console.error('[LOANS] Delete error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
