import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getPool } from '../db.js';
import { combinedAuthMiddleware, adminMiddleware } from '../middleware.js';

const router = Router();

// All translation routes require auth + admin
router.use(combinedAuthMiddleware);

// GET /:lang - Get all custom translations for a language (any authenticated user)
router.get('/:lang', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT translation_key, translation_value FROM custom_translations WHERE language = ?',
      [req.params.lang]
    );
    const result: Record<string, string> = {};
    for (const row of rows as any[]) {
      result[row.translation_key] = row.translation_value;
    }
    res.json(result);
  } catch (err: any) {
    console.error('[Translations] GET error:', err.message);
    res.status(500).json({ error: 'Failed to load translations' });
  }
});

// PUT /:lang - Save custom translations (bulk upsert) - admin only
router.put('/:lang', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const lang = req.params.lang;
    const translations: Record<string, string> = req.body;

    if (!translations || typeof translations !== 'object') {
      res.status(400).json({ error: 'Invalid translations object' });
      return;
    }

    const entries = Object.entries(translations);
    if (entries.length === 0) {
      res.json({ message: 'No translations to save' });
      return;
    }

    // Use a transaction for bulk upsert
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const [key, value] of entries) {
        await conn.execute(
          `INSERT INTO custom_translations (id, language, translation_key, translation_value, updated_at)
           VALUES (?, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE translation_value = VALUES(translation_value), updated_at = NOW()`,
          [uuid(), lang, key, value]
        );
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    res.json({ message: 'Translations saved', count: entries.length });
  } catch (err: any) {
    console.error('[Translations] PUT error:', err.message);
    res.status(500).json({ error: 'Failed to save translations' });
  }
});

// GET /:lang/export - Export all custom translations as JSON
router.get('/:lang/export', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT translation_key, translation_value FROM custom_translations WHERE language = ?',
      [req.params.lang]
    );
    const result: Record<string, string> = {};
    for (const row of rows as any[]) {
      result[row.translation_key] = row.translation_value;
    }
    res.setHeader('Content-Disposition', `attachment; filename=translations-${req.params.lang}.json`);
    res.setHeader('Content-Type', 'application/json');
    res.json(result);
  } catch (err: any) {
    console.error('[Translations] Export error:', err.message);
    res.status(500).json({ error: 'Failed to export translations' });
  }
});

// POST /:lang/import - Import translations from JSON
router.post('/:lang/import', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const lang = req.params.lang;
    const translations: Record<string, string> = req.body;

    if (!translations || typeof translations !== 'object') {
      res.status(400).json({ error: 'Invalid translations object' });
      return;
    }

    const entries = Object.entries(translations);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      // Clear existing custom translations for this language
      await conn.execute('DELETE FROM custom_translations WHERE language = ?', [lang]);
      // Insert all
      for (const [key, value] of entries) {
        await conn.execute(
          `INSERT INTO custom_translations (id, language, translation_key, translation_value, updated_at)
           VALUES (?, ?, ?, ?, NOW())`,
          [uuid(), lang, key, value]
        );
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    res.json({ message: 'Translations imported', count: entries.length });
  } catch (err: any) {
    console.error('[Translations] Import error:', err.message);
    res.status(500).json({ error: 'Failed to import translations' });
  }
});

export default router;
