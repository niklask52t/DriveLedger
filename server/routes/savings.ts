import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db';
import { combinedAuthMiddleware } from '../middleware';
import { toCamelCase, toSnakeCase, rowsToCamelCase } from '../utils';

const router = Router();
router.use(combinedAuthMiddleware);

// ==================== Savings Goals ====================

// GET /goals - list all savings goals
router.get('/goals', (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const rows = db.prepare(
      'SELECT * FROM savings_goals WHERE user_id = ? ORDER BY created_at DESC'
    ).all(userId) as any[];
    return res.status(200).json(rowsToCamelCase(rows));
  } catch (err: any) {
    console.error('[SAVINGS] List goals error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /goals/:id - single goal
router.get('/goals/:id', (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const row = db.prepare(
      'SELECT * FROM savings_goals WHERE id = ? AND user_id = ?'
    ).get(req.params.id, userId) as any;

    if (!row) {
      return res.status(404).json({ error: 'Savings goal not found' });
    }

    return res.status(200).json(toCamelCase(row));
  } catch (err: any) {
    console.error('[SAVINGS] Get goal error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /goals - create goal
router.post('/goals', (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { vehicleId, name } = req.body;

    if (!vehicleId || !name) {
      return res.status(400).json({ error: 'vehicleId and name are required' });
    }

    // Verify vehicle ownership
    const vehicle = db.prepare('SELECT id FROM vehicles WHERE id = ? AND user_id = ?').get(vehicleId, userId) as any;
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const id = uuid();
    const data = toSnakeCase(req.body);

    db.prepare(`
      INSERT INTO savings_goals (id, user_id, vehicle_id, name, target_amount, monthly_contribution, start_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      userId,
      data.vehicle_id,
      data.name,
      data.target_amount || 0,
      data.monthly_contribution || 0,
      data.start_date || '',
      data.notes || ''
    );

    const created = db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(id) as any;
    return res.status(201).json(toCamelCase(created));
  } catch (err: any) {
    console.error('[SAVINGS] Create goal error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /goals/:id - update goal
router.put('/goals/:id', (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const existing = db.prepare(
      'SELECT id FROM savings_goals WHERE id = ? AND user_id = ?'
    ).get(id, userId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Savings goal not found' });
    }

    const data = toSnakeCase(req.body);

    db.prepare(`
      UPDATE savings_goals SET
        name = COALESCE(?, name),
        target_amount = COALESCE(?, target_amount),
        monthly_contribution = COALESCE(?, monthly_contribution),
        start_date = COALESCE(?, start_date),
        notes = COALESCE(?, notes)
      WHERE id = ? AND user_id = ?
    `).run(
      data.name ?? null,
      data.target_amount ?? null,
      data.monthly_contribution ?? null,
      data.start_date ?? null,
      data.notes ?? null,
      id,
      userId
    );

    const updated = db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(id) as any;
    return res.status(200).json(toCamelCase(updated));
  } catch (err: any) {
    console.error('[SAVINGS] Update goal error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /goals/:id - delete goal + its transactions
router.delete('/goals/:id', (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const existing = db.prepare(
      'SELECT id FROM savings_goals WHERE id = ? AND user_id = ?'
    ).get(id, userId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Savings goal not found' });
    }

    const deleteTransaction = db.transaction(() => {
      db.prepare('DELETE FROM savings_transactions WHERE savings_goal_id = ? AND user_id = ?').run(id, userId);
      db.prepare('DELETE FROM savings_goals WHERE id = ? AND user_id = ?').run(id, userId);
    });

    deleteTransaction();

    return res.status(200).json({ message: 'Savings goal and its transactions deleted' });
  } catch (err: any) {
    console.error('[SAVINGS] Delete goal error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== Savings Transactions ====================

// GET /goals/:goalId/transactions - list transactions for a goal
router.get('/goals/:goalId/transactions', (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { goalId } = req.params;

    // Verify goal ownership
    const goal = db.prepare(
      'SELECT id FROM savings_goals WHERE id = ? AND user_id = ?'
    ).get(goalId, userId) as any;
    if (!goal) {
      return res.status(404).json({ error: 'Savings goal not found' });
    }

    const rows = db.prepare(
      'SELECT * FROM savings_transactions WHERE savings_goal_id = ? AND user_id = ? ORDER BY date DESC'
    ).all(goalId, userId) as any[];

    return res.status(200).json(rowsToCamelCase(rows));
  } catch (err: any) {
    console.error('[SAVINGS] List transactions error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /goals/:goalId/transactions - add transaction
router.post('/goals/:goalId/transactions', (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { goalId } = req.params;
    const { amount, type } = req.body;

    if (amount === undefined || !type) {
      return res.status(400).json({ error: 'amount and type are required' });
    }

    if (!['deposit', 'withdrawal'].includes(type)) {
      return res.status(400).json({ error: 'type must be "deposit" or "withdrawal"' });
    }

    // Verify goal ownership
    const goal = db.prepare(
      'SELECT id FROM savings_goals WHERE id = ? AND user_id = ?'
    ).get(goalId, userId) as any;
    if (!goal) {
      return res.status(404).json({ error: 'Savings goal not found' });
    }

    const id = uuid();
    const data = toSnakeCase(req.body);

    db.prepare(`
      INSERT INTO savings_transactions (id, user_id, savings_goal_id, date, amount, type, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      userId,
      goalId,
      data.date || new Date().toISOString().split('T')[0],
      data.amount,
      data.type,
      data.description || ''
    );

    const created = db.prepare('SELECT * FROM savings_transactions WHERE id = ?').get(id) as any;
    return res.status(201).json(toCamelCase(created));
  } catch (err: any) {
    console.error('[SAVINGS] Create transaction error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /transactions/:id - delete transaction
router.delete('/transactions/:id', (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const existing = db.prepare(
      'SELECT id FROM savings_transactions WHERE id = ? AND user_id = ?'
    ).get(id, userId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Savings transaction not found' });
    }

    db.prepare('DELETE FROM savings_transactions WHERE id = ? AND user_id = ?').run(id, userId);

    return res.status(200).json({ message: 'Savings transaction deleted' });
  } catch (err: any) {
    console.error('[SAVINGS] Delete transaction error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
