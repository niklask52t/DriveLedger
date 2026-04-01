import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getPool } from '../db';
import { combinedAuthMiddleware } from '../middleware';
import { toCamelCase, toSnakeCase, rowsToCamelCase } from '../utils';
import { fireWebhooks } from '../webhookTrigger.js';

const router = Router();
router.use(combinedAuthMiddleware);

function parseSupplyRow(row: any): any {
  const obj = toCamelCase(row);
  if (typeof obj.tags === 'string') obj.tags = JSON.parse(obj.tags);
  return obj;
}

// GET /shop - list shop-level supplies (vehicle_id IS NULL)
router.get('/shop', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.user!.id;

    const [rows] = await pool.execute(
      'SELECT * FROM supplies WHERE user_id = ? AND vehicle_id IS NULL ORDER BY created_at DESC',
      [userId]
    );

    return res.status(200).json((rows as any[]).map(parseSupplyRow));
  } catch (err: any) {
    console.error('[SUPPLIES] Shop list error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET / - list all supplies, optional ?vehicleId=xxx&filter=all|shop|vehicle
router.get('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.user!.id;
    const vehicleId = req.query.vehicleId as string | undefined;
    const filter = req.query.filter as string | undefined;

    let rows: any[];
    if (vehicleId) {
      // If vehicleId is 'shop', return shop supplies
      if (vehicleId === 'shop') {
        const [result] = await pool.execute(
          'SELECT * FROM supplies WHERE user_id = ? AND vehicle_id IS NULL ORDER BY created_at DESC',
          [userId]
        );
        rows = result as any[];
      } else {
        const [result] = await pool.execute(
          'SELECT * FROM supplies WHERE user_id = ? AND vehicle_id = ? ORDER BY created_at DESC',
          [userId, vehicleId]
        );
        rows = result as any[];
      }
    } else if (filter === 'shop') {
      const [result] = await pool.execute(
        'SELECT * FROM supplies WHERE user_id = ? AND vehicle_id IS NULL ORDER BY created_at DESC',
        [userId]
      );
      rows = result as any[];
    } else if (filter === 'vehicle') {
      const [result] = await pool.execute(
        'SELECT * FROM supplies WHERE user_id = ? AND vehicle_id IS NOT NULL ORDER BY created_at DESC',
        [userId]
      );
      rows = result as any[];
    } else {
      const [result] = await pool.execute(
        'SELECT * FROM supplies WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );
      rows = result as any[];
    }

    return res.status(200).json(rows.map(parseSupplyRow));
  } catch (err: any) {
    console.error('[SUPPLIES] List error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - single supply
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.user!.id;
    const [rows] = await pool.execute('SELECT * FROM supplies WHERE id = ? AND user_id = ?', [req.params.id, userId]);
    const row = (rows as any[])[0];

    if (!row) {
      return res.status(404).json({ error: 'Supply not found' });
    }

    return res.status(200).json(parseSupplyRow(row));
  } catch (err: any) {
    console.error('[SUPPLIES] Get error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - create supply (vehicle_id can be NULL for shop supplies)
router.post('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.user!.id;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    // If vehicleId provided (and not 'shop'), verify vehicle ownership
    const { vehicleId } = req.body;
    const isShopSupply = !vehicleId || vehicleId === 'shop';
    if (!isShopSupply) {
      const [vehicleRows] = await pool.execute('SELECT id FROM vehicles WHERE id = ? AND user_id = ?', [vehicleId, userId]);
      const vehicle = (vehicleRows as any[])[0];
      if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }
    }

    const id = uuid();
    const data = toSnakeCase(req.body);
    const tagsStr = data.tags ? JSON.stringify(data.tags) : null;
    const resolvedVehicleId = isShopSupply ? null : data.vehicle_id;

    await pool.execute(`
      INSERT INTO supplies (id, user_id, vehicle_id, name, part_number, description, quantity, unit_cost, notes, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      userId,
      resolvedVehicleId,
      data.name,
      data.part_number || '',
      data.description || '',
      data.quantity || 0,
      data.unit_cost || 0,
      data.notes || '',
      tagsStr
    ]);

    const [createdRows] = await pool.execute('SELECT * FROM supplies WHERE id = ?', [id]);
    const created = (createdRows as any[])[0];
    const result = parseSupplyRow(created);
    fireWebhooks(userId, 'record.created', { type: 'supply', ...result });
    return res.status(201).json(result);
  } catch (err: any) {
    console.error('[SUPPLIES] Create error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - update supply
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.user!.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute('SELECT id FROM supplies WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Supply not found' });
    }

    const data = toSnakeCase(req.body);
    const tagsStr = data.tags !== undefined ? JSON.stringify(data.tags) : null;

    await pool.execute(`
      UPDATE supplies SET
        vehicle_id = COALESCE(?, vehicle_id),
        name = COALESCE(?, name),
        part_number = COALESCE(?, part_number),
        description = COALESCE(?, description),
        quantity = COALESCE(?, quantity),
        unit_cost = COALESCE(?, unit_cost),
        notes = COALESCE(?, notes),
        tags = COALESCE(?, tags)
      WHERE id = ? AND user_id = ?
    `, [
      data.vehicle_id ?? null,
      data.name ?? null,
      data.part_number ?? null,
      data.description ?? null,
      data.quantity ?? null,
      data.unit_cost ?? null,
      data.notes ?? null,
      tagsStr,
      id,
      userId
    ]);

    const [updatedRows] = await pool.execute('SELECT * FROM supplies WHERE id = ?', [id]);
    const updated = (updatedRows as any[])[0];
    const result = parseSupplyRow(updated);
    fireWebhooks(userId, 'record.updated', { type: 'supply', ...result });
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[SUPPLIES] Update error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/requisition - consume supplies
router.post('/:id/requisition', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.user!.id;
    const { id } = req.params;
    const { quantity, recordType, recordId, description } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: 'quantity must be > 0' });
    }

    const [supplyRows] = await pool.execute('SELECT * FROM supplies WHERE id = ? AND user_id = ?', [id, userId]);
    const supply = (supplyRows as any[])[0];
    if (!supply) {
      return res.status(404).json({ error: 'Supply not found' });
    }

    const currentAvailable = supply.available_quantity !== null ? Number(supply.available_quantity) : Number(supply.quantity);
    if (quantity > currentAvailable) {
      return res.status(400).json({ error: 'Not enough stock available' });
    }

    const newAvailable = currentAvailable - quantity;
    const requisitionId = uuid();
    const cost = quantity * Number(supply.unit_cost);

    await pool.execute(
      'UPDATE supplies SET available_quantity = ? WHERE id = ?',
      [newAvailable, id]
    );

    await pool.execute(`
      INSERT INTO supply_requisitions (id, supply_id, record_type, record_id, user_id, quantity, cost, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [requisitionId, id, recordType || '', recordId || '', userId, quantity, cost, description || '']);

    // #7 Copy supply attachments to the record if CopySuppliesAttachment is enabled
    if (recordType && recordId && process.env.COPY_SUPPLIES_ATTACHMENT === 'true') {
      try {
        const [attachRows] = await pool.execute(
          'SELECT * FROM attachments WHERE record_type = ? AND record_id = ? AND user_id = ?',
          ['supply', id, userId]
        );
        for (const att of attachRows as any[]) {
          const newAttId = uuid();
          await pool.execute(
            'INSERT INTO attachments (id, user_id, record_type, record_id, file_name, file_path, mime_type, file_size) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [newAttId, userId, recordType, recordId, att.file_name, att.file_path, att.mime_type, att.file_size]
          );
        }
      } catch (copyErr) {
        console.error('[SUPPLIES] Error copying attachments:', copyErr);
        // Non-fatal, continue
      }
    }

    const [updatedRows] = await pool.execute('SELECT * FROM supplies WHERE id = ?', [id]);
    const updated = (updatedRows as any[])[0];
    return res.status(200).json(parseSupplyRow(updated));
  } catch (err: any) {
    console.error('[SUPPLIES] Requisition error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id/requisitions - get requisition history
router.get('/:id/requisitions', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.user!.id;
    const { id } = req.params;

    // Verify supply ownership
    const [supplyRows] = await pool.execute('SELECT id FROM supplies WHERE id = ? AND user_id = ?', [id, userId]);
    if ((supplyRows as any[]).length === 0) {
      return res.status(404).json({ error: 'Supply not found' });
    }

    const [rows] = await pool.execute(
      'SELECT * FROM supply_requisitions WHERE supply_id = ? AND user_id = ? ORDER BY date DESC',
      [id, userId]
    );

    return res.status(200).json(rowsToCamelCase(rows as any[]));
  } catch (err: any) {
    console.error('[SUPPLIES] Requisitions list error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/restore - restore (un-requisition)
router.post('/:id/restore', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.user!.id;
    const { id } = req.params;
    const { requisitionId } = req.body;

    if (!requisitionId) {
      return res.status(400).json({ error: 'requisitionId is required' });
    }

    // Verify supply ownership
    const [supplyRows] = await pool.execute('SELECT * FROM supplies WHERE id = ? AND user_id = ?', [id, userId]);
    const supply = (supplyRows as any[])[0];
    if (!supply) {
      return res.status(404).json({ error: 'Supply not found' });
    }

    // Get the requisition
    const [reqRows] = await pool.execute(
      'SELECT * FROM supply_requisitions WHERE id = ? AND supply_id = ? AND user_id = ?',
      [requisitionId, id, userId]
    );
    const requisition = (reqRows as any[])[0];
    if (!requisition) {
      return res.status(404).json({ error: 'Requisition not found' });
    }

    const currentAvailable = supply.available_quantity !== null ? Number(supply.available_quantity) : Number(supply.quantity);
    const newAvailable = currentAvailable + Number(requisition.quantity);

    await pool.execute('UPDATE supplies SET available_quantity = ? WHERE id = ?', [newAvailable, id]);
    await pool.execute('DELETE FROM supply_requisitions WHERE id = ?', [requisitionId]);

    const [updatedRows] = await pool.execute('SELECT * FROM supplies WHERE id = ?', [id]);
    const updated = (updatedRows as any[])[0];
    return res.status(200).json(parseSupplyRow(updated));
  } catch (err: any) {
    console.error('[SUPPLIES] Restore error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete supply
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = req.user!.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute('SELECT id FROM supplies WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Supply not found' });
    }

    await pool.execute('DELETE FROM supplies WHERE id = ? AND user_id = ?', [id, userId]);

    fireWebhooks(userId, 'record.deleted', { type: 'supply', id });
    return res.status(200).json({ message: 'Supply deleted' });
  } catch (err: any) {
    console.error('[SUPPLIES] Delete error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
