import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getPool } from '../db';
import { combinedAuthMiddleware } from '../middleware';
import { toCamelCase, toSnakeCase } from '../utils';

const router = Router();
router.use(combinedAuthMiddleware);

// ─── Record type configuration ──────────────────────────────────────────────

interface RecordTypeConfig {
  table: string;
  /** Columns to export/import (snake_case DB columns). Excludes id, user_id, created_at. */
  columns: string[];
  /** Columns that hold JSON (tags, items, etc.) */
  jsonColumns?: string[];
  /** Boolean columns stored as 0/1 in DB */
  booleanColumns?: string[];
  /** Sample row values (snake_case keys) */
  sample: Record<string, any>;
  /** Date column used for date-range filtering (snake_case) */
  dateColumn?: string;
  /** Order-by clause */
  orderBy?: string;
}

const RECORD_TYPES: Record<string, RecordTypeConfig> = {
  costs: {
    table: 'costs',
    columns: ['vehicle_id', 'name', 'category', 'amount', 'frequency', 'paid_by', 'start_date', 'end_date', 'notes', 'tags'],
    jsonColumns: ['tags'],
    sample: { vehicle_id: '', name: 'Insurance', category: 'versicherung', amount: 120, frequency: 'monatlich', paid_by: '', start_date: '2025-01-01', end_date: '', notes: '', tags: '[]' },
    dateColumn: 'start_date',
    orderBy: 'created_at DESC',
  },
  loans: {
    table: 'loans',
    columns: ['vehicle_id', 'name', 'total_amount', 'monthly_payment', 'interest_rate', 'start_date', 'duration_months', 'additional_savings_per_month', 'notes', 'tags'],
    jsonColumns: ['tags'],
    sample: { vehicle_id: '', name: 'Car Loan', total_amount: 15000, monthly_payment: 350, interest_rate: 3.5, start_date: '2025-01-01', duration_months: 48, additional_savings_per_month: 0, notes: '', tags: '[]' },
    dateColumn: 'start_date',
    orderBy: 'created_at DESC',
  },
  repairs: {
    table: 'repairs',
    columns: ['vehicle_id', 'date', 'description', 'category', 'notes', 'cost', 'mileage', 'workshop', 'tags'],
    jsonColumns: ['tags'],
    sample: { vehicle_id: '', date: '2025-03-15', description: 'Brake pad replacement', category: 'brakes', notes: '', cost: 250, mileage: 45000, workshop: 'AutoShop', tags: '[]' },
    dateColumn: 'date',
    orderBy: 'created_at DESC',
  },
  services: {
    table: 'service_records',
    columns: ['vehicle_id', 'date', 'description', 'mileage', 'cost', 'notes', 'tags', 'category'],
    jsonColumns: ['tags'],
    sample: { vehicle_id: '', date: '2025-03-15', description: 'Oil change', mileage: 45000, cost: 80, notes: '', tags: '[]', category: 'oil' },
    dateColumn: 'date',
    orderBy: 'created_at DESC',
  },
  upgrades: {
    table: 'upgrade_records',
    columns: ['vehicle_id', 'date', 'description', 'cost', 'mileage', 'notes', 'tags'],
    jsonColumns: ['tags'],
    sample: { vehicle_id: '', date: '2025-03-15', description: 'LED headlights', cost: 300, mileage: 45000, notes: '', tags: '[]' },
    dateColumn: 'date',
    orderBy: 'created_at DESC',
  },
  'fuel-records': {
    table: 'fuel_records',
    columns: ['vehicle_id', 'date', 'mileage', 'fuel_amount', 'fuel_cost', 'is_partial_fill', 'is_missed_entry', 'fuel_type', 'station', 'notes', 'tags'],
    jsonColumns: ['tags'],
    booleanColumns: ['is_partial_fill', 'is_missed_entry'],
    sample: { vehicle_id: '', date: '2025-03-15', mileage: 45000, fuel_amount: 45.5, fuel_cost: 78.90, is_partial_fill: false, is_missed_entry: false, fuel_type: 'benzin', station: 'Shell', notes: '', tags: '[]' },
    dateColumn: 'date',
    orderBy: 'date DESC, mileage DESC',
  },
  'odometer-records': {
    table: 'odometer_records',
    columns: ['vehicle_id', 'date', 'mileage', 'notes', 'tags'],
    jsonColumns: ['tags'],
    sample: { vehicle_id: '', date: '2025-03-15', mileage: 45000, notes: '', tags: '[]' },
    dateColumn: 'date',
    orderBy: 'created_at DESC',
  },
  taxes: {
    table: 'taxes',
    columns: ['vehicle_id', 'date', 'description', 'cost', 'is_recurring', 'recurring_interval', 'due_date', 'notes', 'tags'],
    jsonColumns: ['tags'],
    booleanColumns: ['is_recurring'],
    sample: { vehicle_id: '', date: '2025-01-01', description: 'Vehicle tax', cost: 200, is_recurring: true, recurring_interval: 'jaehrlich', due_date: '2026-01-01', notes: '', tags: '[]' },
    dateColumn: 'date',
    orderBy: 'date DESC',
  },
  supplies: {
    table: 'supplies',
    columns: ['vehicle_id', 'name', 'part_number', 'description', 'quantity', 'unit_cost', 'notes', 'tags'],
    jsonColumns: ['tags'],
    sample: { vehicle_id: '', name: 'Oil filter', part_number: 'OF-1234', description: 'OEM oil filter', quantity: 2, unit_cost: 12.50, notes: '', tags: '[]' },
    orderBy: 'created_at DESC',
  },
  equipment: {
    table: 'equipment',
    columns: ['vehicle_id', 'name', 'description', 'is_equipped', 'total_distance', 'notes'],
    booleanColumns: ['is_equipped'],
    sample: { vehicle_id: '', name: 'Winter tires', description: 'Continental WinterContact', is_equipped: true, total_distance: 10000, notes: '' },
    orderBy: 'created_at DESC',
  },
  inspections: {
    table: 'inspections',
    columns: ['vehicle_id', 'date', 'title', 'items', 'overall_result', 'mileage', 'cost', 'notes'],
    jsonColumns: ['items'],
    sample: { vehicle_id: '', date: '2025-03-15', title: 'Annual inspection', items: '[]', overall_result: 'pass', mileage: 45000, cost: 100, notes: '' },
    dateColumn: 'date',
    orderBy: 'date DESC',
  },
};

