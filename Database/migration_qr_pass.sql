-- ==========================================================
-- PARKIT QR PASS SYSTEM — DATABASE MIGRATION
-- Adds QR pass token support to the bookings table
-- ==========================================================

-- Add QR pass columns to bookings table
ALTER TABLE bookings
  ADD COLUMN qr_pass_token_hash VARCHAR(128) NULL AFTER extension_count,
  ADD COLUMN qr_pass_status ENUM('active', 'used', 'expired', 'revoked') NOT NULL DEFAULT 'active' AFTER qr_pass_token_hash,
  ADD COLUMN qr_validated_at DATETIME NULL AFTER qr_pass_status,
  ADD COLUMN qr_validated_by INT NULL AFTER qr_validated_at;

-- Index for fast QR token lookup during validation
CREATE INDEX idx_bookings_qr_token ON bookings(qr_pass_token_hash);

-- Foreign key for the validating user (owner/staff)
ALTER TABLE bookings
  ADD CONSTRAINT fk_bookings_qr_validator
  FOREIGN KEY (qr_validated_by) REFERENCES users(id)
  ON DELETE SET NULL;
