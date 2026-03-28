import mysql from 'mysql2/promise';

let pool: mysql.Pool;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'driveledger',
      password: process.env.DB_PASSWORD || 'driveledger',
      database: process.env.DB_NAME || 'driveledger',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return pool;
}

export async function initDb(): Promise<void> {
  const db = getPool();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      username VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      is_admin TINYINT(1) NOT NULL DEFAULT 0,
      email_verified TINYINT(1) NOT NULL DEFAULT 0,
      email_verification_token VARCHAR(255) DEFAULT '',
      email_verification_expires DATETIME DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS registration_tokens (
      id VARCHAR(36) PRIMARY KEY,
      token VARCHAR(255) NOT NULL UNIQUE,
      created_by VARCHAR(36) NOT NULL,
      used_by VARCHAR(36),
      used TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (used_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      token VARCHAR(255) NOT NULL UNIQUE,
      used TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS api_tokens (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      name VARCHAR(255) NOT NULL,
      token_hash VARCHAR(255) NOT NULL UNIQUE,
      secret_hash VARCHAR(255) NOT NULL,
      token_prefix VARCHAR(255) NOT NULL,
      permissions TEXT NOT NULL,
      active TINYINT(1) NOT NULL DEFAULT 1,
      last_used DATETIME,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      name VARCHAR(255) NOT NULL,
      brand VARCHAR(255) NOT NULL DEFAULT '',
      model VARCHAR(255) NOT NULL DEFAULT '',
      variant VARCHAR(255) NOT NULL DEFAULT '',
      license_plate VARCHAR(255) NOT NULL DEFAULT '',
      hsn VARCHAR(255) NOT NULL DEFAULT '',
      tsn VARCHAR(255) NOT NULL DEFAULT '',
      first_registration VARCHAR(255) NOT NULL DEFAULT '',
      purchase_price DOUBLE NOT NULL DEFAULT 0,
      purchase_date VARCHAR(255) NOT NULL DEFAULT '',
      current_mileage INT NOT NULL DEFAULT 0,
      annual_mileage INT NOT NULL DEFAULT 0,
      fuel_type VARCHAR(255) NOT NULL DEFAULT 'benzin',
      avg_consumption DOUBLE NOT NULL DEFAULT 0,
      fuel_price DOUBLE NOT NULL DEFAULT 0,
      horse_power INT NOT NULL DEFAULT 0,
      image_url TEXT NOT NULL,
      status VARCHAR(255) NOT NULL DEFAULT 'owned',
      mobile_de_link TEXT NOT NULL,
      notes TEXT NOT NULL,
      color VARCHAR(255) NOT NULL DEFAULT '',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS costs (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      vehicle_id VARCHAR(36) NOT NULL,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(255) NOT NULL,
      amount DOUBLE NOT NULL DEFAULT 0,
      frequency VARCHAR(255) NOT NULL DEFAULT 'einmalig',
      paid_by VARCHAR(255) NOT NULL DEFAULT '',
      start_date VARCHAR(255) NOT NULL DEFAULT '',
      end_date VARCHAR(255) NOT NULL DEFAULT '',
      notes TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS loans (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      vehicle_id VARCHAR(36) NOT NULL,
      name VARCHAR(255) NOT NULL,
      total_amount DOUBLE NOT NULL DEFAULT 0,
      monthly_payment DOUBLE NOT NULL DEFAULT 0,
      interest_rate DOUBLE NOT NULL DEFAULT 0,
      start_date VARCHAR(255) NOT NULL DEFAULT '',
      duration_months INT NOT NULL DEFAULT 0,
      additional_savings_per_month DOUBLE NOT NULL DEFAULT 0,
      notes TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS repairs (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      vehicle_id VARCHAR(36) NOT NULL,
      date VARCHAR(255) NOT NULL DEFAULT '',
      description TEXT NOT NULL,
      category VARCHAR(255) NOT NULL DEFAULT '',
      notes TEXT NOT NULL,
      cost DOUBLE NOT NULL DEFAULT 0,
      mileage INT NOT NULL DEFAULT 0,
      workshop VARCHAR(255) NOT NULL DEFAULT '',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS savings_goals (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      vehicle_id VARCHAR(36) NOT NULL,
      name VARCHAR(255) NOT NULL,
      target_amount DOUBLE NOT NULL DEFAULT 0,
      monthly_contribution DOUBLE NOT NULL DEFAULT 0,
      start_date VARCHAR(255) NOT NULL DEFAULT '',
      notes TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS savings_transactions (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      savings_goal_id VARCHAR(36) NOT NULL,
      date VARCHAR(255) NOT NULL DEFAULT '',
      amount DOUBLE NOT NULL DEFAULT 0,
      type VARCHAR(255) NOT NULL DEFAULT 'deposit',
      description TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (savings_goal_id) REFERENCES savings_goals(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS planned_purchases (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      brand VARCHAR(255) NOT NULL DEFAULT '',
      model VARCHAR(255) NOT NULL DEFAULT '',
      variant VARCHAR(255) NOT NULL DEFAULT '',
      price DOUBLE NOT NULL DEFAULT 0,
      mobile_de_link TEXT NOT NULL,
      image_url TEXT NOT NULL,
      year INT NOT NULL DEFAULT 0,
      mileage INT NOT NULL DEFAULT 0,
      fuel_type VARCHAR(255) NOT NULL DEFAULT 'benzin',
      horse_power INT NOT NULL DEFAULT 0,
      down_payment DOUBLE NOT NULL DEFAULT 0,
      financing_months INT NOT NULL DEFAULT 0,
      interest_rate DOUBLE NOT NULL DEFAULT 0,
      monthly_rate DOUBLE NOT NULL DEFAULT 0,
      estimated_insurance DOUBLE NOT NULL DEFAULT 0,
      estimated_tax DOUBLE NOT NULL DEFAULT 0,
      estimated_fuel_monthly DOUBLE NOT NULL DEFAULT 0,
      estimated_maintenance DOUBLE NOT NULL DEFAULT 0,
      notes TEXT NOT NULL,
      pros TEXT NOT NULL,
      cons TEXT NOT NULL,
      rating INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS persons (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      name VARCHAR(255) NOT NULL,
      color VARCHAR(255) NOT NULL DEFAULT '',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS reminders (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT DEFAULT NULL,
      type VARCHAR(255) NOT NULL,
      entity_type VARCHAR(255) DEFAULT '',
      entity_id VARCHAR(36) DEFAULT '',
      remind_at VARCHAR(255) NOT NULL,
      recurring VARCHAR(255) DEFAULT '',
      email_notify TINYINT(1) DEFAULT 1,
      sent TINYINT(1) DEFAULT 0,
      active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // ==================== New LubeLogger-style tables ====================

  await db.execute(`
    CREATE TABLE IF NOT EXISTS service_records (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      vehicle_id VARCHAR(36) NOT NULL,
      date VARCHAR(255) NOT NULL DEFAULT '',
      description TEXT NOT NULL,
      mileage INT NOT NULL DEFAULT 0,
      cost DOUBLE NOT NULL DEFAULT 0,
      notes TEXT,
      tags JSON DEFAULT NULL,
      category VARCHAR(255) NOT NULL DEFAULT 'other',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS upgrade_records (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      vehicle_id VARCHAR(36) NOT NULL,
      date VARCHAR(255) NOT NULL DEFAULT '',
      description TEXT NOT NULL,
      cost DOUBLE NOT NULL DEFAULT 0,
      mileage INT NOT NULL DEFAULT 0,
      notes TEXT,
      tags JSON DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS fuel_records (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      vehicle_id VARCHAR(36) NOT NULL,
      date VARCHAR(255) NOT NULL DEFAULT '',
      mileage INT NOT NULL DEFAULT 0,
      fuel_amount DOUBLE NOT NULL DEFAULT 0,
      fuel_cost DOUBLE NOT NULL DEFAULT 0,
      is_partial_fill TINYINT(1) NOT NULL DEFAULT 0,
      is_missed_entry TINYINT(1) NOT NULL DEFAULT 0,
      fuel_type VARCHAR(255) NOT NULL DEFAULT '',
      station VARCHAR(255) NOT NULL DEFAULT '',
      notes TEXT,
      tags JSON DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS odometer_records (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      vehicle_id VARCHAR(36) NOT NULL,
      date VARCHAR(255) NOT NULL DEFAULT '',
      mileage INT NOT NULL DEFAULT 0,
      notes TEXT,
      tags JSON DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS supplies (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      vehicle_id VARCHAR(36) DEFAULT NULL,
      name VARCHAR(255) NOT NULL,
      part_number VARCHAR(255) NOT NULL DEFAULT '',
      description TEXT,
      quantity INT NOT NULL DEFAULT 0,
      unit_cost DOUBLE NOT NULL DEFAULT 0,
      notes TEXT,
      tags JSON DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS equipment (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      vehicle_id VARCHAR(36) DEFAULT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      is_equipped TINYINT(1) NOT NULL DEFAULT 1,
      total_distance INT NOT NULL DEFAULT 0,
      notes TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS inspections (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      vehicle_id VARCHAR(36) NOT NULL,
      date VARCHAR(255) NOT NULL DEFAULT '',
      title VARCHAR(255) NOT NULL DEFAULT '',
      items JSON DEFAULT NULL,
      overall_result VARCHAR(255) NOT NULL DEFAULT '',
      mileage INT NOT NULL DEFAULT 0,
      cost DOUBLE NOT NULL DEFAULT 0,
      notes TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS vehicle_notes (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      vehicle_id VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL DEFAULT '',
      content TEXT,
      is_pinned TINYINT(1) NOT NULL DEFAULT 0,
      tags JSON DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS taxes (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      vehicle_id VARCHAR(36) NOT NULL,
      date VARCHAR(255) NOT NULL DEFAULT '',
      description TEXT,
      cost DOUBLE NOT NULL DEFAULT 0,
      is_recurring TINYINT(1) NOT NULL DEFAULT 0,
      recurring_interval VARCHAR(255) NOT NULL DEFAULT '',
      due_date VARCHAR(255) NOT NULL DEFAULT '',
      notes TEXT,
      tags JSON DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS planner_tasks (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      vehicle_id VARCHAR(36) DEFAULT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      priority VARCHAR(255) NOT NULL DEFAULT 'normal',
      stage VARCHAR(255) NOT NULL DEFAULT 'planned',
      category VARCHAR(255) NOT NULL DEFAULT 'service',
      notes TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS attachments (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      record_type VARCHAR(255) NOT NULL,
      record_id VARCHAR(36) NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_path TEXT NOT NULL,
      mime_type VARCHAR(255) NOT NULL DEFAULT '',
      file_size INT NOT NULL DEFAULT 0,
      uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // ==================== Webhooks & Sharing tables ====================

  await db.execute(`
    CREATE TABLE IF NOT EXISTS webhooks (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      url VARCHAR(2048) NOT NULL,
      events JSON NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      secret VARCHAR(255) NOT NULL DEFAULT '',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS vehicle_shares (
      id VARCHAR(36) PRIMARY KEY,
      vehicle_id VARCHAR(36) NOT NULL,
      owner_id VARCHAR(36) NOT NULL,
      shared_with_user_id VARCHAR(36) NOT NULL,
      permission VARCHAR(255) NOT NULL DEFAULT 'viewer',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (shared_with_user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_config (
      user_id VARCHAR(36) PRIMARY KEY,
      language VARCHAR(10) NOT NULL DEFAULT 'en',
      theme VARCHAR(20) NOT NULL DEFAULT 'dark',
      use_system_theme TINYINT(1) NOT NULL DEFAULT 0,
      unit_system VARCHAR(10) NOT NULL DEFAULT 'metric',
      fuel_economy_unit VARCHAR(20) NOT NULL DEFAULT 'l_per_100km',
      use_uk_mpg TINYINT(1) NOT NULL DEFAULT 0,
      preferred_gas_unit VARCHAR(20) NOT NULL DEFAULT 'liters',
      visible_tabs TEXT NOT NULL DEFAULT '["dashboard","vehicles","costs","fuel","repairs","inspections","taxes","loans","savings","supplies","equipment","reminders","planner","purchase-planner","services"]',
      tab_order TEXT NOT NULL DEFAULT '[]',
      default_tab VARCHAR(50) NOT NULL DEFAULT 'dashboard',
      enable_csv_imports TINYINT(1) NOT NULL DEFAULT 1,
      enable_markdown_notes TINYINT(1) NOT NULL DEFAULT 1,
      show_calendar TINYINT(1) NOT NULL DEFAULT 0,
      hide_zero_costs TINYINT(1) NOT NULL DEFAULT 0,
      currency VARCHAR(10) NOT NULL DEFAULT 'EUR',
      date_format VARCHAR(20) NOT NULL DEFAULT 'DD.MM.YYYY',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // ==================== ALTER existing tables ====================

  // Add tags to repairs
  try {
    await db.execute(`ALTER TABLE repairs ADD COLUMN tags JSON DEFAULT NULL`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  // Add tags to costs
  try {
    await db.execute(`ALTER TABLE costs ADD COLUMN tags JSON DEFAULT NULL`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  // Add tags to loans
  try {
    await db.execute(`ALTER TABLE loans ADD COLUMN tags JSON DEFAULT NULL`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  // Add tags to savings_goals
  try {
    await db.execute(`ALTER TABLE savings_goals ADD COLUMN tags JSON DEFAULT NULL`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  // Add mileage fields to reminders
  try {
    await db.execute(`ALTER TABLE reminders ADD COLUMN mileage_threshold INT DEFAULT NULL`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  try {
    await db.execute(`ALTER TABLE reminders ADD COLUMN current_mileage_at_creation INT DEFAULT NULL`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  // Add tags to inspections
  try {
    await db.execute(`ALTER TABLE inspections ADD COLUMN tags JSON DEFAULT NULL`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  // Add tags to equipment
  try {
    await db.execute(`ALTER TABLE equipment ADD COLUMN tags JSON DEFAULT NULL`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  // Add tags to planner_tasks
  try {
    await db.execute(`ALTER TABLE planner_tasks ADD COLUMN tags JSON DEFAULT NULL`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  // Add tags to planned_purchases
  try {
    await db.execute(`ALTER TABLE planned_purchases ADD COLUMN tags JSON DEFAULT NULL`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  // Recurring taxes: add recurring_interval_unit (is_recurring and recurring_interval already exist)
  try {
    await db.execute(`ALTER TABLE taxes ADD COLUMN recurring_interval_unit VARCHAR(20) DEFAULT 'months'`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  // Odometer-based reminders
  try {
    await db.execute(`ALTER TABLE reminders ADD COLUMN metric VARCHAR(20) NOT NULL DEFAULT 'date'`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  try {
    await db.execute(`ALTER TABLE reminders ADD COLUMN target_mileage INT DEFAULT NULL`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  try {
    await db.execute(`ALTER TABLE reminders ADD COLUMN mileage_interval INT DEFAULT NULL`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  try {
    await db.execute(`ALTER TABLE reminders ADD COLUMN vehicle_id VARCHAR(36) DEFAULT NULL`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  // Odometer initial_mileage for distance tracking
  try {
    await db.execute(`ALTER TABLE odometer_records ADD COLUMN initial_mileage INT NOT NULL DEFAULT 0`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  // Notes pinning (is_pinned already in CREATE TABLE, add 'pinned' alias column)
  try {
    await db.execute(`ALTER TABLE vehicle_notes ADD COLUMN pinned TINYINT(1) NOT NULL DEFAULT 0`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  // Supply requisition fields
  try {
    await db.execute(`ALTER TABLE supplies ADD COLUMN supplier VARCHAR(255) DEFAULT ''`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  try {
    await db.execute(`ALTER TABLE supplies ADD COLUMN available_quantity DECIMAL(10,2) DEFAULT NULL`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  // Inspection templates + results
  try {
    await db.execute(`ALTER TABLE inspections ADD COLUMN template_name VARCHAR(255) DEFAULT NULL`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  try {
    await db.execute(`ALTER TABLE inspections ADD COLUMN results JSON DEFAULT NULL`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  try {
    await db.execute(`ALTER TABLE inspections ADD COLUMN failed TINYINT(1) NOT NULL DEFAULT 0`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  // Depreciation fields on vehicles
  try {
    await db.execute(`ALTER TABLE vehicles ADD COLUMN sold_price DECIMAL(10,2) DEFAULT NULL`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  try {
    await db.execute(`ALTER TABLE vehicles ADD COLUMN sold_date VARCHAR(50) DEFAULT NULL`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  try {
    await db.execute(`ALTER TABLE vehicles ADD COLUMN is_electric TINYINT(1) NOT NULL DEFAULT 0`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  // ==================== New feature tables ====================

  await db.execute(`
    CREATE TABLE IF NOT EXISTS extra_field_definitions (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      record_type VARCHAR(50) NOT NULL,
      field_name VARCHAR(255) NOT NULL,
      field_type VARCHAR(20) NOT NULL DEFAULT 'text',
      is_required TINYINT(1) NOT NULL DEFAULT 0,
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS supply_requisitions (
      id VARCHAR(36) PRIMARY KEY,
      supply_id VARCHAR(36) NOT NULL,
      record_type VARCHAR(50) NOT NULL,
      record_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36) NOT NULL,
      quantity DECIMAL(10,2) NOT NULL,
      cost DECIMAL(10,2) NOT NULL DEFAULT 0,
      date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      description VARCHAR(255) DEFAULT '',
      FOREIGN KEY (supply_id) REFERENCES supplies(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS inspection_templates (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      name VARCHAR(255) NOT NULL,
      fields JSON NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS plan_templates (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT DEFAULT '',
      target_type VARCHAR(50) NOT NULL DEFAULT 'service',
      priority VARCHAR(20) NOT NULL DEFAULT 'normal',
      estimated_cost DECIMAL(10,2) DEFAULT 0,
      supply_ids JSON DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Vehicle map data (JSON column for interactive vehicle maps)
  try {
    await db.execute(`ALTER TABLE vehicles ADD COLUMN map_data JSON DEFAULT NULL`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  // Use hours instead of mileage (for boats/forklifts)
  try {
    await db.execute(`ALTER TABLE vehicles ADD COLUMN use_hours TINYINT(1) NOT NULL DEFAULT 0`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  // Odometer optional setting
  try {
    await db.execute(`ALTER TABLE vehicles ADD COLUMN odometer_optional TINYINT(1) NOT NULL DEFAULT 0`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  // Dashboard metrics per vehicle
  try {
    await db.execute(`ALTER TABLE vehicles ADD COLUMN dashboard_metrics JSON DEFAULT '["total_cost","cost_per_km"]'`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  // ==================== Dashboard widgets table ====================

  await db.execute(`
    CREATE TABLE IF NOT EXISTS dashboard_widgets (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      name VARCHAR(255) NOT NULL,
      widget_type VARCHAR(50) NOT NULL,
      config JSON DEFAULT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // ==================== Household tables ====================

  await db.execute(`
    CREATE TABLE IF NOT EXISTS households (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      head_user_id VARCHAR(36) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (head_user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS household_members (
      id VARCHAR(36) PRIMARY KEY,
      household_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36) NOT NULL,
      permissions JSON DEFAULT '["view"]',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_member (household_id, user_id)
    )
  `);

  // ==================== Column preferences on user_config ====================

  try {
    await db.execute(`ALTER TABLE user_config ADD COLUMN column_preferences JSON DEFAULT '{}'`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  // Vehicle identifier setting
  try {
    await db.execute(`ALTER TABLE user_config ADD COLUMN vehicle_identifier VARCHAR(50) DEFAULT 'name'`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  // Add target_type and estimated_cost to planner_tasks
  try {
    await db.execute(`ALTER TABLE planner_tasks ADD COLUMN target_type VARCHAR(50) DEFAULT 'service'`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  try {
    await db.execute(`ALTER TABLE planner_tasks ADD COLUMN estimated_cost DECIMAL(10,2) DEFAULT 0`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  // Odometer adjustment fields on vehicles
  try {
    await db.execute(`ALTER TABLE vehicles ADD COLUMN odometer_multiplier DECIMAL(10,4) DEFAULT 1.0`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  try {
    await db.execute(`ALTER TABLE vehicles ADD COLUMN odometer_difference INT DEFAULT 0`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  // Planner task: reminder link and updated_at tracking
  try {
    await db.execute(`ALTER TABLE planner_tasks ADD COLUMN reminder_record_id VARCHAR(36) DEFAULT NULL`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  try {
    await db.execute(`ALTER TABLE planner_tasks ADD COLUMN updated_at DATETIME DEFAULT NULL`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  // Vehicle tags
  try {
    await db.execute(`ALTER TABLE vehicles ADD COLUMN tags JSON DEFAULT NULL`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  // Hide sold vehicles setting
  try {
    await db.execute(`ALTER TABLE user_config ADD COLUMN hide_sold_vehicles TINYINT(1) NOT NULL DEFAULT 0`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  // Three decimal fuel precision setting
  try {
    await db.execute(`ALTER TABLE user_config ADD COLUMN three_decimal_fuel TINYINT(1) NOT NULL DEFAULT 0`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  // Auto-fill odometer setting
  try {
    await db.execute(`ALTER TABLE user_config ADD COLUMN enable_auto_fill_odometer TINYINT(1) NOT NULL DEFAULT 1`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  // Custom urgency thresholds on reminders
  try {
    await db.execute(`ALTER TABLE reminders ADD COLUMN custom_thresholds JSON DEFAULT NULL`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  // Fixed interval field on reminders
  try {
    await db.execute(`ALTER TABLE reminders ADD COLUMN fixed_interval TINYINT(1) NOT NULL DEFAULT 0`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  // Custom translations table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS custom_translations (
      id VARCHAR(36) PRIMARY KEY,
      language VARCHAR(10) NOT NULL,
      translation_key VARCHAR(255) NOT NULL,
      translation_value TEXT NOT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_lang_key (language, translation_key)
    )
  `);

  // ==================== Custom Widget Code table ====================

  await db.execute(`
    CREATE TABLE IF NOT EXISTS custom_widget_code (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      name VARCHAR(255) NOT NULL,
      code TEXT NOT NULL,
      enabled TINYINT(1) NOT NULL DEFAULT 1,
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // ==================== LubeLogger comparison gap features ====================

  // #1 Equipment linked to odometer records
  try {
    await db.execute(`ALTER TABLE odometer_records ADD COLUMN equipment_ids JSON DEFAULT NULL`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  // #8 Show vehicle thumbnail preference
  try {
    await db.execute(`ALTER TABLE user_config ADD COLUMN show_vehicle_thumbnail TINYINT(1) NOT NULL DEFAULT 1`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  // #9 Kiosk vehicle exclusions
  try {
    await db.execute(`ALTER TABLE vehicles ADD COLUMN exclude_from_kiosk TINYINT(1) NOT NULL DEFAULT 0`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  // #14 Auto decimal format
  try {
    await db.execute(`ALTER TABLE user_config ADD COLUMN auto_decimal_format TINYINT(1) NOT NULL DEFAULT 0`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  // Default sort direction preference
  try {
    await db.execute(`ALTER TABLE user_config ADD COLUMN use_descending TINYINT(1) NOT NULL DEFAULT 0`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  // Auto-refresh reminder toggle
  try {
    await db.execute(`ALTER TABLE user_config ADD COLUMN enable_auto_reminder_refresh TINYINT(1) NOT NULL DEFAULT 1`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  // Show search bar toggle
  try {
    await db.execute(`ALTER TABLE user_config ADD COLUMN show_search TINYINT(1) NOT NULL DEFAULT 1`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) { /* column already exists, ignore */ }
  }

  console.log('[DB] Database initialized successfully');
}

export default getPool;
