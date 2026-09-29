# Database Architecture Documentation — PARKFIND

## 1. Overview
The ParkFind Database (`ParkIt`) is a **3rd Normal Form (3NF) relational database** engineered with MySQL. It powers the two-sided smart parking marketplace connecting **Customers** and **Parking Owners** across **Coimbatore, Tamil Nadu, India**.

---

## 2. Entity-Relationship (ER) Architecture

```
                    ┌─────────────────────────┐
                    │          USERS          │
                    │ PK: id                  │
                    │ email (UNIQUE)          │
                    │ role: 'customer','owner'│
                    └────────────┬────────────┘
                                 │
             ┌───────────────────┴───────────────────┐
             │ 1:N (as owner)                        │ 1:N (as customer)
             ▼                                       ▼
┌─────────────────────────┐             ┌─────────────────────────┐
│    PARKING_LOCATIONS    │             │        BOOKINGS         │
│ PK: id                  │             │ PK: id                  │
│ FK: owner_id -> users   │             │ FK: customer_id->users  │
│ name, area, lat, lng    │             │ FK: parking_location_id │
│ hourly_rate, capacity   │             │ FK: parking_slot_id     │
└────────────┬────────────┘             │ booking_ref (UNIQUE)    │
             │                          └────────────┬────────────┘
             │ 1:N                                   │
             ▼                                       │ 1:1
┌─────────────────────────┐                          ▼
│      PARKING_SLOTS      │             ┌─────────────────────────┐
│ PK: id                  │             │        PAYMENTS         │
│ FK: parking_location_id │             │ PK: id                  │
│ slot_no, slot_type      │             │ FK: booking_id          │
│ UQ(location_id, slot_no)│             │ transaction_ref (UNIQUE)│
│ status: available, occ. │             │ status: paid, refunded  │
└─────────────────────────┘             └─────────────────────────┘
             ▲                                       │
             │                                       │ 1:1
             │ 1:N                                   ▼
             └──────────────────────────┌─────────────────────────┐
                                        │         REVIEWS         │
                                        │ PK: id                  │
                                        │ FK: booking_id          │
                                        │ FK: parking_location_id │
                                        │ rating (1-5), comment   │
                                        └─────────────────────────┘
```

---

## 3. Database Normalization (3NF)

1. **First Normal Form (1NF)**:
   - All columns contain atomic values.
   - Primary keys (`id`) uniquely identify each record.
   - No repeating groups or comma-separated lists.

2. **Second Normal Form (2NF)**:
   - All non-key attributes are fully functionally dependent on the primary key.
   - Distinct relational entities for Users, Parking Locations, Parking Slots, Bookings, Payments, Reviews, and Notifications.

3. **Third Normal Form (3NF)**:
   - Eliminates transitive dependencies:
     - `name`, `address`, `area`, `latitude`, `longitude`, and `hourly_rate` belong to `parking_locations`, not duplicated in `bookings`.
     - *Historical Snapshot*: `hourly_rate_applied` and `total_amount` are captured in `bookings` as an immutable snapshot value at the exact time of reservation, ensuring that future tariff edits by owners do not retroactively alter past customer receipts.

---

## 4. Tables and Schema Definitions

### `users`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT | Unique user ID |
| `full_name` | VARCHAR(100) | NOT NULL | User's full name |
| `email` | VARCHAR(120) | NOT NULL, UNIQUE | User login email |
| `phone` | VARCHAR(20) | NOT NULL | Contact phone number |
| `password_hash`| VARCHAR(255) | NOT NULL | Bcrypt hashed password |
| `role` | ENUM | 'customer', 'owner' | Primary role |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Account creation time |

### `parking_locations`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT | Location ID |
| `owner_id` | INT | FK -> `users(id)` ON DELETE CASCADE | Parking owner |
| `name` | VARCHAR(150) | NOT NULL | Facility name |
| `description` | TEXT | NULL | Facility description |
| `address` | VARCHAR(255) | NOT NULL | Street address in Coimbatore |
| `area` | VARCHAR(100) | NOT NULL | Area (RS Puram, Gandhipuram, etc.) |
| `city` | VARCHAR(100) | NOT NULL, DEFAULT 'Coimbatore'| City |
| `latitude` | DECIMAL(10,7)| NOT NULL | GPS latitude |
| `longitude`| DECIMAL(10,7)| NOT NULL | GPS longitude |
| `hourly_rate`| DECIMAL(8,2)| NOT NULL, CHECK >= 0 | Base hourly tariff (₹) |
| `total_capacity`| INT | NOT NULL, CHECK > 0 | Total parking capacity |
| `status` | ENUM | 'open', 'closed', 'maintenance' | Operational status |
| `opening_time`| VARCHAR(10) | NOT NULL, DEFAULT '06:00' | Opening hour |
| `closing_time`| VARCHAR(10) | NOT NULL, DEFAULT '23:00' | Closing hour |
| `is_covered`| BOOLEAN | DEFAULT TRUE | Covered parking flag |
| `has_ev` | BOOLEAN | DEFAULT FALSE | EV fast charging flag |
| `has_cctv` | BOOLEAN | DEFAULT TRUE | CCTV surveillance |
| `has_security`| BOOLEAN | DEFAULT TRUE | On-site security |
| `is_24_7` | BOOLEAN | DEFAULT FALSE | 24/7 access |
| `is_accessible`| BOOLEAN | DEFAULT TRUE | Accessible parking bay flag |

