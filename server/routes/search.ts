import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { combinedAuthMiddleware } from '../middleware';

const router = Router();
router.use(combinedAuthMiddleware);

// GET /?q=keyword - search across multiple tables
router.get('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const q = req.query.q as string | undefined;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Search query (q) is required' });
    }

    const keyword = `%${q.trim()}%`;
    const results: any[] = [];

    // Search vehicles
    const [vehicles] = await pool.execute(
      'SELECT id, name AS title, notes, NULL AS vehicle_id, created_at AS date FROM vehicles WHERE user_id = ? AND (name LIKE ? OR brand LIKE ? OR model LIKE ? OR notes LIKE ?) LIMIT 10',
      [userId, keyword, keyword, keyword, keyword]
    );
    for (const row of vehicles as any[]) {
      results.push({ type: 'vehicle', id: row.id, title: row.title, snippet: row.notes?.substring(0, 100) || '', vehicleId: row.id, date: row.date });
    }

    // Search costs
    const [costs] = await pool.execute(
      'SELECT id, name AS title, notes, vehicle_id, created_at AS date FROM costs WHERE user_id = ? AND (name LIKE ? OR notes LIKE ?) LIMIT 10',
      [userId, keyword, keyword]
    );
    for (const row of costs as any[]) {
      results.push({ type: 'cost', id: row.id, title: row.title, snippet: row.notes?.substring(0, 100) || '', vehicleId: row.vehicle_id, date: row.date });
    }

    // Search repairs
    const [repairs] = await pool.execute(
      'SELECT id, description AS title, notes, vehicle_id, date FROM repairs WHERE user_id = ? AND (description LIKE ? OR notes LIKE ?) LIMIT 10',
      [userId, keyword, keyword]
    );
    for (const row of repairs as any[]) {
      results.push({ type: 'repair', id: row.id, title: row.title, snippet: row.notes?.substring(0, 100) || '', vehicleId: row.vehicle_id, date: row.date });
    }

    // Search service_records
    const [services] = await pool.execute(
      'SELECT id, description AS title, notes, vehicle_id, date FROM service_records WHERE user_id = ? AND (description LIKE ? OR notes LIKE ?) LIMIT 10',
      [userId, keyword, keyword]
    );
    for (const row of services as any[]) {
      results.push({ type: 'service', id: row.id, title: row.title, snippet: row.notes?.substring(0, 100) || '', vehicleId: row.vehicle_id, date: row.date });
    }

    // Search upgrade_records
    const [upgrades] = await pool.execute(
      'SELECT id, description AS title, notes, vehicle_id, date FROM upgrade_records WHERE user_id = ? AND (description LIKE ? OR notes LIKE ?) LIMIT 10',
      [userId, keyword, keyword]
    );
    for (const row of upgrades as any[]) {
      results.push({ type: 'upgrade', id: row.id, title: row.title, snippet: row.notes?.substring(0, 100) || '', vehicleId: row.vehicle_id, date: row.date });
    }

    // Search fuel_records
    const [fuel] = await pool.execute(
      'SELECT id, station AS title, notes, vehicle_id, date FROM fuel_records WHERE user_id = ? AND (station LIKE ? OR notes LIKE ? OR fuel_type LIKE ?) LIMIT 10',
      [userId, keyword, keyword, keyword]
    );
    for (const row of fuel as any[]) {
      results.push({ type: 'fuel', id: row.id, title: row.title || 'Fuel record', snippet: row.notes?.substring(0, 100) || '', vehicleId: row.vehicle_id, date: row.date });
    }

    // Search loans
    const [loans] = await pool.execute(
      'SELECT id, name AS title, notes, vehicle_id, created_at AS date FROM loans WHERE user_id = ? AND (name LIKE ? OR notes LIKE ?) LIMIT 10',
      [userId, keyword, keyword]
    );
    for (const row of loans as any[]) {
      results.push({ type: 'loan', id: row.id, title: row.title, snippet: row.notes?.substring(0, 100) || '', vehicleId: row.vehicle_id, date: row.date });
    }

    // Search savings_goals
    const [savingsGoals] = await pool.execute(
      'SELECT id, name AS title, notes, vehicle_id, created_at AS date FROM savings_goals WHERE user_id = ? AND (name LIKE ? OR notes LIKE ?) LIMIT 10',
      [userId, keyword, keyword]
    );
    for (const row of savingsGoals as any[]) {
      results.push({ type: 'savings_goal', id: row.id, title: row.title, snippet: row.notes?.substring(0, 100) || '', vehicleId: row.vehicle_id, date: row.date });
    }

    // Search taxes
    const [taxes] = await pool.execute(
      'SELECT id, description AS title, notes, vehicle_id, date FROM taxes WHERE user_id = ? AND (description LIKE ? OR notes LIKE ?) LIMIT 10',
      [userId, keyword, keyword]
    );
    for (const row of taxes as any[]) {
      results.push({ type: 'tax', id: row.id, title: row.title || 'Tax record', snippet: row.notes?.substring(0, 100) || '', vehicleId: row.vehicle_id, date: row.date });
    }

    // Search vehicle_notes
    const [vehicleNotes] = await pool.execute(
      'SELECT id, title, content AS notes, vehicle_id, created_at AS date FROM vehicle_notes WHERE user_id = ? AND (title LIKE ? OR content LIKE ?) LIMIT 10',
      [userId, keyword, keyword]
    );
    for (const row of vehicleNotes as any[]) {
      results.push({ type: 'vehicle_note', id: row.id, title: row.title, snippet: row.notes?.substring(0, 100) || '', vehicleId: row.vehicle_id, date: row.date });
    }

    // Search planner_tasks
    const [plannerTasks] = await pool.execute(
      'SELECT id, title, description AS notes, vehicle_id, created_at AS date FROM planner_tasks WHERE user_id = ? AND (title LIKE ? OR description LIKE ? OR notes LIKE ?) LIMIT 10',
      [userId, keyword, keyword, keyword]
    );
    for (const row of plannerTasks as any[]) {
      results.push({ type: 'planner_task', id: row.id, title: row.title, snippet: row.notes?.substring(0, 100) || '', vehicleId: row.vehicle_id, date: row.date });
    }

    // Search supplies
    const [supplies] = await pool.execute(
      'SELECT id, name AS title, description AS notes, vehicle_id, created_at AS date FROM supplies WHERE user_id = ? AND (name LIKE ? OR description LIKE ? OR notes LIKE ? OR part_number LIKE ?) LIMIT 10',
      [userId, keyword, keyword, keyword, keyword]
    );
    for (const row of supplies as any[]) {
      results.push({ type: 'supply', id: row.id, title: row.title, snippet: row.notes?.substring(0, 100) || '', vehicleId: row.vehicle_id, date: row.date });
    }

    // Limit total results to 50
    return res.status(200).json(results.slice(0, 50));
  } catch (err: any) {
    console.error('[SEARCH] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
