import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { v4 as uuidv4 } from 'uuid';

import db, { initDb } from './db.js';
import { hashPassword } from './auth.js';
import { generalRateLimiter, authRateLimiter } from './middleware.js';

// Import routes
import authRoutes from './routes/auth.js';
import vehicleRoutes from './routes/vehicles.js';
import costRoutes from './routes/costs.js';
import loanRoutes from './routes/loans.js';
import repairRoutes from './routes/repairs.js';
import savingsRoutes from './routes/savings.js';
import purchaseRoutes from './routes/purchases.js';
import apiTokenRoutes from './routes/api-tokens.js';
import adminRoutes from './routes/admin.js';
import personRoutes from './routes/persons.js';
import dataRoutes from './routes/data.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Security
app.use(helmet());
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
app.use('/api/', generalRateLimiter);
app.use('/api/auth/', authRateLimiter);

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/costs', costRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/repairs', repairRoutes);
app.use('/api/savings', savingsRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/api-tokens', apiTokenRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/persons', personRoutes);
app.use('/api/data', dataRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve built frontend in production
if (process.env.NODE_ENV === 'production') {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERROR]', err.stack || err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Auto-create admin user if no users exist
async function createInitialAdmin(): Promise<void> {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };

  if (userCount.count > 0) {
    return;
  }

  const email = process.env.ADMIN_EMAIL;
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !username || !password) {
    console.log('[INIT] No users exist and ADMIN_EMAIL/ADMIN_USERNAME/ADMIN_PASSWORD not set. Skipping initial admin creation.');
    return;
  }

  const passwordHash = await hashPassword(password);
  const id = uuidv4();

  db.prepare(`
    INSERT INTO users (id, email, username, password_hash, is_admin, email_verified)
    VALUES (?, ?, ?, ?, 1, 1)
  `).run(id, email, username, passwordHash);

  console.log(`[INIT] Initial admin user created: ${username} (${email})`);
}

// Start server
async function start(): Promise<void> {
  initDb();
  await createInitialAdmin();

  app.listen(PORT, () => {
    console.log('');
    console.log('  ╔═══════════════════════════════════════╗');
    console.log('  ║         DriveLedger API Server        ║');
    console.log('  ╠═══════════════════════════════════════╣');
    console.log(`  ║  Port:     ${String(PORT).padEnd(27)}║`);
    console.log(`  ║  Frontend: ${FRONTEND_URL.padEnd(27)}║`);
    console.log(`  ║  Env:      ${(process.env.NODE_ENV || 'development').padEnd(27)}║`);
    console.log('  ╚═══════════════════════════════════════╝');
    console.log('');
  });
}

start().catch((err) => {
  console.error('[FATAL] Failed to start server:', err);
  process.exit(1);
});

export default app;
