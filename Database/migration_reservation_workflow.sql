-- Migration: Complete Reservation Hold and Payment Verification Lifecycle
USE parkit;

-- 1. Add hold_expires_at and vehicle_type to bookings if not present
SET @dbname = DATABASE();
SET @tablename = 'bookings';

-- Check hold_expires_at
SET @columnname = 'hold_expires_at';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT 1',
  'ALTER TABLE bookings ADD COLUMN hold_expires_at DATETIME NULL AFTER check_out_time'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Check vehicle_type
SET @columnname = 'vehicle_type';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT 1',
  "ALTER TABLE bookings ADD COLUMN vehicle_type ENUM('two_wheeler', 'sedan', 'suv', 'ev', 'hatchback') NOT NULL DEFAULT 'sedan' AFTER vehicle_number"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 2. Modify payments status enum to support 'awaiting_verification' and 'cancelled'
ALTER TABLE payments MODIFY COLUMN status ENUM('pending', 'awaiting_verification', 'paid', 'failed', 'cancelled', 'refunded') NOT NULL DEFAULT 'pending';

-- 3. Ensure payments.paid_at is nullable
ALTER TABLE payments MODIFY COLUMN paid_at DATETIME NULL;