// ─── CSV helpers ────────────────────────────────────────────────────────────

/** Parse a single CSV line respecting quoted fields */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

/** Parse a full CSV string into header + rows */
function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim() !== '');
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0]).map(h => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = (values[j] ?? '').trim();
    }
    rows.push(row);
  }

  return { headers, rows };
}

/** Escape a value for CSV output */
function escapeCsvValue(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/** Convert snake_case column to a friendly camelCase CSV header */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/** Convert a camelCase or any-case string to snake_case */
function anyToSnake(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
    .replace(/[\s-]+/g, '_');
}

// ─── GET /export/:recordType ────────────────────────────────────────────────

router.get('/export/:recordType', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { recordType } = req.params;

    const config = RECORD_TYPES[recordType];
    if (!config) {
      return res.status(400).json({ error: `Unsupported record type: ${recordType}. Supported: ${Object.keys(RECORD_TYPES).join(', ')}` });
    }

    const vehicleId = req.query.vehicleId as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const tags = req.query.tags as string | undefined;
    const tagFilter = (req.query.tagFilter as string) || 'include';

    // Build query
    let sql = `SELECT * FROM ${config.table} WHERE user_id = ?`;
    const params: any[] = [userId];

    if (vehicleId) {
      sql += ' AND vehicle_id = ?';
      params.push(vehicleId);
    }

    if (startDate && config.dateColumn) {
      sql += ` AND ${config.dateColumn} >= ?`;
      params.push(startDate);
    }

    if (endDate && config.dateColumn) {
      sql += ` AND ${config.dateColumn} <= ?`;
      params.push(endDate);
    }

    if (config.orderBy) {
      sql += ` ORDER BY ${config.orderBy}`;
    }

    const [rows] = await pool.execute(sql, params);
    let records = rows as any[];

    // Tag filtering (in-app since tags are JSON strings)
    if (tags && config.jsonColumns?.includes('tags')) {
      const tagList = tags.split(',').map(t => t.trim().toLowerCase());
      records = records.filter(row => {
        let rowTags: string[] = [];
        try {
          rowTags = typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || []);
        } catch { /* ignore */ }
        rowTags = rowTags.map((t: string) => t.toLowerCase());
        if (tagFilter === 'exclude') {
          return !tagList.some(t => rowTags.includes(t));
        }
        return tagList.some(t => rowTags.includes(t));
      });
    }

    // Build CSV
    const csvHeaders = config.columns.map(snakeToCamel);
    const csvLines: string[] = [csvHeaders.map(escapeCsvValue).join(',')];

    for (const row of records) {
      const values = config.columns.map(col => {
        let val = row[col];
        if (config.jsonColumns?.includes(col)) {
          // Keep JSON as string
          if (typeof val === 'string') {
            return val;
          }
          return JSON.stringify(val ?? []);
        }
        if (config.booleanColumns?.includes(col)) {
          return val ? 'true' : 'false';
        }
        return val ?? '';
      });
      csvLines.push(values.map(escapeCsvValue).join(','));
    }

    const csvContent = csvLines.join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${recordType}-export.csv"`);
    return res.status(200).send(csvContent);
  } catch (err: any) {
    console.error('[CSV] Export error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /import/:recordType ───────────────────────────────────────────────

router.post('/import/:recordType', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { recordType } = req.params;

    const config = RECORD_TYPES[recordType];
    if (!config) {
      return res.status(400).json({ error: `Unsupported record type: ${recordType}. Supported: ${Object.keys(RECORD_TYPES).join(', ')}` });
    }

    // Accept CSV as text/csv body or JSON { csv: "...", mapping: {...} }
    let csvText: string;
    let mapping: Record<string, string> | undefined;

    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('text/csv')) {
      csvText = typeof req.body === 'string' ? req.body : String(req.body);
    } else {
      // JSON body
      csvText = req.body.csv;
      mapping = req.body.mapping;
    }

    if (!csvText || typeof csvText !== 'string') {
      return res.status(400).json({ error: 'CSV data is required. Send as text/csv body or JSON { csv: "..." }' });
    }

    const { headers, rows } = parseCsv(csvText);
    if (rows.length === 0) {
      return res.status(400).json({ error: 'CSV contains no data rows' });
    }

    // Build header -> snake_case column mapping
    // Priority: explicit mapping > camelCase header > case-insensitive match
    const headerToColumn: Record<string, string> = {};
    const columnsLower = config.columns.map(c => c.toLowerCase());
    const camelColumns = config.columns.map(snakeToCamel);
    const camelColumnsLower = camelColumns.map(c => c.toLowerCase());

    for (const header of headers) {
      const trimmed = header.trim();

      // 1. Check explicit mapping
      if (mapping && mapping[trimmed]) {
        const mapped = anyToSnake(mapping[trimmed]);
        if (config.columns.includes(mapped)) {
          headerToColumn[trimmed] = mapped;
          continue;
        }
      }

      // 2. Direct snake_case match
      const asSnake = anyToSnake(trimmed);
      if (config.columns.includes(asSnake)) {
        headerToColumn[trimmed] = asSnake;
        continue;
      }

      // 3. Case-insensitive snake_case match
      const lowerIdx = columnsLower.indexOf(asSnake.toLowerCase());
      if (lowerIdx !== -1) {
        headerToColumn[trimmed] = config.columns[lowerIdx];
        continue;
      }

      // 4. Case-insensitive camelCase match
      const camelIdx = camelColumnsLower.indexOf(trimmed.toLowerCase());
      if (camelIdx !== -1) {
        headerToColumn[trimmed] = config.columns[camelIdx];
        continue;
      }
    }

    let importedCount = 0;

    for (const row of rows) {
      const record: Record<string, any> = {};

      // Map CSV row values to snake_case columns
      for (const header of headers) {
        const col = headerToColumn[header];
        if (!col) continue;
        record[col] = row[header];
      }

      // Set defaults for missing columns
      for (const col of config.columns) {
        if (record[col] === undefined || record[col] === '') {
          if (config.jsonColumns?.includes(col)) {
            record[col] = null;
          } else if (config.booleanColumns?.includes(col)) {
            record[col] = 0;
          } else {
            record[col] = '';
          }
        }
      }

      // Process special columns
      for (const col of config.columns) {
        const val = record[col];
        if (config.jsonColumns?.includes(col)) {
          if (typeof val === 'string' && val.trim()) {
            try {
              JSON.parse(val); // validate
              record[col] = val;
            } catch {
              record[col] = null;
            }
          } else {
            record[col] = null;
          }
        }
        if (config.booleanColumns?.includes(col)) {
          const strVal = String(val).toLowerCase().trim();
          record[col] = (strVal === 'true' || strVal === '1' || strVal === 'yes') ? 1 : 0;
        }
      }

      // Convert numeric-looking fields
      const numericHints = ['amount', 'cost', 'mileage', 'total_amount', 'monthly_payment', 'interest_rate',
        'duration_months', 'additional_savings_per_month', 'fuel_amount', 'fuel_cost', 'quantity',
        'unit_cost', 'total_distance'];
      for (const col of numericHints) {
        if (record[col] !== undefined && record[col] !== '' && !isNaN(Number(record[col]))) {
          record[col] = Number(record[col]);
        } else if (record[col] === '') {
          record[col] = 0;
        }
      }

      const id = uuid();
      const allCols = ['id', 'user_id', ...config.columns];
      const placeholders = allCols.map(() => '?').join(', ');
      const values = [id, userId, ...config.columns.map(c => record[c] ?? '')];

      await pool.execute(
        `INSERT INTO ${config.table} (${allCols.join(', ')}) VALUES (${placeholders})`,
        values
      );
      importedCount++;
    }

    return res.status(200).json({ count: importedCount });
  } catch (err: any) {
    console.error('[CSV] Import error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /sample/:recordType ────────────────────────────────────────────────

router.get('/sample/:recordType', async (req: Request, res: Response) => {
  try {
    const { recordType } = req.params;

    const config = RECORD_TYPES[recordType];
    if (!config) {
      return res.status(400).json({ error: `Unsupported record type: ${recordType}. Supported: ${Object.keys(RECORD_TYPES).join(', ')}` });
    }

    const csvHeaders = config.columns.map(snakeToCamel);
    const sampleValues = config.columns.map(col => {
      const val = config.sample[col];
      if (val === undefined || val === null) return '';
      if (typeof val === 'boolean') return val ? 'true' : 'false';
      return String(val);
    });

    const csvContent = [
      csvHeaders.map(escapeCsvValue).join(','),
      sampleValues.map(escapeCsvValue).join(','),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${recordType}-sample.csv"`);
    return res.status(200).send(csvContent);
  } catch (err: any) {
    console.error('[CSV] Sample error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /record-types ──────────────────────────────────────────────────────

router.get('/record-types', async (_req: Request, res: Response) => {
  const types = Object.entries(RECORD_TYPES).map(([key, config]) => ({
    key,
    columns: config.columns.map(snakeToCamel),
  }));
  return res.status(200).json(types);
});

export default router;
