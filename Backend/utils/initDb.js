/**
 * PARKFIND / PARKIT — Production Database Initialization & Schema Verification
 * 
 * Safe, idempotent initialization script for TiDB Cloud / MySQL.
 * - Uses CREATE TABLE IF NOT EXISTS (never drops tables or destroys data).
 * - Verifies all required tables and columns expected by the backend.
 * - Does NOT seed fake users, dummy passwords, or mock payments in production.
 * - Can be executed directly via `node utils/initDb.js` or `npm run db:init`.
 * - Can also be imported and called at server startup.
 */

const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

// Ordered table definitions to honor foreign key constraints
const SCHEMA_TABLES = [
  {
    name: 'users',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(120) NOT NULL UNIQUE,
        phone VARCHAR(20) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('customer', 'owner') NOT NULL DEFAULT 'customer',
        upi_id VARCHAR(100) NULL,
        upi_name VARCHAR(150) NULL,
        upi_description VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_users_email (email),
        INDEX idx_users_role (role)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `
  },
  {
    name: 'parking_locations',
    sql: `
      CREATE TABLE IF NOT EXISTS parking_locations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        owner_id INT NOT NULL,
        name VARCHAR(150) NOT NULL,
        description TEXT NULL,
        address VARCHAR(255) NOT NULL,
        area VARCHAR(100) NOT NULL,
        city VARCHAR(100) NOT NULL DEFAULT 'Coimbatore',
        state VARCHAR(100) NOT NULL DEFAULT 'Tamil Nadu',
        country VARCHAR(100) NOT NULL DEFAULT 'India',
        latitude DECIMAL(10, 7) NOT NULL,
        longitude DECIMAL(10, 7) NOT NULL,
        hourly_rate DECIMAL(8, 2) NOT NULL DEFAULT 40.00,
        total_capacity INT NOT NULL DEFAULT 20,
        status ENUM('open', 'closed', 'maintenance') NOT NULL DEFAULT 'open',
        opening_time VARCHAR(10) NOT NULL DEFAULT '06:00',
        closing_time VARCHAR(10) NOT NULL DEFAULT '23:00',
        is_covered BOOLEAN DEFAULT TRUE,
        has_ev BOOLEAN DEFAULT FALSE,
        has_cctv BOOLEAN DEFAULT TRUE,
        has_security BOOLEAN DEFAULT TRUE,
        is_24_7 BOOLEAN DEFAULT FALSE,
        is_accessible BOOLEAN DEFAULT TRUE,
        image_url VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_locations_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_locations_owner (owner_id),
        INDEX idx_locations_area (area),
        INDEX idx_locations_city (city),
        INDEX idx_locations_status (status),
        INDEX idx_locations_coords (latitude, longitude)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `
  },
  {
    name: 'parking_floors',
    sql: `
      CREATE TABLE IF NOT EXISTS parking_floors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        parking_location_id INT NOT NULL,
        floor_name VARCHAR(50) NOT NULL,
        floor_number INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_floors_location FOREIGN KEY (parking_location_id) REFERENCES parking_locations(id) ON DELETE CASCADE,
        CONSTRAINT uq_location_floor UNIQUE (parking_location_id, floor_name),
        INDEX idx_floors_location (parking_location_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `
  },
  {
    name: 'parking_rows',
    sql: `
      CREATE TABLE IF NOT EXISTS parking_rows (
        id INT AUTO_INCREMENT PRIMARY KEY,
        floor_id INT NOT NULL,
        row_name VARCHAR(50) NOT NULL,
        display_order INT NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_rows_floor FOREIGN KEY (floor_id) REFERENCES parking_floors(id) ON DELETE CASCADE,
        CONSTRAINT uq_floor_row UNIQUE (floor_id, row_name),
        INDEX idx_rows_floor (floor_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `
  },
  {
    name: 'parking_slots',
    sql: `
      CREATE TABLE IF NOT EXISTS parking_slots (
        id INT AUTO_INCREMENT PRIMARY KEY,
        parking_location_id INT NOT NULL,
        floor_id INT NULL,
        row_id INT NULL,
        slot_no VARCHAR(20) NOT NULL,
        slot_type ENUM('standard', 'ev_charging', 'accessible', 'compact') NOT NULL DEFAULT 'standard',
        bay_row INT NOT NULL DEFAULT 1,
        bay_column INT NOT NULL DEFAULT 1,
        position_x INT NOT NULL DEFAULT 0,
        position_y INT NOT NULL DEFAULT 0,
        status ENUM('available', 'reserved', 'occupied', 'maintenance') NOT NULL DEFAULT 'available',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_slots_location FOREIGN KEY (parking_location_id) REFERENCES parking_locations(id) ON DELETE CASCADE,
        CONSTRAINT fk_slots_floor FOREIGN KEY (floor_id) REFERENCES parking_floors(id) ON DELETE SET NULL,
        CONSTRAINT fk_slots_row FOREIGN KEY (row_id) REFERENCES parking_rows(id) ON DELETE SET NULL,
        CONSTRAINT uq_location_slot UNIQUE (parking_location_id, slot_no),
        INDEX idx_slots_location_status (parking_location_id, status),
        INDEX idx_slots_floor (floor_id),
        INDEX idx_slots_row (row_id),
        INDEX idx_slots_type (slot_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `
  },
  {
    name: 'bookings',
    sql: `
      CREATE TABLE IF NOT EXISTS bookings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        booking_ref VARCHAR(30) NOT NULL UNIQUE,
        customer_id INT NULL,
        parking_location_id INT NOT NULL,
        parking_slot_id INT NOT NULL,
        vehicle_number VARCHAR(20) NOT NULL,
        vehicle_type ENUM('two_wheeler', 'sedan', 'suv', 'ev', 'hatchback') NOT NULL DEFAULT 'sedan',
        driver_name VARCHAR(100) NOT NULL,
        driver_phone VARCHAR(20) NOT NULL,
        start_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        end_time DATETIME NOT NULL,
        duration_hours INT NOT NULL,
        hourly_rate_applied DECIMAL(8, 2) NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        booking_status ENUM('pending', 'confirmed', 'active', 'completed', 'cancelled', 'expired') NOT NULL DEFAULT 'active',
        cancellation_reason VARCHAR(255) NULL,
        extension_count INT NOT NULL DEFAULT 0,
        qr_pass_token_hash VARCHAR(128) NULL,
        qr_pass_status ENUM('active', 'used', 'expired', 'revoked') NOT NULL DEFAULT 'active',
        qr_validated_at DATETIME NULL,
        qr_validated_by INT NULL,
        check_in_time DATETIME NULL,
        check_out_time DATETIME NULL,
        hold_expires_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_bookings_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_bookings_location FOREIGN KEY (parking_location_id) REFERENCES parking_locations(id) ON DELETE CASCADE,
        CONSTRAINT fk_bookings_slot FOREIGN KEY (parking_slot_id) REFERENCES parking_slots(id) ON DELETE CASCADE,
        CONSTRAINT fk_bookings_qr_validator FOREIGN KEY (qr_validated_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_bookings_customer (customer_id),
        INDEX idx_bookings_location (parking_location_id),
        INDEX idx_bookings_slot (parking_slot_id),
        INDEX idx_bookings_status (booking_status),
        INDEX idx_bookings_vehicle (vehicle_number),
        INDEX idx_bookings_start (start_time),
        INDEX idx_bookings_end (end_time),
        INDEX idx_bookings_qr_token (qr_pass_token_hash)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `
  },
  {
    name: 'payments',
    sql: `
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        booking_id INT NOT NULL UNIQUE,
        amount DECIMAL(10, 2) NOT NULL,
        status ENUM('pending', 'awaiting_verification', 'paid', 'failed', 'cancelled', 'refunded') NOT NULL DEFAULT 'pending',
        payment_method ENUM('upi', 'card', 'netbanking', 'wallet', 'cash') NOT NULL DEFAULT 'upi',
        transaction_reference VARCHAR(50) NOT NULL UNIQUE,
        customer_utr VARCHAR(100) NULL,
        confirmed_by INT NULL,
        confirmed_at DATETIME NULL,
        paid_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_payments_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
        CONSTRAINT fk_payments_confirmed_by FOREIGN KEY (confirmed_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_payments_booking (booking_id),
        INDEX idx_payments_status (status),
        INDEX idx_payments_txn (transaction_reference)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `
  },
  {
    name: 'reviews',
    sql: `
      CREATE TABLE IF NOT EXISTS reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        booking_id INT NOT NULL UNIQUE,
        parking_location_id INT NOT NULL,
        customer_id INT NOT NULL,
        rating INT NOT NULL,
        comment TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_reviews_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
        CONSTRAINT fk_reviews_location FOREIGN KEY (parking_location_id) REFERENCES parking_locations(id) ON DELETE CASCADE,
        CONSTRAINT fk_reviews_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_reviews_location (parking_location_id),
        INDEX idx_reviews_customer (customer_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `
  },
  {
    name: 'notifications',
    sql: `
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(150) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('booking', 'payment', 'alert', 'system') NOT NULL DEFAULT 'booking',
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_notifications_user (user_id, is_read)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `
  },
  {
    name: 'zones',
    sql: `
      CREATE TABLE IF NOT EXISTS zones (
        id INT AUTO_INCREMENT PRIMARY KEY,
        zone_code VARCHAR(20) NOT NULL UNIQUE,
        zone_name VARCHAR(100) NOT NULL,
        location VARCHAR(150) NOT NULL,
        floor_level VARCHAR(50) NOT NULL DEFAULT 'Ground Floor',
        hourly_rate DECIMAL(8, 2) NOT NULL DEFAULT 40.00,
        total_slots INT NOT NULL DEFAULT 20,
        description TEXT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `
  }
];

// Non-destructive column checks for pre-existing tables
const COLUMN_MIGRATIONS = [
  { table: 'users', column: 'upi_id', definition: 'VARCHAR(100) NULL AFTER role' },
  { table: 'users', column: 'upi_name', definition: 'VARCHAR(150) NULL AFTER upi_id' },
  { table: 'users', column: 'upi_description', definition: 'VARCHAR(255) NULL AFTER upi_name' },
  { table: 'bookings', column: 'vehicle_type', definition: "ENUM('two_wheeler', 'sedan', 'suv', 'ev', 'hatchback') NOT NULL DEFAULT 'sedan' AFTER vehicle_number" },
  { table: 'bookings', column: 'extension_count', definition: 'INT NOT NULL DEFAULT 0 AFTER cancellation_reason' },
  { table: 'bookings', column: 'qr_pass_token_hash', definition: 'VARCHAR(128) NULL AFTER extension_count' },
  { table: 'bookings', column: 'qr_pass_status', definition: "ENUM('active', 'used', 'expired', 'revoked') NOT NULL DEFAULT 'active' AFTER qr_pass_token_hash" },
  { table: 'bookings', column: 'qr_validated_at', definition: 'DATETIME NULL AFTER qr_pass_status' },
  { table: 'bookings', column: 'qr_validated_by', definition: 'INT NULL AFTER qr_validated_at' },
  { table: 'bookings', column: 'hold_expires_at', definition: 'DATETIME NULL AFTER check_out_time' },
  { table: 'payments', column: 'customer_utr', definition: 'VARCHAR(100) NULL AFTER transaction_reference' },
  { table: 'payments', column: 'confirmed_by', definition: 'INT NULL AFTER customer_utr' },
  { table: 'payments', column: 'confirmed_at', definition: 'DATETIME NULL AFTER confirmed_by' }
];

/**
 * Checks if a column exists in the given table
 */
async function columnExists(connection, tableName, columnName) {
  const [rows] = await connection.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
      AND table_name = ? 
      AND column_name = ?
  `, [tableName, columnName]);
  return rows.length > 0;
}

/**
 * Safe, idempotent database schema initializer.
 * Runs CREATE TABLE IF NOT EXISTS for all tables and verifies column integrity.
 * 
 * @param {Object} options
 * @param {boolean} options.silent - If true, reduces verbose logging
 * @returns {Promise<{ success: boolean, tablesVerified: string[], counts: Record<string, number> }>}
 */
async function initializeDatabase(options = {}) {
  const silent = options.silent === true;
  const log = (...args) => { if (!silent) console.log(...args); };

  log('================================================================');
  log('PARKIT / PARKFIND — Production Database Schema Initializer');
  log('================================================================');

  let connection;
  try {
    connection = await pool.getConnection();

    const [[{ currentDb }]] = await connection.query('SELECT DATABASE() AS currentDb');
    log(`[DB] Connected Database: ${currentDb || 'Default'}`);

    // 1. Create all tables idempotently (CREATE TABLE IF NOT EXISTS)
    log('\n[1/3] Ensuring tables exist with idempotent DDL definitions...');
    for (const table of SCHEMA_TABLES) {
      await connection.query(table.sql);
      log(`  ✓ Table '${table.name}' verified / created`);
    }

    // 2. Safe Column Checks for any pre-existing partially migrated tables
    log('\n[2/3] Checking column schema parity...');
    for (const mig of COLUMN_MIGRATIONS) {
      const exists = await columnExists(connection, mig.table, mig.column);
      if (!exists) {
        log(`  + Adding missing column '${mig.column}' to table '${mig.table}'...`);
        await connection.query(`ALTER TABLE \`${mig.table}\` ADD COLUMN \`${mig.column}\` ${mig.definition};`);
      }
    }
    log('  ✓ Column parity checks completed');

    // 3. Verification & Read-Only Statistics
    log('\n[3/3] Verifying database tables in information_schema...');
    const [existingTables] = await connection.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
    `);
    const existingTableNames = existingTables.map(r => r.table_name || r.TABLE_NAME);

    const counts = {};
    for (const table of SCHEMA_TABLES) {
      if (existingTableNames.includes(table.name)) {
        try {
          const [[{ count }]] = await connection.query(`SELECT COUNT(*) AS count FROM \`${table.name}\``);
          counts[table.name] = count;
          log(`  ✓ Table '${table.name}': OK (Current records: ${count})`);
        } catch (e) {
          counts[table.name] = 'accessible';
          log(`  ✓ Table '${table.name}': OK`);
        }
      } else {
        throw new Error(`Table '${table.name}' was not found in database schema after creation.`);
      }
    }

    log('\n================================================================');
    log('✓ All 10 database tables are active and synchronized!');
    log('✓ Safe for production: No tables dropped, no fake seed data inserted.');
    log('================================================================\n');

    return {
      success: true,
      tablesVerified: SCHEMA_TABLES.map(t => t.name),
      counts
    };
  } catch (err) {
    console.error('\n❌ [Database Initialization Error]:', err.message);
    throw err;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Direct execution CLI runner
if (require.main === module) {
  (async () => {
    try {
      await initializeDatabase({ silent: false });
      process.exit(0);
    } catch (err) {
      process.exit(1);
    }
  })();
}

module.exports = {
  initializeDatabase,
  SCHEMA_TABLES
};

