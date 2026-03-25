import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { combinedAuthMiddleware } from '../middleware';
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

    const data = {
      vehicles: rowsToCamelCase(vehicles as any[]),
      costs: rowsToCamelCase(costs as any[]),
      loans: rowsToCamelCase(loans as any[]),
      repairs: rowsToCamelCase(repairs as any[]),
      savingsGoals: rowsToCamelCase(savingsGoals as any[]),
      savingsTransactions: rowsToCamelCase(savingsTransactions as any[]),
      plannedPurchases: rowsToCamelCase(plannedPurchases as any[]),
      persons: rowsToCamelCase(persons as any[]),
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
      // Clear existing data
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

export default router;
