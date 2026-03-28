import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { v4 as uuidv4 } from 'uuid';

import { getPool, initDb } from './db.js';
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
import reminderRoutes from './routes/reminders.js';
import serviceRoutes from './routes/services.js';
import upgradeRoutes from './routes/upgrades.js';
import fuelRoutes from './routes/fuel.js';
import odometerRoutes from './routes/odometer.js';
import supplyRoutes from './routes/supplies.js';
import equipmentRoutes from './routes/equipment.js';
import inspectionRoutes from './routes/inspections.js';
import vehicleNoteRoutes from './routes/vehicle-notes.js';
import taxRoutes from './routes/taxes.js';
import plannerTaskRoutes from './routes/planner-tasks.js';
import attachmentRoutes from './routes/attachments.js';
import searchRoutes from './routes/search.js';
import reportRoutes from './routes/reports.js';
import webhookRoutes from './routes/webhooks.js';
import sharingRoutes from './routes/sharing.js';
import bulkRoutes from './routes/bulk.js';
import kioskRoutes from './routes/kiosk.js';
import userConfigRoutes from './routes/user-config.js';
import lubeloggerImportRoutes from './routes/lubelogger-import.js';
import csvRoutes from './routes/csv.js';
import extraFieldRoutes from './routes/extra-fields.js';
import oidcRoutes from './routes/oidc.js';
import widgetRoutes from './routes/widgets.js';
import customWidgetRoutes from './routes/custom-widgets.js';
import householdRoutes from './routes/households.js';
import translationRoutes from './routes/translations.js';
import { startReminderScheduler } from './reminder-scheduler.js';
import { isEmailEnabled } from './email.js';

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
app.use(express.text({ limit: '10mb', type: 'text/csv' }));

// Rate limiting
app.use('/api/', generalRateLimiter);
// Only rate-limit login/register/forgot-password, NOT refresh/me/logout
app.use('/api/auth/login', authRateLimiter);
app.use('/api/auth/register', authRateLimiter);
app.use('/api/auth/forgot-password', authRateLimiter);

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
app.use('/api/reminders', reminderRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/upgrades', upgradeRoutes);
app.use('/api/fuel-records', fuelRoutes);
app.use('/api/odometer-records', odometerRoutes);
app.use('/api/supplies', supplyRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/vehicle-notes', vehicleNoteRoutes);
app.use('/api/tax-records', taxRoutes);
app.use('/api/planner-tasks', plannerTaskRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/sharing', sharingRoutes);
app.use('/api/bulk', bulkRoutes);
app.use('/api/kiosk', kioskRoutes);
app.use('/api/user-config', userConfigRoutes);
app.use('/api/import/lubelogger', lubeloggerImportRoutes);
app.use('/api/csv', csvRoutes);
app.use('/api/extra-fields', extraFieldRoutes);
app.use('/api/oidc', oidcRoutes);
app.use('/api/widgets', widgetRoutes);
app.use('/api/custom-widgets', customWidgetRoutes);
app.use('/api/households', householdRoutes);
app.use('/api/translations', translationRoutes);

// Config endpoint (no auth) - lets frontend know about feature flags
app.get('/api/config', (_req, res) => {
  res.json({
    emailEnabled: isEmailEnabled(),
    oidcEnabled: process.env.OIDC_ENABLED === 'true',
    oidcProviderName: process.env.OIDC_PROVIDER_NAME || 'SSO',
    customLogoUrl: process.env.CUSTOM_LOGO_URL || '',
    customMotd: process.env.CUSTOM_MOTD || '',
    openRegistration: process.env.OPEN_REGISTRATION === 'true',
  });
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// #11 API documentation endpoint
app.get('/api/docs', (_req, res) => {
  const routes: { method: string; path: string }[] = [];
  app._router.stack.forEach((middleware: any) => {
    if (middleware.route) {
      routes.push({ method: Object.keys(middleware.route.methods)[0].toUpperCase(), path: middleware.route.path });
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler: any) => {
        if (handler.route) {
          const prefix = middleware.regexp?.toString().match(/\\\/([^\\]+)/)?.[1] || '';
          routes.push({
            method: Object.keys(handler.route.methods)[0].toUpperCase(),
            path: prefix ? `/api/${prefix}${handler.route.path}` : handler.route.path,
          });
        }
      });
    }
  });
  res.json({ name: 'DriveLedger API', version: '2.0.0', endpoints: routes });
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

// Wait for database to be ready (handles Docker startup timing)
async function waitForDb(maxRetries = 30, delayMs = 2000): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const pool = getPool();
      await pool.execute('SELECT 1');
      return;
    } catch {
      console.log(`[DB] Waiting for database... (${i + 1}/${maxRetries})`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw new Error('Database connection failed after max retries');
}

// Auto-create admin user if no users exist
async function createInitialAdmin(): Promise<void> {
  const pool = getPool();
  const [rows] = await pool.execute('SELECT COUNT(*) as count FROM users');
  const userCount = (rows as { count: number }[])[0];

  if (Number(userCount.count) > 0) {
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

  await pool.execute(
    'INSERT INTO users (id, email, username, password_hash, is_admin, email_verified) VALUES (?, ?, ?, ?, 1, 1)',
    [id, email, username, passwordHash]
  );

  console.log(`[INIT] Initial admin user created: ${username} (${email})`);
}

// Start server
async function start(): Promise<void> {
  await waitForDb();
  await initDb();
  await createInitialAdmin();

  app.listen(PORT, () => {
    console.log('');
    console.log('  ╔═══════════════════════════════════════╗');
    console.log('  ║         DriveLedger API Server        ║');
    console.log('  ╠═══════════════════════════════════════╣');
    console.log(`  ║  Port:     ${String(PORT).padEnd(27)}║`);
    console.log(`  ║  Frontend: ${FRONTEND_URL.padEnd(27)}║`);
    console.log(`  ║  Env:      ${(process.env.NODE_ENV || 'development').padEnd(27)}║`);
    console.log(`  ║  Email:    ${(isEmailEnabled() ? 'enabled' : 'disabled').padEnd(27)}║`);
    console.log('  ╚═══════════════════════════════════════╝');
    console.log('');

    startReminderScheduler();
  });
}

start().catch((err) => {
  console.error('[FATAL] Failed to start server:', err);
  process.exit(1);
});

export default app;
