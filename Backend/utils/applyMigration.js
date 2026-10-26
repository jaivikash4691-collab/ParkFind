const { pool } = require('../config/db');

async function applyMigration() {
  try {
    console.log('[Migration] Checking database for QR pass columns...');
    const [cols] = await pool.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME LIKE 'qr_%'"
    );
    const existing = cols.map(c => c.COLUMN_NAME);
    console.log('[Migration] Existing QR columns:', existing);

    if (!existing.includes('qr_pass_token_hash')) {
      console.log('[Migration] Adding qr_pass_token_hash and related columns to bookings table...');
      await pool.query(`
        ALTER TABLE bookings
          ADD COLUMN qr_pass_token_hash VARCHAR(128) NULL,
          ADD COLUMN qr_pass_status ENUM('active', 'used', 'expired', 'revoked') NOT NULL DEFAULT 'active',
          ADD COLUMN qr_validated_at DATETIME NULL,
          ADD COLUMN qr_validated_by INT NULL
      `);
      console.log('[Migration] Columns added.');
    }

    try {
      await pool.query('CREATE INDEX idx_bookings_qr_token ON bookings(qr_pass_token_hash)');
      console.log('[Migration] Index created on qr_pass_token_hash.');
    } catch (e) {
      // index may already exist
      console.log('[Migration] Note on index:', e.message);
    }

    console.log('[Migration] Migration check complete!');
    process.exit(0);
  } catch (err) {
    console.error('[Migration Error]:', err.message);
    process.exit(1);
  }
}

applyMigration();
