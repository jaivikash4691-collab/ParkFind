~-- ==========================================================
-- PARKFIND — CUSTOMER & PARKING OWNER TWO-SIDED PLATFORM
-- Relational Database Schema & Realistic Mobility Data (3NF)
-- Supports Multi-Floor & Multi-Row Parking Structures Universally
-- ==========================================================

-- 1. DATABASE CREATION
CREATE DATABASE IF NOT EXISTS ParkIt;
USE ParkIt;

-- 2. DROP EXISTING TABLES IN REVERSE DEPENDENCY ORDER
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS parking_slots;
DROP TABLE IF EXISTS parking_rows;
DROP TABLE IF EXISTS parking_floors;
DROP TABLE IF EXISTS parking_locations;
DROP TABLE IF EXISTS zones; -- legacy table cleanup
DROP TABLE IF EXISTS users;

-- ==========================================================
-- 3. TABLE DEFINITIONS
-- ==========================================================

-- TABLE: users (Customer and Parking Owner roles)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('customer', 'owner') NOT NULL DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- TABLE: parking_locations (Owner-listed parking facilities)
CREATE TABLE parking_locations (
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
    hourly_rate DECIMAL(8, 2) NOT NULL DEFAULT 40.00 CHECK (hourly_rate >= 0),
    total_capacity INT NOT NULL DEFAULT 20 CHECK (total_capacity > 0),
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

    FOREIGN KEY (owner_id)
        REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- TABLE: parking_floors (Levels/Floors within a parking location)
CREATE TABLE parking_floors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parking_location_id INT NOT NULL,
    floor_name VARCHAR(50) NOT NULL,
    floor_number INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (parking_location_id)
        REFERENCES parking_locations(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_location_floor UNIQUE (parking_location_id, floor_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- TABLE: parking_rows (Aisles/Rows/Sections within a specific floor)
CREATE TABLE parking_rows (
    id INT AUTO_INCREMENT PRIMARY KEY,
    floor_id INT NOT NULL,
    row_name VARCHAR(50) NOT NULL,
    display_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (floor_id)
        REFERENCES parking_floors(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_floor_row UNIQUE (floor_id, row_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- TABLE: parking_slots (Individual physical parking spaces with hierarchical linkage)
CREATE TABLE parking_slots (
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

    FOREIGN KEY (parking_location_id)
        REFERENCES parking_locations(id)
        ON DELETE CASCADE,

    FOREIGN KEY (floor_id)
        REFERENCES parking_floors(id)
        ON DELETE SET NULL,

    FOREIGN KEY (row_id)
        REFERENCES parking_rows(id)
        ON DELETE SET NULL,

    CONSTRAINT uq_location_slot UNIQUE (parking_location_id, slot_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- TABLE: bookings (Customer reservation sessions)
CREATE TABLE bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_ref VARCHAR(30) NOT NULL UNIQUE,
    customer_id INT NULL,
    parking_location_id INT NOT NULL,
    parking_slot_id INT NOT NULL,
    vehicle_number VARCHAR(20) NOT NULL,
    driver_name VARCHAR(100) NOT NULL,
    driver_phone VARCHAR(20) NOT NULL,
    start_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME NOT NULL,
    duration_hours INT NOT NULL CHECK (duration_hours > 0),
    hourly_rate_applied DECIMAL(8, 2) NOT NULL CHECK (hourly_rate_applied >= 0),
    total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
    booking_status ENUM('pending', 'confirmed', 'active', 'completed', 'cancelled', 'expired') NOT NULL DEFAULT 'active',
    cancellation_reason VARCHAR(255) NULL,
    extension_count INT NOT NULL DEFAULT 0,
    check_in_time DATETIME NULL,
    check_out_time DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    FOREIGN KEY (parking_location_id)
        REFERENCES parking_locations(id)
        ON DELETE CASCADE,

    FOREIGN KEY (parking_slot_id)
        REFERENCES parking_slots(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- TABLE: payments (Transparent financial ledger for parking bookings)
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL UNIQUE,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
    status ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'paid',
    payment_method ENUM('upi', 'card', 'netbanking', 'wallet', 'cash') NOT NULL DEFAULT 'upi',
    transaction_reference VARCHAR(50) NOT NULL UNIQUE,
    paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (booking_id)
        REFERENCES bookings(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- TABLE: reviews (Customer feedback and ratings after parking completion)
CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL UNIQUE,
    parking_location_id INT NOT NULL,
    customer_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (booking_id)
        REFERENCES bookings(id)
        ON DELETE CASCADE,

    FOREIGN KEY (parking_location_id)
        REFERENCES parking_locations(id)
        ON DELETE CASCADE,

    FOREIGN KEY (customer_id)
        REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- TABLE: notifications (User & Owner alert messages)
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('booking', 'payment', 'alert', 'system') NOT NULL DEFAULT 'booking',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================================
-- 4. PERFORMANCE & GEOSPATIAL INDEXES
-- ==========================================================
CREATE INDEX idx_locations_owner ON parking_locations(owner_id);
CREATE INDEX idx_locations_area ON parking_locations(area);
CREATE INDEX idx_locations_city ON parking_locations(city);
CREATE INDEX idx_locations_status ON parking_locations(status);
CREATE INDEX idx_locations_coords ON parking_locations(latitude, longitude);

CREATE INDEX idx_floors_location ON parking_floors(parking_location_id);
CREATE INDEX idx_rows_floor ON parking_rows(floor_id);

CREATE INDEX idx_slots_location_status ON parking_slots(parking_location_id, status);
CREATE INDEX idx_slots_floor ON parking_slots(floor_id);
CREATE INDEX idx_slots_row ON parking_slots(row_id);
CREATE INDEX idx_slots_type ON parking_slots(slot_type);

CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_location ON bookings(parking_location_id);
CREATE INDEX idx_bookings_slot ON bookings(parking_slot_id);
CREATE INDEX idx_bookings_status ON bookings(booking_status);
CREATE INDEX idx_bookings_vehicle ON bookings(vehicle_number);
CREATE INDEX idx_bookings_start ON bookings(start_time);
CREATE INDEX idx_bookings_end ON bookings(end_time);

CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_reviews_location ON reviews(parking_location_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- ==========================================================
-- 5. SEED DATA — REALISTIC PARKING MARKETPLACE SAMPLE DATA
-- Password for all demo accounts is: Demo@12345
-- Hash: $2b$10$GGqrNN5WDpuaEbFiGuwmu.dt3fsjsD7n9/u9Gs/XslfuuPuhBqAcG
-- ==========================================================

-- Seed Demo Users (1 Customer + 3 Parking Owners)
INSERT INTO users (id, full_name, email, phone, password_hash, role) VALUES
(1, 'Raveendran K', 'demo.customer@parkfind.test', '+91 98422 10101', '$2b$10$GGqrNN5WDpuaEbFiGuwmu.dt3fsjsD7n9/u9Gs/XslfuuPuhBqAcG', 'customer'),
(2, 'Muruganathan S', 'owner1@parkfind.test', '+91 98421 20202', '$2b$10$GGqrNN5WDpuaEbFiGuwmu.dt3fsjsD7n9/u9Gs/XslfuuPuhBqAcG', 'owner'),
(3, 'Kavitha Ramasamy', 'owner2@parkfind.test', '+91 98423 30303', '$2b$10$GGqrNN5WDpuaEbFiGuwmu.dt3fsjsD7n9/u9Gs/XslfuuPuhBqAcG', 'owner'),
(4, 'Dr. Senthil Kumar', 'owner3@parkfind.test', '+91 98424 40404', '$2b$10$GGqrNN5WDpuaEbFiGuwmu.dt3fsjsD7n9/u9Gs/XslfuuPuhBqAcG', 'owner');

-- Seed Parking Locations (Sample Data across Coimbatore Hubs)
INSERT INTO parking_locations (
    id, owner_id, name, description, address, area, city, state, country,
    latitude, longitude, hourly_rate, total_capacity, status,
    opening_time, closing_time, is_covered, has_ev, has_cctv, has_security, is_24_7, is_accessible, image_url
) VALUES
-- Owner 1 Locations
(1, 2, 'RS Puram Secure Parking', 'Multi-level covered facility on DB Road with EV fast charging bays, 24/7 security guard, and elevator access.', '142, DB Road, RS Puram, Coimbatore - 641002', 'RS Puram', 'Coimbatore', 'Tamil Nadu', 'India', 11.0084000, 76.9482000, 40.00, 16, 'open', '06:00', '23:30', TRUE, TRUE, TRUE, TRUE, FALSE, TRUE, 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=600&auto=format&fit=crop&q=80'),
(2, 2, 'Race Course Executive Parking', 'Spacious executive parking opposite Thomas Park. Ideal for morning walkers, club members, and executive shoppers.', '18, Race Course Road, Near Thomas Park, Coimbatore - 641018', 'Race Course', 'Coimbatore', 'Tamil Nadu', 'India', 11.0038000, 76.9742000, 50.00, 14, 'open', '05:30', '23:00', TRUE, TRUE, TRUE, TRUE, FALSE, TRUE, 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=600&auto=format&fit=crop&q=80'),

-- Owner 2 Locations
(3, 3, 'Gandhipuram Smart Hub Parking', 'Central parking hub near Cross Cut Road and Central Bus Stand. Ultra-convenient for commercial shopping and transit commuters.', '88, Cross Cut Road, 7th Street Corner, Gandhipuram, Coimbatore - 641012', 'Gandhipuram', 'Coimbatore', 'Tamil Nadu', 'India', 11.0183000, 76.9654000, 35.00, 18, 'open', '00:00', '23:59', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, 'https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?w=600&auto=format&fit=crop&q=80'),
(4, 3, 'Saibaba Colony NSR Parking Deck', 'Comfortable parking space on NSR Road surrounded by restaurants, banks, and shopping complexes. Features wide bays for SUVs.', '210, NSR Road, Saibaba Colony, Coimbatore - 641011', 'Saibaba Colony', 'Coimbatore', 'Tamil Nadu', 'India', 11.0263000, 76.9421000, 30.00, 12, 'open', '07:00', '22:30', FALSE, FALSE, TRUE, TRUE, FALSE, TRUE, 'https://images.unsplash.com/photo-1545179605-1296651e9d43?w=600&auto=format&fit=crop&q=80'),

-- Owner 3 Locations
(5, 4, 'Peelamedu Tech Park & College Deck', 'Dedicated parking facility along Avinashi Road, catering to IT parks, PSG institutions, and Coimbatore Medical College hospital visitors.', 'Avinashi Road, Near PSG Tech, Peelamedu, Coimbatore - 641004', 'Peelamedu', 'Coimbatore', 'Tamil Nadu', 'India', 11.0287000, 77.0016000, 30.00, 16, 'open', '06:00', '23:00', TRUE, TRUE, TRUE, TRUE, FALSE, TRUE, 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=600&auto=format&fit=crop&q=80'),
(6, 4, 'Singanallur Express Transit Parking', 'Budget-friendly 24/7 parking situated 200m from Singanallur Bus Stand. Perfect for park-and-ride intercity travelers.', 'Trichy Road, Opp. Singanallur Bus Terminus, Coimbatore - 641005', 'Singanallur', 'Coimbatore', 'Tamil Nadu', 'India', 10.9996000, 77.0189000, 25.00, 14, 'open', '00:00', '23:59', FALSE, FALSE, TRUE, TRUE, TRUE, TRUE, 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=600&auto=format&fit=crop&q=80'),
(7, 4, 'Ukkadam Lakefront Safe Parking', 'Secure parking near Ukkadam Bus Terminal and Lake View Promenade. Features automated ticket scan and CCTV surveillance.', 'Perur Bypass Road, Near Ukkadam Bus Stand, Coimbatore - 641001', 'Ukkadam', 'Coimbatore', 'Tamil Nadu', 'India', 10.9904000, 76.9587000, 25.00, 12, 'open', '06:00', '22:00', FALSE, FALSE, TRUE, TRUE, FALSE, FALSE, 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=600&auto=format&fit=crop&q=80'),
(8, 4, 'Avinashi Road Fun Mall Plaza Deck', 'Premium covered parking near Fun Republic Mall with dedicated EV ultra-fast charging bays and automated vehicle number plate recognition.', 'Avinashi Road, Near Hope College, Peelamedu, Coimbatore - 641004', 'Avinashi Road', 'Coimbatore', 'Tamil Nadu', 'India', 11.0335000, 77.0258000, 45.00, 14, 'open', '08:00', '23:30', TRUE, TRUE, TRUE, TRUE, FALSE, TRUE, 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=600&auto=format&fit=crop&q=80');

-- ==========================================================
-- 6. SEED PARKING FLOORS & ROWS
-- ==========================================================

-- Floors for Location 1: RS Puram Secure Parking (Ground Floor + Level 1)
INSERT INTO parking_floors (id, parking_location_id, floor_name, floor_number) VALUES
(1, 1, 'Ground Floor', 0),
(2, 1, 'Level 1', 1);

-- Rows for Location 1
INSERT INTO parking_rows (id, floor_id, row_name, display_order) VALUES
(1, 1, 'Row A (North Wing)', 1),
(2, 1, 'Row B (South Wing)', 2),
(3, 2, 'Row C (Elevator Bay)', 1),
(4, 2, 'Row D (Ramp Exit)', 2);

-- Floors for Location 2: Race Course Executive Parking (Executive Ground Deck)
INSERT INTO parking_floors (id, parking_location_id, floor_name, floor_number) VALUES
(3, 2, 'Executive Ground Deck', 0);

-- Rows for Location 2
INSERT INTO parking_rows (id, floor_id, row_name, display_order) VALUES
(5, 3, 'VIP Bay Row 1', 1),
(6, 3, 'Club Bay Row 2', 2);

-- Floors for Location 3: Gandhipuram Smart Hub (Basement 1 + Ground Floor)
INSERT INTO parking_floors (id, parking_location_id, floor_name, floor_number) VALUES
(4, 3, 'Basement 1', -1),
(5, 3, 'Ground Floor', 0);

-- Rows for Location 3
INSERT INTO parking_rows (id, floor_id, row_name, display_order) VALUES
(7, 4, 'Basement Row B1', 1),
(8, 4, 'Basement Row B2', 2),
(9, 5, 'Ground Row G1', 1);

-- Floors & Rows for Locations 4, 5, 6, 7, 8
INSERT INTO parking_floors (id, parking_location_id, floor_name, floor_number) VALUES
(6, 4, 'Main Deck', 0),
(7, 5, 'Level 1 IT Wing', 1),
(8, 6, 'Ground Transit Bay', 0),
(9, 7, 'Open Lakefront Lot', 0),
(10, 8, 'Mall Plaza Deck', 0);

INSERT INTO parking_rows (id, floor_id, row_name, display_order) VALUES
(10, 6, 'Aisle 1', 1),
(11, 7, 'Tech Row A', 1),
(12, 7, 'Tech Row B', 2),
(13, 8, 'Transit Lane 1', 1),
(14, 9, 'Promenade Row 1', 1),
(15, 10, 'Plaza Row EV', 1),
(16, 10, 'Plaza Row Standard', 2);

-- ==========================================================
-- 7. SEED PARKING SLOTS WITH FLOOR & ROW LINKAGE
-- ==========================================================

-- Location 1: RS Puram Secure Parking (16 slots)
INSERT INTO parking_slots (id, parking_location_id, floor_id, row_id, slot_no, slot_type, bay_row, bay_column, position_x, position_y, status) VALUES
(1, 1, 1, 1, 'A-01', 'accessible', 1, 1, 10, 20, 'available'),
(2, 1, 1, 1, 'A-02', 'accessible', 1, 2, 30, 20, 'available'),
(3, 1, 1, 1, 'A-03', 'ev_charging', 1, 3, 50, 20, 'available'),
(4, 1, 1, 1, 'A-04', 'ev_charging', 1, 4, 70, 20, 'occupied'),
(5, 1, 1, 1, 'A-05', 'standard', 1, 5, 90, 20, 'available'),
(6, 1, 1, 1, 'A-06', 'standard', 1, 6, 110, 20, 'reserved'),
(7, 1, 1, 1, 'A-07', 'standard', 1, 7, 130, 20, 'available'),
(8, 1, 1, 1, 'A-08', 'standard', 1, 8, 150, 20, 'available'),
(9, 1, 1, 2, 'B-01', 'standard', 2, 1, 10, 60, 'available'),
(10, 1, 1, 2, 'B-02', 'standard', 2, 2, 30, 60, 'occupied'),
(11, 1, 1, 2, 'B-03', 'standard', 2, 3, 50, 60, 'available'),
(12, 1, 1, 2, 'B-04', 'standard', 2, 4, 70, 60, 'available'),
(13, 1, 1, 2, 'B-05', 'compact', 2, 5, 90, 60, 'available'),
(14, 1, 1, 2, 'B-06', 'compact', 2, 6, 110, 60, 'available'),
(15, 1, 1, 2, 'B-07', 'compact', 2, 7, 130, 60, 'available'),
(16, 1, 1, 2, 'B-08', 'standard', 2, 8, 150, 60, 'maintenance');

-- Location 2: Race Course Executive Parking (14 slots)
INSERT INTO parking_slots (id, parking_location_id, floor_id, row_id, slot_no, slot_type, bay_row, bay_column, position_x, position_y, status) VALUES
(17, 2, 3, 5, 'RC-01', 'accessible', 1, 1, 15, 25, 'available'),
(18, 2, 3, 5, 'RC-02', 'ev_charging', 1, 2, 40, 25, 'available'),
(19, 2, 3, 5, 'RC-03', 'ev_charging', 1, 3, 65, 25, 'occupied'),
(20, 2, 3, 5, 'RC-04', 'standard', 1, 4, 90, 25, 'available'),
(21, 2, 3, 5, 'RC-05', 'standard', 1, 5, 115, 25, 'available'),
(22, 2, 3, 5, 'RC-06', 'standard', 1, 6, 140, 25, 'available'),
(23, 2, 3, 5, 'RC-07', 'standard', 1, 7, 165, 25, 'reserved'),
(24, 2, 3, 6, 'RC-08', 'standard', 2, 1, 15, 65, 'available'),
(25, 2, 3, 6, 'RC-09', 'standard', 2, 2, 40, 65, 'available'),
(26, 2, 3, 6, 'RC-10', 'standard', 2, 3, 65, 65, 'available'),
(27, 2, 3, 6, 'RC-11', 'compact', 2, 4, 90, 65, 'available'),
(28, 2, 3, 6, 'RC-12', 'compact', 2, 5, 115, 65, 'available'),
(29, 2, 3, 6, 'RC-13', 'compact', 2, 6, 140, 65, 'occupied'),
(30, 2, 3, 6, 'RC-14', 'standard', 2, 7, 165, 65, 'available');

-- Location 3: Gandhipuram Smart Hub (18 slots)
INSERT INTO parking_slots (id, parking_location_id, floor_id, row_id, slot_no, slot_type, bay_row, bay_column, position_x, position_y, status) VALUES
(31, 3, 4, 7, 'B1-01', 'accessible', 1, 1, 10, 20, 'available'),
(32, 3, 4, 7, 'B1-02', 'ev_charging', 1, 2, 35, 20, 'available'),
(33, 3, 4, 7, 'B1-03', 'ev_charging', 1, 3, 60, 20, 'available'),
(34, 3, 4, 7, 'B1-04', 'standard', 1, 4, 85, 20, 'occupied'),
(35, 3, 4, 7, 'B1-05', 'standard', 1, 5, 110, 20, 'available'),
(36, 3, 4, 7, 'B1-06', 'standard', 1, 6, 135, 20, 'available'),
(37, 3, 4, 8, 'B1-07', 'standard', 2, 1, 10, 55, 'available'),
(38, 3, 4, 8, 'B1-08', 'standard', 2, 2, 35, 55, 'reserved'),
(39, 3, 4, 8, 'B1-09', 'standard', 2, 3, 60, 55, 'available'),
(40, 3, 4, 8, 'B1-10', 'compact', 2, 4, 85, 55, 'available'),
(41, 3, 4, 8, 'B1-11', 'compact', 2, 5, 110, 55, 'occupied'),
(42, 3, 4, 8, 'B1-12', 'compact', 2, 6, 135, 55, 'available'),
(43, 3, 5, 9, 'G-01', 'accessible', 3, 1, 10, 90, 'available'),
(44, 3, 5, 9, 'G-02', 'ev_charging', 3, 2, 35, 90, 'available'),
(45, 3, 5, 9, 'G-03', 'standard', 3, 3, 60, 90, 'available'),
(46, 3, 5, 9, 'G-04', 'standard', 3, 4, 85, 90, 'available'),
(47, 3, 5, 9, 'G-05', 'standard', 3, 5, 110, 90, 'available'),
(48, 3, 5, 9, 'G-06', 'standard', 3, 6, 135, 90, 'available');

-- Location 4: Saibaba Colony NSR Parking Deck (12 slots)
INSERT INTO parking_slots (id, parking_location_id, floor_id, row_id, slot_no, slot_type, bay_row, bay_column, position_x, position_y, status) VALUES
(49, 4, 6, 10, 'NSR-01', 'accessible', 1, 1, 10, 20, 'available'),
(50, 4, 6, 10, 'NSR-02', 'standard', 1, 2, 35, 20, 'available'),
(51, 4, 6, 10, 'NSR-03', 'standard', 1, 3, 60, 20, 'available'),
(52, 4, 6, 10, 'NSR-04', 'standard', 1, 4, 85, 20, 'occupied'),
(53, 4, 6, 10, 'NSR-05', 'standard', 1, 5, 110, 20, 'available'),
(54, 4, 6, 10, 'NSR-06', 'standard', 1, 6, 135, 20, 'available'),
(55, 4, 6, 10, 'NSR-07', 'standard', 2, 1, 10, 60, 'available'),
(56, 4, 6, 10, 'NSR-08', 'standard', 2, 2, 35, 60, 'available'),
(57, 4, 6, 10, 'NSR-09', 'compact', 2, 3, 60, 60, 'available'),
(58, 4, 6, 10, 'NSR-10', 'compact', 2, 4, 85, 60, 'reserved'),
(59, 4, 6, 10, 'NSR-11', 'compact', 2, 5, 110, 60, 'available'),
(60, 4, 6, 10, 'NSR-12', 'compact', 2, 6, 135, 60, 'available');

-- Location 5: Peelamedu Tech Park & College Deck (16 slots)
INSERT INTO parking_slots (id, parking_location_id, floor_id, row_id, slot_no, slot_type, bay_row, bay_column, position_x, position_y, status) VALUES
(61, 5, 7, 11, 'TP-01', 'accessible', 1, 1, 10, 20, 'available'),
(62, 5, 7, 11, 'TP-02', 'ev_charging', 1, 2, 30, 20, 'available'),
(63, 5, 7, 11, 'TP-03', 'ev_charging', 1, 3, 50, 20, 'available'),
(64, 5, 7, 11, 'TP-04', 'standard', 1, 4, 70, 20, 'available'),
(65, 5, 7, 11, 'TP-05', 'standard', 1, 5, 90, 20, 'occupied'),
(66, 5, 7, 11, 'TP-06', 'standard', 1, 6, 110, 20, 'available'),
(67, 5, 7, 11, 'TP-07', 'standard', 1, 7, 130, 20, 'available'),
(68, 5, 7, 11, 'TP-08', 'standard', 1, 8, 150, 20, 'available'),
(69, 5, 7, 12, 'TP-09', 'standard', 2, 1, 10, 60, 'available'),
(70, 5, 7, 12, 'TP-10', 'standard', 2, 30, 60, 2, 'available'),
(71, 5, 7, 12, 'TP-11', 'standard', 2, 3, 50, 60, 'available'),
(72, 5, 7, 12, 'TP-12', 'compact', 2, 4, 70, 60, 'available'),
(73, 5, 7, 12, 'TP-13', 'compact', 2, 5, 90, 60, 'reserved'),
(74, 5, 7, 12, 'TP-14', 'compact', 2, 6, 110, 60, 'available'),
(75, 5, 7, 12, 'TP-15', 'compact', 2, 7, 130, 60, 'available'),
(76, 5, 7, 12, 'TP-16', 'compact', 2, 8, 150, 60, 'available');

-- Location 6: Singanallur Express Transit (14 slots)
INSERT INTO parking_slots (id, parking_location_id, floor_id, row_id, slot_no, slot_type, bay_row, bay_column, position_x, position_y, status) VALUES
(77, 6, 8, 13, 'SNG-01', 'accessible', 1, 1, 15, 25, 'available'),
(78, 6, 8, 13, 'SNG-02', 'standard', 1, 2, 40, 25, 'available'),
(79, 6, 8, 13, 'SNG-03', 'standard', 1, 3, 65, 25, 'available'),
(80, 6, 8, 13, 'SNG-04', 'standard', 1, 4, 90, 25, 'occupied'),
(81, 6, 8, 13, 'SNG-05', 'standard', 1, 5, 115, 25, 'available'),
(82, 6, 8, 13, 'SNG-06', 'standard', 1, 6, 140, 25, 'available'),
(83, 6, 8, 13, 'SNG-07', 'standard', 1, 7, 165, 25, 'available'),
(84, 6, 8, 13, 'SNG-08', 'standard', 2, 1, 15, 65, 'available'),
(85, 6, 8, 13, 'SNG-09', 'standard', 2, 2, 40, 65, 'available'),
(86, 6, 8, 13, 'SNG-10', 'compact', 2, 3, 65, 65, 'available'),
(87, 6, 8, 13, 'SNG-11', 'compact', 2, 4, 90, 65, 'available'),
(88, 6, 8, 13, 'SNG-12', 'compact', 2, 5, 115, 65, 'available'),
(89, 6, 8, 13, 'SNG-13', 'compact', 2, 6, 140, 65, 'occupied'),
(90, 6, 8, 13, 'SNG-14', 'compact', 2, 7, 165, 65, 'available');

-- Location 7: Ukkadam Lakefront Safe Parking (12 slots)
INSERT INTO parking_slots (id, parking_location_id, floor_id, row_id, slot_no, slot_type, bay_row, bay_column, position_x, position_y, status) VALUES
(91, 7, 9, 14, 'UK-01', 'standard', 1, 1, 10, 20, 'available'),
(92, 7, 9, 14, 'UK-02', 'standard', 1, 2, 35, 20, 'available'),
(93, 7, 9, 14, 'UK-03', 'standard', 1, 3, 60, 20, 'available'),
(94, 7, 9, 14, 'UK-04', 'standard', 1, 4, 85, 20, 'occupied'),
(95, 7, 9, 14, 'UK-05', 'standard', 1, 5, 110, 20, 'available'),
(96, 7, 9, 14, 'UK-06', 'standard', 1, 6, 135, 20, 'available'),
(97, 7, 9, 14, 'UK-07', 'compact', 2, 1, 10, 60, 'available'),
(98, 7, 9, 14, 'UK-08', 'compact', 2, 2, 35, 60, 'available'),
(99, 7, 9, 14, 'UK-09', 'compact', 2, 3, 60, 60, 'available'),
(100, 7, 9, 14, 'UK-10', 'compact', 2, 4, 85, 60, 'available'),
(101, 7, 9, 14, 'UK-11', 'compact', 2, 5, 110, 60, 'available'),
(102, 7, 9, 14, 'UK-12', 'compact', 2, 6, 135, 60, 'available');

-- Location 8: Avinashi Road Fun Mall Plaza Deck (14 slots)
INSERT INTO parking_slots (id, parking_location_id, floor_id, row_id, slot_no, slot_type, bay_row, bay_column, position_x, position_y, status) VALUES
(103, 8, 10, 15, 'FM-01', 'accessible', 1, 1, 15, 25, 'available'),
(104, 8, 10, 15, 'FM-02', 'ev_charging', 1, 2, 40, 25, 'available'),
(105, 8, 10, 15, 'FM-03', 'ev_charging', 1, 3, 65, 25, 'available'),
(106, 8, 10, 15, 'FM-04', 'ev_charging', 1, 4, 90, 25, 'available'),
(107, 8, 10, 15, 'FM-05', 'standard', 1, 5, 115, 25, 'occupied'),
(108, 8, 10, 15, 'FM-06', 'standard', 1, 6, 140, 25, 'available'),
(109, 8, 10, 15, 'FM-07', 'standard', 1, 7, 165, 25, 'available'),
(110, 8, 10, 16, 'FM-08', 'standard', 2, 1, 15, 65, 'available'),
(111, 8, 10, 16, 'FM-09', 'standard', 2, 2, 40, 65, 'available'),
(112, 8, 10, 16, 'FM-10', 'standard', 2, 3, 65, 65, 'available'),
(113, 8, 10, 16, 'FM-11', 'compact', 2, 4, 90, 65, 'available'),
(114, 8, 10, 16, 'FM-12', 'compact', 2, 5, 115, 65, 'occupied'),
(115, 8, 10, 16, 'FM-13', 'compact', 2, 6, 140, 65, 'available'),
(116, 8, 10, 16, 'FM-14', 'compact', 2, 7, 165, 65, 'available');

-- ==========================================================
-- 8. SEED REALISTIC BOOKINGS & PAYMENTS
-- ==========================================================

-- Active Customer Booking for Raveendran K (Slot A-06 at RS Puram)
INSERT INTO bookings (
    id, booking_ref, customer_id, parking_location_id, parking_slot_id,
    vehicle_number, driver_name, driver_phone,
    start_time, end_time, duration_hours, hourly_rate_applied, total_amount,
    booking_status, check_in_time, created_at
) VALUES (
    1, 'PKF-2026-A892', 1, 1, 6,
    'TN 38 BR 8899', 'Raveendran K', '+91 98422 10101',
    DATE_SUB(NOW(), INTERVAL 30 MINUTE), DATE_ADD(NOW(), INTERVAL 90 MINUTE), 2, 40.00, 80.00,
    'active', DATE_SUB(NOW(), INTERVAL 25 MINUTE), DATE_SUB(NOW(), INTERVAL 30 MINUTE)
);

INSERT INTO payments (id, booking_id, amount, status, payment_method, transaction_reference, paid_at, created_at) VALUES
(1, 1, 80.00, 'paid', 'upi', 'PAY-TXN-2026-A89211', DATE_SUB(NOW(), INTERVAL 30 MINUTE), DATE_SUB(NOW(), INTERVAL 30 MINUTE));

-- Completed and Active Historical Bookings across Facilities
INSERT INTO bookings (
    id, booking_ref, customer_id, parking_location_id, parking_slot_id,
    vehicle_number, driver_name, driver_phone,
    start_time, end_time, duration_hours, hourly_rate_applied, total_amount,
    booking_status, check_in_time, check_out_time, created_at
) VALUES
(2, 'PKF-2026-B102', 1, 1, 4, 'TN 38 CC 1234', 'Raveendran K', '+91 98422 10101', DATE_SUB(NOW(), INTERVAL 3 HOUR), DATE_SUB(NOW(), INTERVAL 1 HOUR), 2, 40.00, 80.00, 'completed', DATE_SUB(NOW(), INTERVAL 3 HOUR), DATE_SUB(NOW(), INTERVAL 1 HOUR), DATE_SUB(NOW(), INTERVAL 3 HOUR)),
(3, 'PKF-2026-C304', NULL, 2, 23, 'TN 37 AB 9001', 'Anand Kumar', '+91 94433 22110', DATE_SUB(NOW(), INTERVAL 45 MINUTE), DATE_ADD(NOW(), INTERVAL 75 MINUTE), 2, 50.00, 100.00, 'active', DATE_SUB(NOW(), INTERVAL 40 MINUTE), NULL, DATE_SUB(NOW(), INTERVAL 45 MINUTE)),
(4, 'PKF-2026-D405', NULL, 2, 29, 'TN 66 Z 4455', 'Priya Mani', '+91 98940 55667', DATE_SUB(NOW(), INTERVAL 4 HOUR), DATE_SUB(NOW(), INTERVAL 2 HOUR), 2, 50.00, 100.00, 'completed', DATE_SUB(NOW(), INTERVAL 4 HOUR), DATE_SUB(NOW(), INTERVAL 2 HOUR), DATE_SUB(NOW(), INTERVAL 4 HOUR)),
(5, 'PKF-2026-E506', NULL, 3, 34, 'TN 38 BX 7788', 'Vijay Sankar', '+91 97890 12345', DATE_SUB(NOW(), INTERVAL 20 MINUTE), DATE_ADD(NOW(), INTERVAL 100 MINUTE), 2, 35.00, 70.00, 'active', DATE_SUB(NOW(), INTERVAL 15 MINUTE), NULL, DATE_SUB(NOW(), INTERVAL 20 MINUTE)),
(6, 'PKF-2026-F607', NULL, 3, 38, 'TN 38 CD 4433', 'Karthik Raja', '+91 98430 99887', DATE_SUB(NOW(), INTERVAL 10 MINUTE), DATE_ADD(NOW(), INTERVAL 50 MINUTE), 1, 35.00, 35.00, 'active', DATE_SUB(NOW(), INTERVAL 5 MINUTE), NULL, DATE_SUB(NOW(), INTERVAL 10 MINUTE)),
(7, 'PKF-2026-G708', NULL, 4, 52, 'TN 38 EE 9911', 'Suresh Babu', '+91 99441 22334', DATE_SUB(NOW(), INTERVAL 5 HOUR), DATE_SUB(NOW(), INTERVAL 2 HOUR), 3, 30.00, 90.00, 'completed', DATE_SUB(NOW(), INTERVAL 5 HOUR), DATE_SUB(NOW(), INTERVAL 2 HOUR), DATE_SUB(NOW(), INTERVAL 5 HOUR)),
(8, 'PKF-2026-H809', NULL, 5, 65, 'TN 38 FF 3322', 'Deepa Lakshmi', '+91 98425 66778', DATE_SUB(NOW(), INTERVAL 1 HOUR), DATE_ADD(NOW(), INTERVAL 60 MINUTE), 2, 30.00, 60.00, 'active', DATE_SUB(NOW(), INTERVAL 55 MINUTE), NULL, DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(9, 'PKF-2026-I910', NULL, 5, 73, 'TN 37 GG 5544', 'Naveen Kumar', '+91 97500 11223', DATE_SUB(NOW(), INTERVAL 15 MINUTE), DATE_ADD(NOW(), INTERVAL 105 MINUTE), 2, 30.00, 60.00, 'active', DATE_SUB(NOW(), INTERVAL 10 MINUTE), NULL, DATE_SUB(NOW(), INTERVAL 15 MINUTE)),
(10, 'PKF-2026-J011', NULL, 6, 80, 'TN 38 HH 8877', 'Manoj Prabhakar', '+91 98944 33445', DATE_SUB(NOW(), INTERVAL 40 MINUTE), DATE_ADD(NOW(), INTERVAL 80 MINUTE), 2, 25.00, 50.00, 'active', DATE_SUB(NOW(), INTERVAL 35 MINUTE), NULL, DATE_SUB(NOW(), INTERVAL 40 MINUTE)),
(11, 'PKF-2026-K112', NULL, 7, 94, 'TN 38 JJ 2211', 'Shalini Devi', '+91 94422 88990', DATE_SUB(NOW(), INTERVAL 25 MINUTE), DATE_ADD(NOW(), INTERVAL 95 MINUTE), 2, 25.00, 50.00, 'active', DATE_SUB(NOW(), INTERVAL 20 MINUTE), NULL, DATE_SUB(NOW(), INTERVAL 25 MINUTE)),
(12, 'PKF-2026-L213', NULL, 8, 107, 'TN 38 KK 7766', 'Ganesh Moorthy', '+91 98428 11223', DATE_SUB(NOW(), INTERVAL 50 MINUTE), DATE_ADD(NOW(), INTERVAL 70 MINUTE), 2, 45.00, 90.00, 'active', DATE_SUB(NOW(), INTERVAL 45 MINUTE), NULL, DATE_SUB(NOW(), INTERVAL 50 MINUTE));

-- Payments for historical bookings
INSERT INTO payments (id, booking_id, amount, status, payment_method, transaction_reference, paid_at, created_at) VALUES
(2, 2, 80.00, 'paid', 'upi', 'PAY-TXN-2026-B10201', DATE_SUB(NOW(), INTERVAL 3 HOUR), DATE_SUB(NOW(), INTERVAL 3 HOUR)),
(3, 3, 100.00, 'paid', 'card', 'PAY-TXN-2026-C30401', DATE_SUB(NOW(), INTERVAL 45 MINUTE), DATE_SUB(NOW(), INTERVAL 45 MINUTE)),
(4, 4, 100.00, 'paid', 'upi', 'PAY-TXN-2026-D40501', DATE_SUB(NOW(), INTERVAL 4 HOUR), DATE_SUB(NOW(), INTERVAL 4 HOUR)),
(5, 5, 70.00, 'paid', 'upi', 'PAY-TXN-2026-E50601', DATE_SUB(NOW(), INTERVAL 20 MINUTE), DATE_SUB(NOW(), INTERVAL 20 MINUTE)),
(6, 6, 35.00, 'paid', 'netbanking', 'PAY-TXN-2026-F60701', DATE_SUB(NOW(), INTERVAL 10 MINUTE), DATE_SUB(NOW(), INTERVAL 10 MINUTE)),
(7, 7, 90.00, 'paid', 'upi', 'PAY-TXN-2026-G70801', DATE_SUB(NOW(), INTERVAL 5 HOUR), DATE_SUB(NOW(), INTERVAL 5 HOUR)),
(8, 8, 60.00, 'paid', 'card', 'PAY-TXN-2026-H80901', DATE_SUB(NOW(), INTERVAL 1 HOUR), DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(9, 9, 60.00, 'paid', 'upi', 'PAY-TXN-2026-I91001', DATE_SUB(NOW(), INTERVAL 15 MINUTE), DATE_SUB(NOW(), INTERVAL 15 MINUTE)),
(10, 10, 50.00, 'paid', 'upi', 'PAY-TXN-2026-J01101', DATE_SUB(NOW(), INTERVAL 40 MINUTE), DATE_SUB(NOW(), INTERVAL 40 MINUTE)),
(11, 11, 50.00, 'paid', 'wallet', 'PAY-TXN-2026-K11201', DATE_SUB(NOW(), INTERVAL 25 MINUTE), DATE_SUB(NOW(), INTERVAL 25 MINUTE)),
(12, 12, 90.00, 'paid', 'upi', 'PAY-TXN-2026-L21301', DATE_SUB(NOW(), INTERVAL 50 MINUTE), DATE_SUB(NOW(), INTERVAL 50 MINUTE));

-- Seed Customer Reviews
INSERT INTO reviews (id, booking_id, parking_location_id, customer_id, rating, comment, created_at) VALUES
(1, 2, 1, 1, 5, 'Seamless parking experience on DB Road! Wide bays, fast EV charging, and helpful security guard.', DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(2, 4, 2, 1, 5, 'Very convenient spot right across from Thomas Park. Clean surface and hassle-free entry pass.', DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(3, 7, 4, 1, 4, 'Good covered space in Saibaba Colony. Saved me from searching 20 minutes on the main road.', DATE_SUB(NOW(), INTERVAL 2 HOUR));

-- Seed Notifications
INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at) VALUES
(1, 1, 'Booking Confirmed', 'Your reservation PKF-2026-A892 for Bay A-06 at RS Puram Secure Parking is confirmed.', 'booking', FALSE, DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
(2, 1, 'Payment Successful', 'Payment of ₹80.00 via UPI received for transaction PAY-TXN-2026-A89211.', 'payment', TRUE, DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
(3, 2, 'New Customer Check-in', 'Driver Raveendran K (TN 38 BR 8899) checked into Bay A-06 at RS Puram Secure Parking.', 'booking', FALSE, DATE_SUB(NOW(), INTERVAL 25 MINUTE)),
(4, 2, 'Session Completed', 'Booking PKF-2026-B102 concluded. Bay A-04 is now available for incoming customers.', 'booking', TRUE, DATE_SUB(NOW(), INTERVAL 1 HOUR));
