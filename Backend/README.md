# ParkFind Backend REST API — Two-Sided Platform

## 1. Overview
The ParkFind Backend is an Express.js RESTful API engine backed by MySQL. It powers the two-sided parking marketplace connecting **Customers** and **Parking Owners** across **Coimbatore, Tamil Nadu**.

---

## 2. Key Architecture & Features
- **Two-Sided Role Architecture**: Full separation between `CUSTOMER` and `OWNER` roles with server-side RBAC protection.
- **ACID Transactions**: Row-level locking (`SELECT ... FOR UPDATE`) prevents double-booking race conditions during high concurrency.
- **Geospatial Distance Calculation**: Great-Circle (Haversine) calculation for precise proximity sorting and distance labels (`850 m away`).
- **Demo Payment Engine**: Records structured financial transactions into the `payments` table with simulated UPI and Card methods.
- **Intelligent Recommendations**: Multi-factor scoring weighting availability, tariff competitiveness, proximity, and EV fast charging.
- **Statistical Demand Forecasting**: Moving-average time-bucket arrival frequency analysis.

---

## 3. API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register customer or owner |
| `POST` | `/api/auth/login` | Public | Sign in and receive JWT |
| `GET` | `/api/auth/me` | Protected | Get authenticated profile |

### Parking Locations (`/api/locations`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/locations` | Public | Search, filter, distance calculate Coimbatore facilities |
| `GET` | `/api/locations/:id` | Public | Get location details, visual bay matrix, reviews |
| `GET` | `/api/locations/owner/my-locations` | Owner | Get all locations listed by logged-in owner |
| `POST` | `/api/locations` | Owner | Create a new parking facility listing |
| `PUT` | `/api/locations/:id` | Owner | Update tariffs, opening hours, facilities, status |

### Parking Slots (`/api/slots`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/slots` | Public | Query slots by location, status, type |
| `GET` | `/api/slots/:id` | Public | Get single slot details |
| `PUT` | `/api/slots/:id/status` | Optional / Owner | Update bay status (Available / Maintenance / etc.) |
| `POST` | `/api/slots` | Owner | Add physical bay to a location |

### Bookings (`/api/bookings`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/bookings` | Optional / Auth | Reserve bay inside MySQL ACID transaction + Demo payment |
| `GET` | `/api/bookings/active-car` | Optional / Auth | Find My Car wayfinding and active countdown timer |
| `GET` | `/api/bookings/my-bookings` | Optional / Auth | Customer's booking history |
| `GET` | `/api/bookings/owner-bookings` | Owner | Owner's incoming bookings & customer contact info |
| `GET` | `/api/bookings/:idOrRef` | Public | Digital pass details by reference |
| `PUT` | `/api/bookings/:id/extend` | Optional / Auth | Extend session by +1h / +2h with rate recalculation |
| `PUT` | `/api/bookings/:id/cancel` | Optional / Auth | Cancel reservation & release bay |
| `PUT` | `/api/bookings/:id/status` | Optional / Owner| Update booking status (active, completed, cancelled) |

### Reviews (`/api/reviews`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/reviews` | Optional / Auth | Submit 1-5 star review for completed booking |
| `GET` | `/api/reviews/location/:id` | Public | Get reviews for a location |

### Notifications (`/api/notifications`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/notifications` | Protected | Get user notifications |
| `PUT` | `/api/notifications/read-all`| Protected | Mark all alerts read |
| `PUT` | `/api/notifications/:id/read`| Protected | Mark single alert read |

### Analytics & Intelligence
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/recommendations` | Public | Multi-factor recommended Coimbatore parking spaces |
| `GET` | `/api/analytics/forecast` | Public | Statistical arrival time-window demand curves |
| `GET` | `/api/dashboard/stats` | Optional / Auth | Global marketplace stats or Owner business KPI overview |

---

## 4. Setup & Running

```bash
cd Backend
npm install
npm run seed     # Seeds Coimbatore dataset into MySQL
npm test         # Runs 22 automated end-to-end tests
npm run dev      # Starts development server with live reload
```
