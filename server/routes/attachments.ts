import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getPool } from '../db';
import { combinedAuthMiddleware } from '../middleware';
import { toCamelCase, rowsToCamelCase } from '../utils';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = Router();
router.use(combinedAuthMiddleware);

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

    // Delete file from disk
    if (fs.existsSync(existing.file_path)) {
      fs.unlinkSync(existing.file_path);
    }

    await pool.execute('DELETE FROM attachments WHERE id = ? AND user_id = ?', [id, userId]);

    return res.status(200).json({ message: 'Attachment deleted' });
  } catch (err: any) {
    console.error('[ATTACHMENTS] Delete error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
