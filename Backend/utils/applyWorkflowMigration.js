const { pool } = require('../config/db');

async function applyWorkflowMigration() {
  try {
    console.log('[Workflow Migration] Checking and updating database schema...');

    // 1. Check bookings table for hold_expires_at
    const [bookingCols] = await pool.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings'"
    );
    const existingCols = bookingCols.map(c => c.COLUMN_NAME);

    if (!existingCols.includes('hold_expires_at')) {
      console.log('[Workflow Migration] Adding hold_expires_at to bookings...');
      await pool.query('ALTER TABLE bookings ADD COLUMN hold_expires_at DATETIME NULL AFTER check_out_time');
    }

    if (!existingCols.includes('vehicle_type')) {
      console.log('[Workflow Migration] Adding vehicle_type to bookings...');
      await pool.query("ALTER TABLE bookings ADD COLUMN vehicle_type ENUM('two_wheeler', 'sedan', 'suv', 'ev', 'hatchback') NOT NULL DEFAULT 'sedan' AFTER vehicle_number");
    }

    // 2. Modify payments status to include awaiting_verification and cancelled
    console.log('[Workflow Migration] Updating payments status enum...');
    await pool.query("ALTER TABLE payments MODIFY COLUMN status ENUM('pending', 'awaiting_verification', 'paid', 'failed', 'cancelled', 'refunded') NOT NULL DEFAULT 'pending'");

    // 3. Ensure payments.paid_at is nullable
    await pool.query('ALTER TABLE payments MODIFY COLUMN paid_at DATETIME NULL');

    console.log('[Workflow Migration] Schema successfully upgraded for complete reservation hold workflow!');
    process.exit(0);
  } catch (err) {
    console.error('[Workflow Migration Error]:', err.message);
    process.exit(1);
  }
}

applyWorkflowMigration();
