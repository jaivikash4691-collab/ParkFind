const { pool } = require('../config/db');

async function applyPaymentMigration() {
  try {
    console.log('[Payment Migration] Checking database columns...');

    // 1. Check users table for upi_id, upi_name, upi_description
    const [userCols] = await pool.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME LIKE 'upi_%'"
    );
    const existingUserCols = userCols.map(c => c.COLUMN_NAME);

    if (!existingUserCols.includes('upi_id')) {
      console.log('[Payment Migration] Adding upi_id to users...');
      await pool.query('ALTER TABLE users ADD COLUMN upi_id VARCHAR(100) NULL AFTER role');
    }
    if (!existingUserCols.includes('upi_name')) {
      console.log('[Payment Migration] Adding upi_name to users...');
      await pool.query('ALTER TABLE users ADD COLUMN upi_name VARCHAR(150) NULL AFTER upi_id');
    }
    if (!existingUserCols.includes('upi_description')) {
      console.log('[Payment Migration] Adding upi_description to users...');
      await pool.query('ALTER TABLE users ADD COLUMN upi_description VARCHAR(255) NULL AFTER upi_name');
    }

    // Seed default UPI settings for existing demo owners if empty
    await pool.query(`
      UPDATE users 
      SET upi_id = 'murugan.parkit@okhdfcbank', upi_name = 'Muruganathan Parking Services' 
      WHERE id = 2 AND (upi_id IS NULL OR upi_id = '')
    `);
    await pool.query(`
      UPDATE users 
      SET upi_id = 'kavitha.parkit@icici', upi_name = 'Kavitha Parking Hub' 
      WHERE id = 3 AND (upi_id IS NULL OR upi_id = '')
    `);
    await pool.query(`
      UPDATE users 
      SET upi_id = 'senthil.parkit@axisbank', upi_name = 'Dr. Senthil Tech Parking' 
      WHERE id = 4 AND (upi_id IS NULL OR upi_id = '')
    `);

    // 2. Check payments table for customer_utr, confirmed_by, confirmed_at
    const [payCols] = await pool.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments'"
    );
    const existingPayCols = payCols.map(c => c.COLUMN_NAME);

    if (!existingPayCols.includes('customer_utr')) {
      console.log('[Payment Migration] Adding customer_utr to payments...');
      await pool.query('ALTER TABLE payments ADD COLUMN customer_utr VARCHAR(100) NULL AFTER transaction_reference');
    }
    if (!existingPayCols.includes('confirmed_by')) {
      console.log('[Payment Migration] Adding confirmed_by to payments...');
      await pool.query('ALTER TABLE payments ADD COLUMN confirmed_by INT NULL AFTER customer_utr');
    }
    if (!existingPayCols.includes('confirmed_at')) {
      console.log('[Payment Migration] Adding confirmed_at to payments...');
      await pool.query('ALTER TABLE payments ADD COLUMN confirmed_at DATETIME NULL AFTER confirmed_by');
    }

    // Make paid_at nullable so pending payments do not trigger SQL NOT NULL violation
    await pool.query('ALTER TABLE payments MODIFY COLUMN paid_at DATETIME NULL');

    console.log('[Payment Migration] Successfully checked and applied payment columns!');

    process.exit(0);
  } catch (err) {
    console.error('[Payment Migration Error]:', err.message);
    process.exit(1);
  }
}

applyPaymentMigration();
