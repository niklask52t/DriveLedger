import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { combinedAuthMiddleware } from '../middleware';

const router = Router();
router.use(combinedAuthMiddleware);

// GET /?q=keyword - search across multiple tables
router.get('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.user!.id;
    const q = req.query.q as string | undefined;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Search query (q) is required' });
    }

    const trimmed = q.trim();
    const results: any[] = [];

    // Check for column-specific search: "columnName=value"
    const eqIndex = trimmed.indexOf('=');
    const isColumnSearch = eqIndex > 0;
    const columnFilter = isColumnSearch ? trimmed.substring(0, eqIndex).trim().toLowerCase() : null;
    const searchValue = isColumnSearch ? trimmed.substring(eqIndex + 1).trim() : trimmed;
    const keyword = `%${searchValue}%`;

    // Map of allowed column names to actual SQL columns per table
    const columnMap: Record<string, Record<string, string>> = {
      name: { vehicles: 'name', costs: 'name', loans: 'name', savings_goals: 'name', supplies: 'name' },
      description: { repairs: 'description', service_records: 'description', upgrade_records: 'description', taxes: 'description', planner_tasks: 'description', supplies: 'description' },
      notes: { vehicles: 'notes', costs: 'notes', repairs: 'notes', service_records: 'notes', upgrade_records: 'notes', fuel_records: 'notes', loans: 'notes', savings_goals: 'notes', taxes: 'notes', vehicle_notes: 'content', planner_tasks: 'notes', supplies: 'notes' },
      brand: { vehicles: 'brand' },
      model: { vehicles: 'model' },
      station: { fuel_records: 'station' },
      title: { vehicle_notes: 'title', planner_tasks: 'title' },
      category: { costs: 'category', repairs: 'category', service_records: 'category' },
      workshop: { repairs: 'workshop' },
      part_number: { supplies: 'part_number' },
    };

    // Helper: build column-specific WHERE clause or full-text WHERE clause
    function buildWhere(table: string, fullTextCols: string[]): { clause: string; params: any[] } {
      if (isColumnSearch && columnFilter) {
        const col = columnMap[columnFilter]?.[table];
        if (col) {
          return { clause: `${col} LIKE ?`, params: [keyword] };
        }
        // Column not found for this table - skip it
        return { clause: '', params: [] };
      }
      // Full-text search across all specified columns
      const conditions = fullTextCols.map(c => `${c} LIKE ?`).join(' OR ');
      return { clause: conditions, params: fullTextCols.map(() => keyword) };
    }

    // Search vehicles
    const vWhere = buildWhere('vehicles', ['name', 'brand', 'model', 'notes']);
    if (vWhere.clause) {
      const [vehicles] = await pool.execute(
        `SELECT id, name AS title, notes, NULL AS vehicle_id, created_at AS date FROM vehicles WHERE user_id = ? AND (${vWhere.clause}) LIMIT 10`,
        [userId, ...vWhere.params]
      );
      for (const row of vehicles as any[]) {
        results.push({ type: 'vehicle', id: row.id, title: row.title, snippet: row.notes?.substring(0, 100) || '', vehicleId: row.id, date: row.date });
      }
    }

    // Search costs
    const cWhere = buildWhere('costs', ['name', 'notes']);
    if (cWhere.clause) {
      const [costs] = await pool.execute(
        `SELECT id, name AS title, notes, vehicle_id, created_at AS date FROM costs WHERE user_id = ? AND (${cWhere.clause}) LIMIT 10`,
        [userId, ...cWhere.params]
      );
      for (const row of costs as any[]) {
        results.push({ type: 'cost', id: row.id, title: row.title, snippet: row.notes?.substring(0, 100) || '', vehicleId: row.vehicle_id, date: row.date });
      }
    }

    // Search repairs
    const rWhere = buildWhere('repairs', ['description', 'notes']);
    if (rWhere.clause) {
      const [repairs] = await pool.execute(
        `SELECT id, description AS title, notes, vehicle_id, date FROM repairs WHERE user_id = ? AND (${rWhere.clause}) LIMIT 10`,
        [userId, ...rWhere.params]
      );
      for (const row of repairs as any[]) {
        results.push({ type: 'repair', id: row.id, title: row.title, snippet: row.notes?.substring(0, 100) || '', vehicleId: row.vehicle_id, date: row.date });
      }
    }

    // Search service_records
    const sWhere = buildWhere('service_records', ['description', 'notes']);
    if (sWhere.clause) {
      const [services] = await pool.execute(
        `SELECT id, description AS title, notes, vehicle_id, date FROM service_records WHERE user_id = ? AND (${sWhere.clause}) LIMIT 10`,
        [userId, ...sWhere.params]
      );
      for (const row of services as any[]) {
        results.push({ type: 'service', id: row.id, title: row.title, snippet: row.notes?.substring(0, 100) || '', vehicleId: row.vehicle_id, date: row.date });
      }
    }

    // Search upgrade_records
    const uWhere = buildWhere('upgrade_records', ['description', 'notes']);
    if (uWhere.clause) {
      const [upgrades] = await pool.execute(
        `SELECT id, description AS title, notes, vehicle_id, date FROM upgrade_records WHERE user_id = ? AND (${uWhere.clause}) LIMIT 10`,
        [userId, ...uWhere.params]
      );
      for (const row of upgrades as any[]) {
        results.push({ type: 'upgrade', id: row.id, title: row.title, snippet: row.notes?.substring(0, 100) || '', vehicleId: row.vehicle_id, date: row.date });
      }
    }

    // Search fuel_records
    const fWhere = buildWhere('fuel_records', ['station', 'notes', 'fuel_type']);
    if (fWhere.clause) {
      const [fuel] = await pool.execute(
        `SELECT id, station AS title, notes, vehicle_id, date FROM fuel_records WHERE user_id = ? AND (${fWhere.clause}) LIMIT 10`,
        [userId, ...fWhere.params]
      );
      for (const row of fuel as any[]) {
        results.push({ type: 'fuel', id: row.id, title: row.title || 'Fuel record', snippet: row.notes?.substring(0, 100) || '', vehicleId: row.vehicle_id, date: row.date });
      }
    }

    // Search loans
    const lWhere = buildWhere('loans', ['name', 'notes']);
    if (lWhere.clause) {
      const [loans] = await pool.execute(
        `SELECT id, name AS title, notes, vehicle_id, created_at AS date FROM loans WHERE user_id = ? AND (${lWhere.clause}) LIMIT 10`,
        [userId, ...lWhere.params]
      );
      for (const row of loans as any[]) {
        results.push({ type: 'loan', id: row.id, title: row.title, snippet: row.notes?.substring(0, 100) || '', vehicleId: row.vehicle_id, date: row.date });
      }
    }

    // Search savings_goals
    const sgWhere = buildWhere('savings_goals', ['name', 'notes']);
    if (sgWhere.clause) {
      const [savingsGoals] = await pool.execute(
        `SELECT id, name AS title, notes, vehicle_id, created_at AS date FROM savings_goals WHERE user_id = ? AND (${sgWhere.clause}) LIMIT 10`,
        [userId, ...sgWhere.params]
      );
      for (const row of savingsGoals as any[]) {
        results.push({ type: 'savings_goal', id: row.id, title: row.title, snippet: row.notes?.substring(0, 100) || '', vehicleId: row.vehicle_id, date: row.date });
      }
    }

    // Search taxes
    const tWhere = buildWhere('taxes', ['description', 'notes']);
    if (tWhere.clause) {
      const [taxes] = await pool.execute(
        `SELECT id, description AS title, notes, vehicle_id, date FROM taxes WHERE user_id = ? AND (${tWhere.clause}) LIMIT 10`,
        [userId, ...tWhere.params]
      );
      for (const row of taxes as any[]) {
        results.push({ type: 'tax', id: row.id, title: row.title || 'Tax record', snippet: row.notes?.substring(0, 100) || '', vehicleId: row.vehicle_id, date: row.date });
      }
    }

    // Search vehicle_notes
    const vnWhere = buildWhere('vehicle_notes', ['title', 'content']);
    if (vnWhere.clause) {
      const [vehicleNotes] = await pool.execute(
        `SELECT id, title, content AS notes, vehicle_id, created_at AS date FROM vehicle_notes WHERE user_id = ? AND (${vnWhere.clause}) LIMIT 10`,
        [userId, ...vnWhere.params]
      );
      for (const row of vehicleNotes as any[]) {
        results.push({ type: 'vehicle_note', id: row.id, title: row.title, snippet: row.notes?.substring(0, 100) || '', vehicleId: row.vehicle_id, date: row.date });
      }
    }

    // Search planner_tasks
    const ptWhere = buildWhere('planner_tasks', ['title', 'description', 'notes']);
    if (ptWhere.clause) {
      const [plannerTasks] = await pool.execute(
        `SELECT id, title, description AS notes, vehicle_id, created_at AS date FROM planner_tasks WHERE user_id = ? AND (${ptWhere.clause}) LIMIT 10`,
        [userId, ...ptWhere.params]
      );
      for (const row of plannerTasks as any[]) {
        results.push({ type: 'planner_task', id: row.id, title: row.title, snippet: row.notes?.substring(0, 100) || '', vehicleId: row.vehicle_id, date: row.date });
      }
    }

    // Search supplies
    const supWhere = buildWhere('supplies', ['name', 'description', 'notes', 'part_number']);
    if (supWhere.clause) {
      const [supplies] = await pool.execute(
        `SELECT id, name AS title, description AS notes, vehicle_id, created_at AS date FROM supplies WHERE user_id = ? AND (${supWhere.clause}) LIMIT 10`,
        [userId, ...supWhere.params]
      );
      for (const row of supplies as any[]) {
        results.push({ type: 'supply', id: row.id, title: row.title, snippet: row.notes?.substring(0, 100) || '', vehicleId: row.vehicle_id, date: row.date });
      }
    }

    // Limit total results to 50
    return res.status(200).json(results.slice(0, 50));
  } catch (err: any) {
    console.error('[SEARCH] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