### `parking_slots`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT | Slot ID |
| `parking_location_id` | INT | FK -> `parking_locations(id)` ON DELETE CASCADE | Facility ID |
| `slot_no` | VARCHAR(20) | NOT NULL | Slot label (e.g. `A-01`, `B-04`) |
| `slot_type` | ENUM | 'standard', 'ev_charging', 'accessible', 'compact' | Bay feature type |
| `bay_row` | INT | NOT NULL, DEFAULT 1 | Layout row position |
| `bay_column` | INT | NOT NULL, DEFAULT 1 | Layout column position |
| `status` | ENUM | 'available', 'reserved', 'occupied', 'maintenance' | Real-time bay state |
| `uq_location_slot`| UNIQUE | `(parking_location_id, slot_no)` | Slot uniqueness constraint |

### `bookings`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT | Booking ID |
| `booking_ref` | VARCHAR(30) | NOT NULL, UNIQUE | Public reference code (`PKF-YYYY-XXXX`) |
| `customer_id` | INT | FK -> `users(id)` ON DELETE SET NULL | Booking customer |
| `parking_location_id` | INT | FK -> `parking_locations(id)` | Facility |
| `parking_slot_id` | INT | FK -> `parking_slots(id)` | Reserved slot |
| `vehicle_number`| VARCHAR(20) | NOT NULL | Vehicle license plate |
| `driver_name` | VARCHAR(100) | NOT NULL | Driver contact name |
| `driver_phone` | VARCHAR(20) | NOT NULL | Driver phone number |
| `start_time` | DATETIME | NOT NULL | Reservation start |
| `end_time` | DATETIME | NOT NULL | Reservation end |
| `duration_hours`| INT | NOT NULL, CHECK > 0 | Duration in hours |
| `hourly_rate_applied` | DECIMAL(8,2) | NOT NULL | Snapshot rate applied |
| `total_amount`| DECIMAL(10,2)| NOT NULL | Total amount (₹) |
| `booking_status`| ENUM | 'pending', 'confirmed', 'active', 'completed', 'cancelled', 'expired' | Reservation lifecycle state |

### `payments`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT | Payment ID |
| `booking_id` | INT | FK -> `bookings(id)` ON DELETE CASCADE, UNIQUE | Associated booking |
| `amount` | DECIMAL(10,2)| NOT NULL, CHECK >= 0 | Payment amount (₹) |
| `status` | ENUM | 'pending', 'paid', 'failed', 'refunded' | Payment state |
| `payment_method` | ENUM | 'upi', 'card', 'netbanking', 'wallet', 'cash' | Payment channel |
| `transaction_reference` | VARCHAR(50) | NOT NULL, UNIQUE | Transaction reference ID |
| `paid_at` | DATETIME | NOT NULL | Payment timestamp |

### `reviews`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT | Review ID |
| `booking_id` | INT | FK -> `bookings(id)` ON DELETE CASCADE, UNIQUE | Associated completed booking |
| `parking_location_id`| INT | FK -> `parking_locations(id)` | Facility |
| `customer_id` | INT | FK -> `users(id)` | Customer reviewer |
| `rating` | INT | NOT NULL, CHECK (1-5) | Star rating (1 to 5) |
| `comment` | TEXT | NULL | Customer feedback |

### `notifications`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT | Notification ID |
| `user_id` | INT | FK -> `users(id)` ON DELETE CASCADE | Recipient user |
| `title` | VARCHAR(150) | NOT NULL | Alert title |
| `message` | TEXT | NOT NULL | Alert message content |
| `type` | ENUM | 'booking', 'payment', 'alert', 'system' | Category |
| `is_read` | BOOLEAN | NOT NULL, DEFAULT FALSE | Read state flag |

---

## 5. Seed Dataset — Coimbatore, Tamil Nadu
- **Demo Customer**: `demo.customer@parkfind.test` (Password: `Demo@12345`)
- **Demo Owner 1**: `owner1@parkfind.test` (Password: `Demo@12345`) — Manages *RS Puram Secure Parking* & *Race Course Executive Parking*
- **Demo Owner 2**: `owner2@parkfind.test` (Password: `Demo@12345`) — Manages *Gandhipuram Smart Hub* & *Saibaba Colony Parking*
- **Demo Owner 3**: `owner3@parkfind.test` (Password: `Demo@12345`) — Manages *Peelamedu Tech Deck* & *Singanallur Express Parking*

---

## 6. How to Run Database Migrations
```bash
cd Backend
npm run seed
```
