import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'driveledger.db');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Enable foreign keys
db.pragma('foreign_keys = ON');

export function initDb(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      is_admin INTEGER NOT NULL DEFAULT 0,
      email_verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS registration_tokens (
      id TEXT PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      created_by TEXT NOT NULL,
      used_by TEXT,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (used_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS api_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      secret_hash TEXT NOT NULL,
      token_prefix TEXT NOT NULL,
      permissions TEXT NOT NULL DEFAULT '["read","write","delete"]',
      active INTEGER NOT NULL DEFAULT 1,
      last_used TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      brand TEXT NOT NULL DEFAULT '',
      model TEXT NOT NULL DEFAULT '',
      variant TEXT NOT NULL DEFAULT '',
      license_plate TEXT NOT NULL DEFAULT '',
      hsn TEXT NOT NULL DEFAULT '',
      tsn TEXT NOT NULL DEFAULT '',
      first_registration TEXT NOT NULL DEFAULT '',
      purchase_price REAL NOT NULL DEFAULT 0,
      purchase_date TEXT NOT NULL DEFAULT '',
      current_mileage INTEGER NOT NULL DEFAULT 0,
      annual_mileage INTEGER NOT NULL DEFAULT 0,
      fuel_type TEXT NOT NULL DEFAULT 'benzin',
      avg_consumption REAL NOT NULL DEFAULT 0,
      fuel_price REAL NOT NULL DEFAULT 0,
      horse_power INTEGER NOT NULL DEFAULT 0,
      image_url TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'owned',
      mobile_de_link TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS costs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      vehicle_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      frequency TEXT NOT NULL DEFAULT 'einmalig',
      paid_by TEXT NOT NULL DEFAULT '',
      start_date TEXT NOT NULL DEFAULT '',
      end_date TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS loans (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      vehicle_id TEXT NOT NULL,
      name TEXT NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0,
      monthly_payment REAL NOT NULL DEFAULT 0,
      interest_rate REAL NOT NULL DEFAULT 0,
      start_date TEXT NOT NULL DEFAULT '',
      duration_months INTEGER NOT NULL DEFAULT 0,
      additional_savings_per_month REAL NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS repairs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      vehicle_id TEXT NOT NULL,
      date TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      cost REAL NOT NULL DEFAULT 0,
      mileage INTEGER NOT NULL DEFAULT 0,
      workshop TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS savings_goals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      vehicle_id TEXT NOT NULL,
      name TEXT NOT NULL,
      target_amount REAL NOT NULL DEFAULT 0,
      monthly_contribution REAL NOT NULL DEFAULT 0,
      start_date TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS savings_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      savings_goal_id TEXT NOT NULL,
      date TEXT NOT NULL DEFAULT '',
      amount REAL NOT NULL DEFAULT 0,
      type TEXT NOT NULL DEFAULT 'deposit',
      description TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (savings_goal_id) REFERENCES savings_goals(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS planned_purchases (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      brand TEXT NOT NULL DEFAULT '',
      model TEXT NOT NULL DEFAULT '',
      variant TEXT NOT NULL DEFAULT '',
      price REAL NOT NULL DEFAULT 0,
      mobile_de_link TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL DEFAULT '',
      year INTEGER NOT NULL DEFAULT 0,
      mileage INTEGER NOT NULL DEFAULT 0,
      fuel_type TEXT NOT NULL DEFAULT 'benzin',
      horse_power INTEGER NOT NULL DEFAULT 0,
      down_payment REAL NOT NULL DEFAULT 0,
      financing_months INTEGER NOT NULL DEFAULT 0,
      interest_rate REAL NOT NULL DEFAULT 0,
      monthly_rate REAL NOT NULL DEFAULT 0,
      estimated_insurance REAL NOT NULL DEFAULT 0,
      estimated_tax REAL NOT NULL DEFAULT 0,
      estimated_fuel_monthly REAL NOT NULL DEFAULT 0,
      estimated_maintenance REAL NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      pros TEXT NOT NULL DEFAULT '',
      cons TEXT NOT NULL DEFAULT '',
      rating INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS persons (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  console.log('[DB] Database initialized successfully');
}

export default db;
