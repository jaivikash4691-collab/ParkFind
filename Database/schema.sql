-- ============================================================================
-- PARKIT — PRODUCTION RELATIONAL DATABASE SCHEMA (TiDB Cloud / MySQL Compatible)
-- Idempotent DDL definitions for tables, constraints, foreign keys & indexes.
-- SAFE FOR PRODUCTION: Uses CREATE TABLE IF NOT EXISTS (No DROP statements).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLE: users
-- Core authentication table for Customers and Space Owners.
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 2. TABLE: parking_locations
-- Parking facilities listed and managed by Space Owners.
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 3. TABLE: parking_floors
-- Multi-level structure floors within a parking facility.
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 4. TABLE: parking_rows
-- Aisles, rows, and sections within a specific facility floor.
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 5. TABLE: parking_slots
-- Individual physical parking bays with hierarchical linkage.
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 6. TABLE: bookings
-- Customer reservations, real-time sessions, and gate access credentials.
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 7. TABLE: payments
-- Financial transaction ledger, UPI verification, and owner payouts.
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 8. TABLE: reviews
-- Customer feedback, facility ratings, and comments.
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 9. TABLE: notifications
-- In-app and system alert notifications for customers and space owners.
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 10. TABLE: zones (Legacy Compatibility)
-- Maintained for backwards-compatibility with legacy zone queries.
-- ----------------------------------------------------------------------------
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

