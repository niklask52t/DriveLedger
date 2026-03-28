import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { combinedAuthMiddleware, adminMiddleware } from '../middleware';
import { rowsToCamelCase } from '../utils';

const router = Router();
router.use(combinedAuthMiddleware);

// GET /export - export all user data
router.get('/export', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;

    const [vehicles] = await pool.execute('SELECT * FROM vehicles WHERE user_id = ?', [userId]);
    const [costs] = await pool.execute('SELECT * FROM costs WHERE user_id = ?', [userId]);
    const [loans] = await pool.execute('SELECT * FROM loans WHERE user_id = ?', [userId]);
    const [repairs] = await pool.execute('SELECT * FROM repairs WHERE user_id = ?', [userId]);
    const [savingsGoals] = await pool.execute('SELECT * FROM savings_goals WHERE user_id = ?', [userId]);
    const [savingsTransactions] = await pool.execute('SELECT * FROM savings_transactions WHERE user_id = ?', [userId]);
    const [plannedPurchases] = await pool.execute('SELECT * FROM planned_purchases WHERE user_id = ?', [userId]);
    const [persons] = await pool.execute('SELECT * FROM persons WHERE user_id = ?', [userId]);
    const [serviceRecords] = await pool.execute('SELECT * FROM service_records WHERE user_id = ?', [userId]);
    const [upgradeRecords] = await pool.execute('SELECT * FROM upgrade_records WHERE user_id = ?', [userId]);
    const [fuelRecords] = await pool.execute('SELECT * FROM fuel_records WHERE user_id = ?', [userId]);
    const [odometerRecords] = await pool.execute('SELECT * FROM odometer_records WHERE user_id = ?', [userId]);
    const [supplies] = await pool.execute('SELECT * FROM supplies WHERE user_id = ?', [userId]);
    const [equipment] = await pool.execute('SELECT * FROM equipment WHERE user_id = ?', [userId]);
    const [inspections] = await pool.execute('SELECT * FROM inspections WHERE user_id = ?', [userId]);
    const [vehicleNotes] = await pool.execute('SELECT * FROM vehicle_notes WHERE user_id = ?', [userId]);
    const [taxes] = await pool.execute('SELECT * FROM taxes WHERE user_id = ?', [userId]);
    const [plannerTasks] = await pool.execute('SELECT * FROM planner_tasks WHERE user_id = ?', [userId]);

    const data = {
      vehicles: rowsToCamelCase(vehicles as any[]),
      costs: rowsToCamelCase(costs as any[]),
      loans: rowsToCamelCase(loans as any[]),
      repairs: rowsToCamelCase(repairs as any[]),
      savingsGoals: rowsToCamelCase(savingsGoals as any[]),
      savingsTransactions: rowsToCamelCase(savingsTransactions as any[]),
      plannedPurchases: rowsToCamelCase(plannedPurchases as any[]),
      persons: rowsToCamelCase(persons as any[]),
      serviceRecords: rowsToCamelCase(serviceRecords as any[]),
      upgradeRecords: rowsToCamelCase(upgradeRecords as any[]),
      fuelRecords: rowsToCamelCase(fuelRecords as any[]),
      odometerRecords: rowsToCamelCase(odometerRecords as any[]),
      supplies: rowsToCamelCase(supplies as any[]),
      equipment: rowsToCamelCase(equipment as any[]),
      inspections: rowsToCamelCase(inspections as any[]),
      vehicleNotes: rowsToCamelCase(vehicleNotes as any[]),
      taxes: rowsToCamelCase(taxes as any[]),
      plannerTasks: rowsToCamelCase(plannerTasks as any[]),
    };

    return res.status(200).json(data);
  } catch (err: any) {
    console.error('[DATA] Export error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /import - import data (replaces existing)
router.post('/import', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const data = req.body;

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Invalid data format' });
    }

    const conn = await pool.getConnection();
    await conn.beginTransaction();
    try {
      // Clear existing data (new tables first to avoid FK issues)
      await conn.execute('DELETE FROM attachments WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM planner_tasks WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM taxes WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM vehicle_notes WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM inspections WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM equipment WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM supplies WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM odometer_records WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM fuel_records WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM upgrade_records WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM service_records WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM savings_transactions WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM savings_goals WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM repairs WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM costs WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM loans WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM vehicles WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM planned_purchases WHERE user_id = ?', [userId]);
      await conn.execute('DELETE FROM persons WHERE user_id = ?', [userId]);

      // Import vehicles
      if (Array.isArray(data.vehicles)) {
        for (const v of data.vehicles) {
          await conn.execute(`INSERT INTO vehicles (id, user_id, name, brand, model, variant, license_plate, hsn, tsn, first_registration, purchase_price, purchase_date, current_mileage, annual_mileage, fuel_type, avg_consumption, fuel_price, horse_power, image_url, status, mobile_de_link, notes, color, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            v.id, userId, v.name || '', v.brand || '', v.model || '', v.variant || '', v.licensePlate || '', v.hsn || '', v.tsn || '', v.firstRegistration || '', v.purchasePrice || 0, v.purchaseDate || '', v.currentMileage || 0, v.annualMileage || 0, v.fuelType || 'benzin', v.avgConsumption || 0, v.fuelPrice || 0, v.horsePower || 0, v.imageUrl || '', v.status || 'owned', v.mobileDeLink || '', v.notes || '', v.color || '#3b82f6', v.createdAt || new Date().toISOString()
          ]);
        }
      }

      // Import costs
      if (Array.isArray(data.costs)) {
        for (const c of data.costs) {
          await conn.execute(`INSERT INTO costs (id, user_id, vehicle_id, name, category, amount, frequency, paid_by, start_date, end_date, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            c.id, userId, c.vehicleId, c.name || '', c.category || 'sonstiges', c.amount || 0, c.frequency || 'monatlich', c.paidBy || '', c.startDate || '', c.endDate || '', c.notes || '', c.createdAt || new Date().toISOString()
          ]);
        }
      }

      // Import loans
      if (Array.isArray(data.loans)) {
        for (const l of data.loans) {
          await conn.execute(`INSERT INTO loans (id, user_id, vehicle_id, name, total_amount, monthly_payment, interest_rate, start_date, duration_months, additional_savings_per_month, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            l.id, userId, l.vehicleId, l.name || '', l.totalAmount || 0, l.monthlyPayment || 0, l.interestRate || 0, l.startDate || '', l.durationMonths || 0, l.additionalSavingsPerMonth || 0, l.notes || '', l.createdAt || new Date().toISOString()
          ]);
        }
      }

      // Import repairs
      if (Array.isArray(data.repairs)) {
        for (const r of data.repairs) {
          await conn.execute(`INSERT INTO repairs (id, user_id, vehicle_id, date, description, category, notes, cost, mileage, workshop, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            r.id, userId, r.vehicleId, r.date || '', r.description || '', r.category || '', r.notes || '', r.cost || 0, r.mileage || 0, r.workshop || '', r.createdAt || new Date().toISOString()
          ]);
        }
      }

      // Import savings goals
      if (Array.isArray(data.savingsGoals)) {
        for (const g of data.savingsGoals) {
          await conn.execute(`INSERT INTO savings_goals (id, user_id, vehicle_id, name, target_amount, monthly_contribution, start_date, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            g.id, userId, g.vehicleId, g.name || '', g.targetAmount || 0, g.monthlyContribution || 0, g.startDate || '', g.notes || '', g.createdAt || new Date().toISOString()
          ]);
        }
      }

      // Import savings transactions
      if (Array.isArray(data.savingsTransactions)) {
        for (const t of data.savingsTransactions) {
          await conn.execute(`INSERT INTO savings_transactions (id, user_id, savings_goal_id, date, amount, type, description) VALUES (?, ?, ?, ?, ?, ?, ?)`, [
            t.id, userId, t.savingsGoalId, t.date || '', t.amount || 0, t.type || 'deposit', t.description || ''
          ]);
        }
      }

      // Import planned purchases
      if (Array.isArray(data.plannedPurchases)) {
        for (const p of data.plannedPurchases) {
          await conn.execute(`INSERT INTO planned_purchases (id, user_id, brand, model, variant, price, mobile_de_link, image_url, year, mileage, fuel_type, horse_power, down_payment, financing_months, interest_rate, monthly_rate, estimated_insurance, estimated_tax, estimated_fuel_monthly, estimated_maintenance, notes, pros, cons, rating, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            p.id, userId, p.brand || '', p.model || '', p.variant || '', p.price || 0, p.mobileDeLink || '', p.imageUrl || '', p.year || 0, p.mileage || 0, p.fuelType || 'benzin', p.horsePower || 0, p.downPayment || 0, p.financingMonths || 0, p.interestRate || 0, p.monthlyRate || 0, p.estimatedInsurance || 0, p.estimatedTax || 0, p.estimatedFuelMonthly || 0, p.estimatedMaintenance || 0, p.notes || '', p.pros || '', p.cons || '', p.rating || 0, p.createdAt || new Date().toISOString()
          ]);
        }
      }

      // Import persons
      if (Array.isArray(data.persons)) {
        for (const p of data.persons) {
          await conn.execute(`INSERT INTO persons (id, user_id, name, color) VALUES (?, ?, ?, ?)`, [
            p.id, userId, p.name || '', p.color || '#3b82f6'
          ]);
        }
      }

      // Import service records
      if (Array.isArray(data.serviceRecords)) {
        for (const r of data.serviceRecords) {
          await conn.execute(`INSERT INTO service_records (id, user_id, vehicle_id, date, description, mileage, cost, notes, tags, category, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            r.id, userId, r.vehicleId, r.date || '', r.description || '', r.mileage || 0, r.cost || 0, r.notes || '', r.tags ? JSON.stringify(r.tags) : null, r.category || 'other', r.createdAt || new Date().toISOString()
          ]);
        }
      }

      // Import upgrade records
      if (Array.isArray(data.upgradeRecords)) {
        for (const r of data.upgradeRecords) {
          await conn.execute(`INSERT INTO upgrade_records (id, user_id, vehicle_id, date, description, cost, mileage, notes, tags, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            r.id, userId, r.vehicleId, r.date || '', r.description || '', r.cost || 0, r.mileage || 0, r.notes || '', r.tags ? JSON.stringify(r.tags) : null, r.createdAt || new Date().toISOString()
          ]);
        }
      }

      // Import fuel records
      if (Array.isArray(data.fuelRecords)) {
        for (const r of data.fuelRecords) {
          await conn.execute(`INSERT INTO fuel_records (id, user_id, vehicle_id, date, mileage, fuel_amount, fuel_cost, is_partial_fill, is_missed_entry, fuel_type, station, notes, tags, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            r.id, userId, r.vehicleId, r.date || '', r.mileage || 0, r.fuelAmount || 0, r.fuelCost || 0, r.isPartialFill ? 1 : 0, r.isMissedEntry ? 1 : 0, r.fuelType || '', r.station || '', r.notes || '', r.tags ? JSON.stringify(r.tags) : null, r.createdAt || new Date().toISOString()
          ]);
        }
      }

      // Import odometer records
      if (Array.isArray(data.odometerRecords)) {
        for (const r of data.odometerRecords) {
          await conn.execute(`INSERT INTO odometer_records (id, user_id, vehicle_id, date, mileage, notes, tags, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
            r.id, userId, r.vehicleId, r.date || '', r.mileage || 0, r.notes || '', r.tags ? JSON.stringify(r.tags) : null, r.createdAt || new Date().toISOString()
          ]);
        }
      }

      // Import supplies
      if (Array.isArray(data.supplies)) {
        for (const r of data.supplies) {
          await conn.execute(`INSERT INTO supplies (id, user_id, vehicle_id, name, part_number, description, quantity, unit_cost, notes, tags, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            r.id, userId, r.vehicleId || null, r.name || '', r.partNumber || '', r.description || '', r.quantity || 0, r.unitCost || 0, r.notes || '', r.tags ? JSON.stringify(r.tags) : null, r.createdAt || new Date().toISOString()
          ]);
        }
      }

      // Import equipment
      if (Array.isArray(data.equipment)) {
        for (const r of data.equipment) {
          await conn.execute(`INSERT INTO equipment (id, user_id, vehicle_id, name, description, is_equipped, total_distance, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            r.id, userId, r.vehicleId || null, r.name || '', r.description || '', r.isEquipped ? 1 : 0, r.totalDistance || 0, r.notes || '', r.createdAt || new Date().toISOString()
          ]);
        }
      }

      // Import inspections
      if (Array.isArray(data.inspections)) {
        for (const r of data.inspections) {
          await conn.execute(`INSERT INTO inspections (id, user_id, vehicle_id, date, title, items, overall_result, mileage, cost, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            r.id, userId, r.vehicleId, r.date || '', r.title || '', r.items ? JSON.stringify(r.items) : null, r.overallResult || '', r.mileage || 0, r.cost || 0, r.notes || '', r.createdAt || new Date().toISOString()
          ]);
        }
      }

      // Import vehicle notes
      if (Array.isArray(data.vehicleNotes)) {
        for (const r of data.vehicleNotes) {
          await conn.execute(`INSERT INTO vehicle_notes (id, user_id, vehicle_id, title, content, is_pinned, tags, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
            r.id, userId, r.vehicleId, r.title || '', r.content || '', r.isPinned ? 1 : 0, r.tags ? JSON.stringify(r.tags) : null, r.createdAt || new Date().toISOString()
          ]);
        }
      }

      // Import taxes
      if (Array.isArray(data.taxes)) {
        for (const r of data.taxes) {
          await conn.execute(`INSERT INTO taxes (id, user_id, vehicle_id, date, description, cost, is_recurring, recurring_interval, due_date, notes, tags, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            r.id, userId, r.vehicleId, r.date || '', r.description || '', r.cost || 0, r.isRecurring ? 1 : 0, r.recurringInterval || '', r.dueDate || '', r.notes || '', r.tags ? JSON.stringify(r.tags) : null, r.createdAt || new Date().toISOString()
          ]);
        }
      }

      // Import planner tasks
      if (Array.isArray(data.plannerTasks)) {
        for (const r of data.plannerTasks) {
          await conn.execute(`INSERT INTO planner_tasks (id, user_id, vehicle_id, title, description, priority, stage, category, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            r.id, userId, r.vehicleId || null, r.title || '', r.description || '', r.priority || 'normal', r.stage || 'planned', r.category || 'service', r.notes || '', r.createdAt || new Date().toISOString()
          ]);
        }
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    return res.status(200).json({ message: 'Data imported successfully' });
  } catch (err: any) {
    console.error('[DATA] Import error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /backup - Full database dump (admin only)
router.get('/backup', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const tables = [
      'users', 'vehicles', 'costs', 'loans', 'repairs', 'savings_goals', 'savings_transactions',
      'planned_purchases', 'persons', 'reminders', 'service_records', 'upgrade_records', 'fuel_records',
      'odometer_records', 'supplies', 'equipment', 'inspections', 'vehicle_notes', 'taxes', 'planner_tasks',
      'api_tokens', 'webhooks', 'vehicle_shares', 'user_config', 'extra_field_definitions', 'supply_requisitions',
      'inspection_templates', 'plan_templates', 'households', 'household_members', 'dashboard_widgets',
      'custom_translations', 'attachments',
    ];

    const backup: Record<string, any[]> = {};
    for (const table of tables) {
      try {
        const [rows] = await pool.execute(`SELECT * FROM \`${table}\``);
        backup[table] = rows as any[];
      } catch {
        backup[table] = [];
      }
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="driveledger-backup-${new Date().toISOString().split('T')[0]}.json"`);
    res.json({ version: '2.0.0', timestamp: new Date().toISOString(), data: backup });
  } catch (err: any) {
    console.error('[DATA] Backup error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /restore - Restore from backup (admin only)
router.post('/restore', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { data } = req.body;
    if (!data) return res.status(400).json({ error: 'No backup data provided' });

    const pool = getPool();
    const conn = await pool.getConnection();
    await conn.beginTransaction();

    try {
      // Disable FK checks temporarily
      await conn.execute('SET FOREIGN_KEY_CHECKS = 0');

      for (const [table, rows] of Object.entries(data)) {
        if (!Array.isArray(rows) || rows.length === 0) continue;
        // Clear existing data
        await conn.execute(`DELETE FROM \`${table}\``);
        // Insert rows
        for (const row of rows) {
          const cols = Object.keys(row);
          const placeholders = cols.map(() => '?').join(',');
          await conn.execute(
            `INSERT INTO \`${table}\` (${cols.map(c => '`' + c + '`').join(',')}) VALUES (${placeholders})`,
            cols.map(c => row[c])
          );
        }
      }

      await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
      await conn.commit();
      res.json({ restored: Object.keys(data).length });
    } catch (err) {
      await conn.rollback();
      await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
      throw err;
    } finally {
      conn.release();
    }
  } catch (err: any) {
    console.error('[DATA] Restore error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
