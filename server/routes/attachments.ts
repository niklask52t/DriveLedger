import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getPool } from '../db';
import { combinedAuthMiddleware } from '../middleware';
import { toCamelCase, rowsToCamelCase } from '../utils';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createGzip } from 'zlib';
import { Readable } from 'stream';

const router = Router();
router.use(combinedAuthMiddleware);

// Read allowed file extensions from env
const ALLOWED_EXTENSIONS = (process.env.ALLOWED_FILE_EXTENSIONS || '')
  .split(',')
  .map(ext => ext.trim().toLowerCase())
  .filter(Boolean);

// Ensure uploads directory exists
const uploadsDir = path.resolve('data', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// GET / - list attachments by recordType and recordId
router.get('/', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const recordType = req.query.recordType as string | undefined;
    const recordId = req.query.recordId as string | undefined;

    let query = 'SELECT * FROM attachments WHERE user_id = ?';
    const params: any[] = [userId];

    if (recordType) {
      query += ' AND record_type = ?';
      params.push(recordType);
    }

    if (recordId) {
      query += ' AND record_id = ?';
      params.push(recordId);
    }

    query += ' ORDER BY uploaded_at DESC';

    const [rows] = await pool.execute(query, params);
    return res.status(200).json(rowsToCamelCase(rows as any[]));
  } catch (err: any) {
    console.error('[ATTACHMENTS] List error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - get single attachment metadata
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const [rows] = await pool.execute('SELECT * FROM attachments WHERE id = ? AND user_id = ?', [req.params.id, userId]);
    const row = (rows as any[])[0];

    if (!row) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    return res.status(200).json(toCamelCase(row));
  } catch (err: any) {
    console.error('[ATTACHMENTS] Get error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id/download - download attachment file
router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const [rows] = await pool.execute('SELECT * FROM attachments WHERE id = ? AND user_id = ?', [req.params.id, userId]);
    const row = (rows as any[])[0];

    if (!row) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const filePath = row.file_path;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    return res.download(filePath, row.file_name);
  } catch (err: any) {
    console.error('[ATTACHMENTS] Download error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - upload attachment
router.post('/', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate file extension if ALLOWED_FILE_EXTENSIONS is configured
    if (ALLOWED_EXTENSIONS.length > 0) {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        fs.unlinkSync(file.path);
        return res.status(400).json({
          error: `File extension "${ext}" is not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
        });
      }
    }

    const { recordType, recordId } = req.body;
    if (!recordType || !recordId) {
      // Clean up uploaded file
      fs.unlinkSync(file.path);
      return res.status(400).json({ error: 'recordType and recordId are required' });
    }

    const id = uuid();

    await pool.execute(`
      INSERT INTO attachments (id, user_id, record_type, record_id, file_name, file_path, mime_type, file_size)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      userId,
      recordType,
      recordId,
      file.originalname,
      file.path,
      file.mimetype || '',
      file.size || 0
    ]);

    const [createdRows] = await pool.execute('SELECT * FROM attachments WHERE id = ?', [id]);
    const created = (createdRows as any[])[0];
    return res.status(201).json(toCamelCase(created));
  } catch (err: any) {
    console.error('[ATTACHMENTS] Upload error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:recordType/:recordId - get all attachments for a record (files + links + refs)
router.get('/:recordType/:recordId', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { recordType, recordId } = req.params;

    const [rows] = await pool.execute(
      'SELECT * FROM attachments WHERE user_id = ? AND record_type = ? AND record_id = ? ORDER BY uploaded_at DESC',
      [userId, recordType, recordId]
    );
    return res.status(200).json(rowsToCamelCase(rows as any[]));
  } catch (err: any) {
    console.error('[ATTACHMENTS] Get by record error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /link - Create a link attachment (URL)
router.post('/link', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { recordType, recordId, url, name } = req.body;

    if (!recordType || !recordId || !url) {
      return res.status(400).json({ error: 'recordType, recordId, and url are required' });
    }

    const id = uuid();
    const fileName = name || url;

    await pool.execute(`
      INSERT INTO attachments (id, user_id, record_type, record_id, file_name, file_path, mime_type, file_size)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      userId,
      recordType,
      recordId,
      fileName,
      url, // URL stored in file_path; starts with "http"
      'text/x-uri',
      0,
    ]);

    const [createdRows] = await pool.execute('SELECT * FROM attachments WHERE id = ?', [id]);
    const created = (createdRows as any[])[0];
    return res.status(201).json(toCamelCase(created));
  } catch (err: any) {
    console.error('[ATTACHMENTS] Link error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /reference - Create a cross-record reference
router.post('/reference', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { recordType, recordId, refRecordType, refRecordId } = req.body;

    if (!recordType || !recordId || !refRecordType || !refRecordId) {
      return res.status(400).json({ error: 'recordType, recordId, refRecordType, and refRecordId are required' });
    }

    const id = uuid();
    const location = `::${refRecordType}:${refRecordId}`;
    const fileName = `Reference: ${refRecordType} record`;

    await pool.execute(`
      INSERT INTO attachments (id, user_id, record_type, record_id, file_name, file_path, mime_type, file_size)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      userId,
      recordType,
      recordId,
      fileName,
      location, // Cross-reference stored as "::recordType:recordId"
      'text/x-reference',
      0,
    ]);

    const [createdRows] = await pool.execute('SELECT * FROM attachments WHERE id = ?', [id]);
    const created = (createdRows as any[])[0];
    return res.status(201).json(toCamelCase(created));
  } catch (err: any) {
    console.error('[ATTACHMENTS] Reference error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id/rename - rename attachment
router.put('/:id/rename', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    const [existingRows] = await pool.execute('SELECT * FROM attachments WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    await pool.execute('UPDATE attachments SET file_name = ? WHERE id = ? AND user_id = ?', [name.trim(), id, userId]);

    const [updatedRows] = await pool.execute('SELECT * FROM attachments WHERE id = ?', [id]);
    const updated = (updatedRows as any[])[0];
    return res.status(200).json(toCamelCase(updated));
  } catch (err: any) {
    console.error('[ATTACHMENTS] Rename error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - delete attachment
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { id } = req.params;

    const [existingRows] = await pool.execute('SELECT * FROM attachments WHERE id = ? AND user_id = ?', [id, userId]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    // Delete file from disk (only for real file uploads, not links/references)
    const isLink = existing.file_path.startsWith('http');
    const isRef = existing.file_path.startsWith('::');
    if (!isLink && !isRef && fs.existsSync(existing.file_path)) {
      fs.unlinkSync(existing.file_path);
    }

    await pool.execute('DELETE FROM attachments WHERE id = ? AND user_id = ?', [id, userId]);

    return res.status(200).json({ message: 'Attachment deleted' });
  } catch (err: any) {
    console.error('[ATTACHMENTS] Delete error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /export/:vehicleId - Export all attachments for a vehicle as JSON bundle with base64-encoded files
router.get('/export/:vehicleId', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const userId = (req as any).user.id;
    const { vehicleId } = req.params;

    // Verify vehicle ownership
    const [vehicleRows] = await pool.execute('SELECT id, name FROM vehicles WHERE id = ? AND user_id = ?', [vehicleId, userId]);
    const vehicle = (vehicleRows as any[])[0];
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Get all attachments related to this vehicle (across all record types)
    // First get direct vehicle attachments, then attachments for records belonging to this vehicle
    const recordTypes = [
      { table: 'service_records', type: 'service' },
      { table: 'fuel_records', type: 'fuel' },
      { table: 'repair', type: 'repair' },
      { table: 'costs', type: 'cost' },
      { table: 'inspections', type: 'inspection' },
      { table: 'odometer_records', type: 'odometer' },
      { table: 'upgrade_records', type: 'upgrade' },
      { table: 'taxes', type: 'tax' },
    ];

    // Collect all record IDs for this vehicle
    const vId = vehicleId as string;
    const allRecordIds: string[] = [vId];
    for (const rt of recordTypes) {
      try {
        const [rows] = await pool.execute(
          `SELECT id FROM ${rt.table} WHERE vehicle_id = ? AND user_id = ?`,
          [vehicleId, userId]
        );
        for (const row of rows as any[]) {
          allRecordIds.push(row.id);
        }
      } catch {
        // Table might not have vehicle_id, skip
      }
    }

    // Get all attachments for these record IDs
    if (allRecordIds.length === 0) {
      return res.status(200).json({ files: [], vehicleName: vehicle.name });
    }

    const placeholders = allRecordIds.map(() => '?').join(',');
    const [attachmentRows] = await pool.execute(
      `SELECT * FROM attachments WHERE user_id = ? AND record_id IN (${placeholders}) ORDER BY uploaded_at DESC`,
      [userId, ...allRecordIds]
    );

    const attachments = attachmentRows as any[];
    const files: any[] = [];

    for (const att of attachments) {
      const isLink = att.file_path.startsWith('http');
      const isRef = att.file_path.startsWith('::');

      if (isLink || isRef) {
        // Include metadata only for links and references
        files.push({
          fileName: att.file_name,
          recordType: att.record_type,
          recordId: att.record_id,
          mimeType: att.mime_type,
          type: isLink ? 'link' : 'reference',
          url: att.file_path,
        });
      } else if (fs.existsSync(att.file_path)) {
        // Include file content as base64
        const content = fs.readFileSync(att.file_path);
        files.push({
          fileName: att.file_name,
          recordType: att.record_type,
          recordId: att.record_id,
          mimeType: att.mime_type,
          fileSize: att.file_size,
          type: 'file',
          contentBase64: content.toString('base64'),
        });
      }
    }

    const exportName = `attachments-${vehicle.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${exportName}"`);
    return res.status(200).json({
      vehicleId,
      vehicleName: vehicle.name,
      exportedAt: new Date().toISOString(),
      fileCount: files.length,
      files,
    });
  } catch (err: any) {
    console.error('[ATTACHMENTS] Export error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
