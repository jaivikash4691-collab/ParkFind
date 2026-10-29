const { pool, withTransaction } = require('../config/db');
const crypto = require('crypto');

/**
 * Generate a cryptographically random QR pass token (URL-safe base64, 48 bytes of entropy)
 */
function generateQrPassToken() {
  return crypto.randomBytes(48).toString('base64url');
}

/**
 * Hash a QR pass token using SHA-256 for secure storage
 */
function hashQrToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate human-readable booking reference code
 * Format: PKF-2026-XXXX (e.g. PKF-2026-C892)
 */
function generateBookingReference() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomPart = '';
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const year = new Date().getFullYear();
  return `PKF-${year}-${randomPart}`;
}

/**
 * Generate unique demo payment transaction reference
 * Format: PAY-TXN-2026-XXXXXXXX
 */
function generateTransactionReference() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  let randomPart = '';
  for (let i = 0; i < 8; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const year = new Date().getFullYear();
  return `PAY-TXN-${year}-${randomPart}`;
}

/**
 * Auto-sync expired sessions
 */
async function syncExpiredSessions() {
  try {
    const [expired] = await pool.query(`
      SELECT id, parking_slot_id, booking_ref 
      FROM bookings 
      WHERE booking_status = 'active' AND end_time < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 MINUTE)
    `);

    for (const b of expired) {
      await withTransaction(async (conn) => {
        await conn.query(
          `UPDATE bookings SET booking_status = 'completed', updated_at = UTC_TIMESTAMP() WHERE id = ?`,
          [b.id]
        );
        await conn.query(
          `UPDATE parking_slots SET status = 'available', updated_at = UTC_TIMESTAMP() WHERE id = ?`,
          [b.parking_slot_id]
        );
      });
    }
  } catch (err) {
    console.error('[Session Sync Error]', err.message);
  }
}

/**
 * POST /api/bookings
 * Create a new slot booking safely inside an ACID transaction with row-level locking
 */
async function createBooking(req, res, next) {
  try {
    // 0. Mandatory Server-Side Authentication Enforcement
    if (!req.user || !req.user.id) {
      const error = new Error('Authentication required. Please sign in to reserve a parking spot.');
      error.statusCode = 401;
      return next(error);
    }

    const {
      slot_id,
      duration_hours,
      vehicle_number,
      driver_name,
      driver_phone,
      payment_method = 'upi'
    } = req.body;

    // Derived strictly from verified server-side authentication context, NEVER from client body
    const customerId = req.user.id;

    const bookingResult = await withTransaction(async (connection) => {
      // 1. Pessimistic Row Lock: Lock the selected slot and join location and owner UPI profile
      const [slotRows] = await connection.query(
        `SELECT s.id, s.parking_location_id, s.slot_no, s.slot_type, s.bay_row, s.bay_column, s.status,
                l.name AS location_name, l.address, l.area, l.city, l.hourly_rate, l.latitude, l.longitude,
                l.owner_id, l.status AS location_status,
                u.full_name AS owner_name, u.upi_id AS owner_upi_id, u.upi_name AS owner_upi_name, u.upi_description AS owner_upi_desc
         FROM parking_slots s
         INNER JOIN parking_locations l ON s.parking_location_id = l.id
         LEFT JOIN users u ON l.owner_id = u.id
         WHERE s.id = ?
         FOR UPDATE`,
        [slot_id]
      );

      if (slotRows.length === 0) {
        const error = new Error(`Parking slot #${slot_id} does not exist.`);
        error.statusCode = 404;
        throw error;
      }

      const slot = slotRows[0];

      if (slot.location_status === 'closed' || slot.location_status === 'maintenance') {
        const error = new Error(`${slot.location_name} is currently ${slot.location_status}. Cannot reserve spaces at this time.`);
        error.statusCode = 400;
        throw error;
      }

      // 2. Check slot availability
      if (slot.status !== 'available') {
        const error = new Error(`Bay ${slot.slot_no} at ${slot.location_name} is already ${slot.status}. Please choose another spot.`);
        error.statusCode = 409; // 409 Conflict
        throw error;
      }

      // 3. Server-side accurate total calculation
      const hourlyRate = parseFloat(slot.hourly_rate);
      const duration = parseInt(duration_hours, 10);
      const totalAmount = hourlyRate * duration;

      // 4. Generate reference codes and calculate timestamps
      const bookingRef = generateBookingReference();
      const transactionRef = generateTransactionReference();
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);

      // 5. Insert Booking record
      const [insertBooking] = await connection.query(
        `INSERT INTO bookings (
          booking_ref, customer_id, parking_location_id, parking_slot_id,
          vehicle_number, driver_name, driver_phone,
          start_time, end_time, duration_hours, hourly_rate_applied, total_amount,
          booking_status, check_in_time, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
        [
          bookingRef,
          customerId,
          slot.parking_location_id,
          slot.id,
          vehicle_number.trim().toUpperCase(),
          driver_name.trim(),
          driver_phone.trim(),
          startTime,
          endTime,
          duration,
          hourlyRate,
          totalAmount
        ]
      );

      const bookingId = insertBooking.insertId;

      // 6. Direct Owner UPI Payment Setup
      // Build standard India UPI payment URI: upi://pay?pa=OWNER_UPI_ID&pn=OWNER_NAME&am=AMOUNT&cu=INR&tn=BOOKING_REFERENCE
      const ownerUpiId = (slot.owner_upi_id && slot.owner_upi_id.trim()) || `owner${slot.owner_id || 1}@okhdfcbank`;
      const ownerUpiName = (slot.owner_upi_name && slot.owner_upi_name.trim()) || (slot.owner_name && slot.owner_name.trim()) || `${slot.location_name} Parking`;
      const upiUri = `upi://pay?pa=${encodeURIComponent(ownerUpiId)}&pn=${encodeURIComponent(ownerUpiName)}&am=${totalAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(bookingRef)}`;

      // Record payment as 'pending' until owner confirms receipt
      await connection.query(
        `INSERT INTO payments (
          booking_id, amount, status, payment_method, transaction_reference, paid_at, created_at
        ) VALUES (?, ?, 'pending', ?, ?, NULL, UTC_TIMESTAMP())`,
        [bookingId, totalAmount, payment_method, transactionRef]
      );

      // 7. Update slot status to 'reserved'
      await connection.query(
        'UPDATE parking_slots SET status = ?, updated_at = NOW() WHERE id = ?',
        ['reserved', slot.id]
      );

      // 8. Create in-app notifications
      if (customerId) {
        await connection.query(
          `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'booking')`,
          [
            customerId,
            'Booking Reserved — Payment Pending',
            `Your spot ${slot.slot_no} at ${slot.location_name} is reserved. Please pay ₹${totalAmount.toFixed(2)} via UPI directly to ${ownerUpiName}.`
          ]
        );
      }

      if (slot.owner_id) {
        await connection.query(
          `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'booking')`,
          [
            slot.owner_id,
            'New Customer Booking',
            `${driver_name} booked Bay ${slot.slot_no} at ${slot.location_name} (${vehicle_number}) for ${duration}h. Total ₹${totalAmount.toFixed(2)} pending UPI verification.`
          ]
        );
      }

      // 9. Generate QR Pass Token
      const qrPassToken = generateQrPassToken();
      const qrPassTokenHash = hashQrToken(qrPassToken);

      // Store hash in database (never store the raw token)
      await connection.query(
        `UPDATE bookings SET qr_pass_token_hash = ?, qr_pass_status = 'active' WHERE id = ?`,
        [qrPassTokenHash, bookingId]
      );

      return {
        bookingId,
        bookingRef,
        transactionRef,
        slotId: slot.id,
        slotNo: slot.slot_no,
        slotType: slot.slot_type,
        bayRow: slot.bay_row,
        bayColumn: slot.bay_column,
        locationId: slot.parking_location_id,
        locationName: slot.location_name,
        address: slot.address,
        area: slot.area,
        city: slot.city,
        latitude: parseFloat(slot.latitude),
        longitude: parseFloat(slot.longitude),
        vehicleNumber: vehicle_number.trim().toUpperCase(),
        driverName: driver_name.trim(),
        driverPhone: driver_phone.trim(),
        durationHours: duration,
        hourlyRate,
        totalAmount,
        paymentMethod: payment_method,
        paymentStatus: 'pending',
        ownerUpiId,
        ownerUpiName,
        ownerUpiDesc: slot.owner_upi_desc,
        upiUri,
        payment: {
          amount: totalAmount,
          status: 'pending',
          method: payment_method,
          transactionRef,
          ownerUpiId,
          ownerUpiName,
          bookingRef,
          upiUri
        },
        bookingStatus: 'active',
        qrPassToken, // Returned to client once; never stored in plaintext
        startTime,
        endTime,
        directions: `Drive to ${slot.address}, ${slot.area}. Enter through Gate A and follow Row ${slot.bay_row} to Bay ${slot.slot_no}.`
      };
    });

    res.status(201).json({
      success: true,
      message: `Reservation confirmed for Bay ${bookingResult.slotNo} at ${bookingResult.locationName}!`,
      data: bookingResult
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/bookings/:id/extend
 * Extend parking duration with row locking and rate recalculation
 */
async function extendBooking(req, res, next) {
  try {
    const bookingId = req.params.id;
    const additionalHours = parseInt(req.body.additional_hours || '1', 10);

    if (isNaN(additionalHours) || additionalHours < 1 || additionalHours > 12) {
      const error = new Error('Additional hours must be between 1 and 12.');
      error.statusCode = 400;
      return next(error);
    }

    const result = await withTransaction(async (connection) => {
      const [rows] = await connection.query(
        `SELECT b.id, b.booking_ref, b.customer_id, b.parking_slot_id, b.duration_hours,
                b.hourly_rate_applied, b.total_amount, b.end_time, b.booking_status, b.extension_count,
                s.slot_no, l.name AS location_name, l.owner_id
         FROM bookings b
         INNER JOIN parking_slots s ON b.parking_slot_id = s.id
         INNER JOIN parking_locations l ON b.parking_location_id = l.id
         WHERE b.id = ? FOR UPDATE`,
        [bookingId]
      );

      if (rows.length === 0) {
        const error = new Error(`Booking #${bookingId} not found.`);
        error.statusCode = 404;
        throw error;
      }

      const booking = rows[0];

      // Authorization Check: Must be the customer who booked, or the parking facility owner
      const isCustomerOwner = req.user && booking.customer_id === req.user.id;
      const isFacilityOwner = req.user && req.user.role === 'owner' && booking.owner_id === req.user.id;
      if (!isCustomerOwner && !isFacilityOwner) {
        const error = new Error('Access forbidden. You do not have permission to modify this booking.');
        error.statusCode = 403;
        throw error;
      }

      if (booking.booking_status !== 'active') {
        const error = new Error(`Cannot extend a session that is ${booking.booking_status}.`);
        error.statusCode = 400;
        throw error;
      }

      const rate = parseFloat(booking.hourly_rate_applied);
      const addedAmount = rate * additionalHours;
      const newTotalAmount = parseFloat(booking.total_amount) + addedAmount;
      const newDuration = parseInt(booking.duration_hours, 10) + additionalHours;

      // Update booking
      await connection.query(
        `UPDATE bookings 
         SET end_time = DATE_ADD(end_time, INTERVAL ? HOUR),
             duration_hours = ?,
             total_amount = ?,
             extension_count = extension_count + 1,
             updated_at = NOW()
         WHERE id = ?`,
        [additionalHours, newDuration, newTotalAmount, bookingId]
      );

      // Update payment record amount
      await connection.query(
        `UPDATE payments SET amount = ? WHERE booking_id = ?`,
        [newTotalAmount, bookingId]
      );

      // Fetch updated end time
      const [[updated]] = await connection.query('SELECT end_time FROM bookings WHERE id = ?', [bookingId]);

      // Notify owner
      if (booking.owner_id) {
        await connection.query(
          `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'booking')`,
          [
            booking.owner_id,
            'Parking Extended',
            `Booking ${booking.booking_ref} (${booking.slot_no}) extended by +${additionalHours}h. Total: ₹${newTotalAmount.toFixed(2)}.`
          ]
        );
      }

      return {
        bookingId: booking.id,
        bookingRef: booking.booking_ref,
        slotNo: booking.slot_no,
        locationName: booking.location_name,
        additionalHours,
        totalDuration: newDuration,
        newTotalAmount,
        addedCost: addedAmount,
        newEndTime: updated.end_time,
        extensionCount: booking.extension_count + 1
      };
    });

    res.json({
      success: true,
      message: `Parking extended by ${additionalHours} hour(s). New expiry: ${new Date(result.newEndTime).toLocaleTimeString()}`,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/bookings/:id/cancel
 */
async function cancelBooking(req, res, next) {
  try {
    const bookingId = req.params.id;
    const { reason = 'Cancelled by user' } = req.body;

    const result = await withTransaction(async (connection) => {
      const [rows] = await connection.query(
        `SELECT b.id, b.parking_slot_id, b.booking_ref, b.booking_status, b.customer_id,
                s.slot_no, l.owner_id, l.name AS location_name
         FROM bookings b
         INNER JOIN parking_slots s ON b.parking_slot_id = s.id
         INNER JOIN parking_locations l ON b.parking_location_id = l.id
         WHERE b.id = ? FOR UPDATE`,
        [bookingId]
      );

      if (rows.length === 0) {
        const error = new Error(`Booking #${bookingId} not found.`);
        error.statusCode = 404;
        throw error;
      }

      const booking = rows[0];

      // Authorization Check: Must be the customer who booked, or the parking facility owner
      const isCustomerOwner = req.user && booking.customer_id === req.user.id;
      const isFacilityOwner = req.user && req.user.role === 'owner' && booking.owner_id === req.user.id;
      if (!isCustomerOwner && !isFacilityOwner) {
        const error = new Error('Access forbidden. You do not have permission to cancel this booking.');
        error.statusCode = 403;
        throw error;
      }

      if (booking.booking_status !== 'active' && booking.booking_status !== 'confirmed') {
        const error = new Error(`Cannot cancel a booking that is ${booking.booking_status}.`);
        error.statusCode = 400;
        throw error;
      }

      // Mark cancelled
      await connection.query(
        `UPDATE bookings 
         SET booking_status = 'cancelled', cancellation_reason = ?, updated_at = NOW() 
         WHERE id = ?`,
        [reason, bookingId]
      );

      // Refund payment state
      await connection.query(
        `UPDATE payments SET status = 'refunded' WHERE booking_id = ?`,
        [bookingId]
      );

      // Release slot
      await connection.query(
        `UPDATE parking_slots SET status = 'available', updated_at = NOW() WHERE id = ?`,
        [booking.parking_slot_id]
      );

      // Notify owner
      if (booking.owner_id) {
        await connection.query(
          `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'alert')`,
          [
            booking.owner_id,
            'Booking Cancelled',
            `Booking ${booking.booking_ref} (${booking.slot_no} at ${booking.location_name}) was cancelled. Bay is now available.`
          ]
        );
      }

      return {
        bookingId: booking.id,
        bookingRef: booking.booking_ref,
        status: 'cancelled',
        slotNo: booking.slot_no
      };
    });

    res.json({
      success: true,
      message: `Booking ${result.bookingRef} cancelled successfully. Spot has been released.`,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/bookings/:id/status (Owner status updater e.g. complete / check-in)
 */
async function updateBookingStatus(req, res, next) {
  try {
    const bookingId = req.params.id;
    const { status } = req.body;

    const validStatuses = ['active', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      const error = new Error(`Invalid status '${status}'. Must be active, completed, or cancelled.`);
      error.statusCode = 400;
      return next(error);
    }

    const result = await withTransaction(async (connection) => {
      const [rows] = await connection.query(
        `SELECT b.id, b.parking_slot_id, b.booking_ref, b.booking_status, l.owner_id
         FROM bookings b
         INNER JOIN parking_locations l ON b.parking_location_id = l.id
         WHERE b.id = ? FOR UPDATE`,
        [bookingId]
      );

      if (rows.length === 0) {
        const error = new Error(`Booking #${bookingId} not found.`);
        error.statusCode = 404;
        throw error;
      }

      const booking = rows[0];

      if (req.user && req.user.role === 'owner' && booking.owner_id !== req.user.id) {
        const error = new Error('Unauthorized. You can only manage bookings for your own parking spaces.');
        error.statusCode = 403;
        throw error;
      }

      const checkoutTime = status === 'completed' ? new Date() : null;

      await connection.query(
        `UPDATE bookings 
         SET booking_status = ?, check_out_time = COALESCE(?, check_out_time), updated_at = NOW() 
         WHERE id = ?`,
        [status, checkoutTime, bookingId]
      );

      // Release slot if completed or cancelled
      if (status === 'completed' || status === 'cancelled') {
        await connection.query(
          `UPDATE parking_slots SET status = 'available', updated_at = NOW() WHERE id = ?`,
          [booking.parking_slot_id]
        );
      }

      return { bookingId: booking.id, bookingRef: booking.booking_ref, status };
    });

    res.json({
      success: true,
      message: `Booking #${bookingId} updated to ${status}.`,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/bookings/active-car (Find My Car feature)
 */
async function getActiveCarLocation(req, res, next) {
  try {
    const { plate, ref } = req.query;
    const userId = req.user ? req.user.id : null;

    // Unauthenticated callers without explicit reference or plate cannot access any active session
    if (!ref && !plate && !userId) {
      return res.json({
        success: true,
        hasActiveCar: false,
        message: 'No active parking session found.'
      });
    }

    let query = `
      SELECT b.id, b.booking_ref, b.vehicle_number, b.driver_name, b.driver_phone,
             b.start_time, b.end_time, b.duration_hours, b.total_amount, b.booking_status,
             s.id AS slot_id, s.slot_no, s.slot_type, s.bay_row, s.bay_column, s.position_x, s.position_y,
             s.floor_id, s.row_id,
             f.floor_name, f.floor_number, r.row_name,
             l.id AS location_id, l.name AS location_name, l.address, l.area, l.city, l.state,
             l.latitude, l.longitude, p.status AS payment_status, p.transaction_reference
      FROM bookings b
      INNER JOIN parking_slots s ON b.parking_slot_id = s.id
      LEFT JOIN parking_floors f ON s.floor_id = f.id
      LEFT JOIN parking_rows r ON s.row_id = r.id
      INNER JOIN parking_locations l ON b.parking_location_id = l.id
      LEFT JOIN payments p ON b.id = p.booking_id
      WHERE b.booking_status = 'active'
    `;

    const params = [];

    if (ref) {
      query += ' AND b.booking_ref = ?';
      params.push(ref.trim());
    } else if (plate) {
      const cleaned = plate.replace(/[\s-]/g, '').toUpperCase();
      query += " AND REPLACE(REPLACE(b.vehicle_number, ' ', ''), '-', '') LIKE ?";
      params.push(`%${cleaned}%`);
    } else if (userId) {
      query += ' AND b.customer_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY b.created_at DESC LIMIT 1';

    const [rows] = await pool.query(query, params);

    if (rows.length === 0) {
      return res.json({
        success: true,
        hasActiveCar: false,
        message: 'No active parking session found.'
      });
    }

    const b = rows[0];
    const now = new Date().getTime();
    const end = new Date(b.end_time).getTime();
    const remainingSeconds = Math.max(0, Math.floor((end - now) / 1000));
    const isExpired = remainingSeconds === 0;

    // Retrieve all slots on this facility and floor for dynamic wayfinding layout
    const [floorSlots] = await pool.query(`
      SELECT s.id, s.slot_no, s.slot_type, s.bay_row, s.bay_column, s.position_x, s.position_y,
             s.status, s.floor_id, s.row_id,
             f.floor_name, f.floor_number, r.row_name
      FROM parking_slots s
      LEFT JOIN parking_floors f ON s.floor_id = f.id
      LEFT JOIN parking_rows r ON s.row_id = r.id
      WHERE s.parking_location_id = ? AND (s.floor_id = ? OR (s.floor_id IS NULL AND ? IS NULL))
      ORDER BY s.bay_row ASC, s.bay_column ASC, s.slot_no ASC
    `, [b.location_id, b.floor_id, b.floor_id]);

    const floorName = b.floor_name || 'Ground Floor';
    const rowName = b.row_name || `Row ${b.bay_row}`;
    const directions = `Enter through Gate A, proceed to ${floorName}, follow ${rowName} forward 15 meters to Bay ${b.slot_no} on your ${b.bay_column % 2 === 0 ? 'right' : 'left'}.`;

    res.json({
      success: true,
      hasActiveCar: true,
      data: {
        bookingId: b.id,
        bookingRef: b.booking_ref,
        vehicleNumber: b.vehicle_number,
        driverName: b.driver_name,
        driverPhone: b.driver_phone,
        slotId: b.slot_id,
        slotNo: b.slot_no,
        slotType: b.slot_type,
        bayRow: b.bay_row,
        bayColumn: b.bay_column,
        floorId: b.floor_id,
        floorName,
        floorNumber: b.floor_number !== null ? b.floor_number : 0,
        rowId: b.row_id,
        rowName,
        locationId: b.location_id,
        locationName: b.location_name,
        address: b.address,
        area: b.area,
        city: b.city,
        state: b.state,
        latitude: parseFloat(b.latitude),
        longitude: parseFloat(b.longitude),
        startTime: b.start_time,
        endTime: b.end_time,
        durationHours: b.duration_hours,
        totalAmount: parseFloat(b.total_amount),
        remainingSeconds,
        isExpired,
        status: b.booking_status,
        paymentStatus: b.payment_status || 'paid',
        transactionRef: b.transaction_reference,
        directions,
        floorSlots: floorSlots.map(s => ({
          id: s.id,
          slotNo: s.slot_no,
          slotType: s.slot_type,
          bayRow: s.bay_row,
          bayColumn: s.bay_column,
          positionX: s.position_x,
          positionY: s.position_y,
          status: s.status,
          isUserSlot: s.id === b.slot_id,
          rowName: s.row_name || `Row ${s.bay_row}`
        }))
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/bookings/my-bookings (Customer booking history)
 */
async function getMyBookings(req, res, next) {
  try {
    // Enforce server-side authentication
    if (!req.user || !req.user.id) {
      const error = new Error('Authentication required to view your booking history.');
      error.statusCode = 401;
      return next(error);
    }

    await syncExpiredSessions();

    const userId = req.user.id;
    const { status, search } = req.query;

    let query = `
      SELECT 
        b.id,
        b.booking_ref,
        b.vehicle_number,
        b.driver_name,
        b.start_time,
        b.end_time,
        b.duration_hours,
        b.hourly_rate_applied,
        b.total_amount,
        b.booking_status,
        b.extension_count,
        b.created_at,
        s.slot_no,
        s.slot_type,
        l.id AS location_id,
        l.name AS location_name,
        l.address,
        l.area,
        l.latitude,
        l.longitude,
        u.full_name AS owner_name,
        u.upi_id AS owner_upi_id,
        u.upi_name AS owner_upi_name,
        p.status AS payment_status,
        p.transaction_reference,
        p.customer_utr,
        p.confirmed_at,
        r.id AS review_id,
        r.rating AS review_rating
      FROM bookings b
      INNER JOIN parking_slots s ON b.parking_slot_id = s.id
      INNER JOIN parking_locations l ON b.parking_location_id = l.id
      LEFT JOIN users u ON l.owner_id = u.id
      LEFT JOIN payments p ON b.id = p.booking_id
      LEFT JOIN reviews r ON b.id = r.booking_id
      WHERE 1=1
    `;

    const params = [];

    if (userId) {
      query += ` AND (b.customer_id = ? OR b.driver_phone = (SELECT phone FROM users WHERE id = ?))`;
      params.push(userId, userId);
    }

    if (status && status !== 'all') {
      query += ' AND b.booking_status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (b.booking_ref LIKE ? OR b.vehicle_number LIKE ? OR l.name LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY b.created_at DESC LIMIT 50';

    const [rows] = await pool.query(query, params);

    const now = new Date().getTime();

    const bookings = rows.map(b => {
      const end = new Date(b.end_time).getTime();
      const remainingSeconds = Math.max(0, Math.floor((end - now) / 1000));
      const ownerUpi = (b.owner_upi_id && b.owner_upi_id.trim()) || `owner${b.location_id || 1}@okhdfcbank`;
      const ownerName = (b.owner_upi_name && b.owner_upi_name.trim()) || (b.owner_name && b.owner_name.trim()) || `${b.location_name} Parking`;
      const upiUri = `upi://pay?pa=${encodeURIComponent(ownerUpi)}&pn=${encodeURIComponent(ownerName)}&am=${parseFloat(b.total_amount).toFixed(2)}&cu=INR&tn=${encodeURIComponent(b.booking_ref)}`;

      return {
        id: b.id,
        bookingRef: b.booking_ref,
        vehicleNumber: b.vehicle_number,
        driverName: b.driver_name,
        slotNo: b.slot_no,
        slotType: b.slot_type,
        locationId: b.location_id,
        locationName: b.location_name,
        address: b.address,
        area: b.area,
        latitude: parseFloat(b.latitude),
        longitude: parseFloat(b.longitude),
        startTime: b.start_time,
        endTime: b.end_time,
        remainingSeconds,
        durationHours: b.duration_hours,
        hourlyRate: parseFloat(b.hourly_rate_applied),
        totalAmount: parseFloat(b.total_amount),
        extensionCount: b.extension_count,
        status: b.booking_status,
        paymentStatus: b.payment_status || 'pending',
        transactionRef: b.transaction_reference,
        customerUtr: b.customer_utr,
        confirmedAt: b.confirmed_at,
        ownerUpiId: ownerUpi,
        ownerUpiName: ownerName,
        upiUri,
        hasReviewed: Boolean(b.review_id),
        rating: b.review_rating,
        createdAt: b.created_at
      };
    });

    res.json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/bookings/expenses
 * Real-time parking expenses and analytics for the authenticated customer.
 * Aggregates actual completed and paid database records.
 */
async function getCustomerExpenses(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      const error = new Error('Authentication required to view your parking expenses.');
      error.statusCode = 401;
      return next(error);
    }

    const userId = req.user.id;

    // 1. Fetch all bookings for this customer with location & payment details
    const [rows] = await pool.query(`
      SELECT 
        b.id,
        b.booking_ref,
        b.vehicle_number,
        b.driver_name,
        b.start_time,
        b.end_time,
        b.duration_hours,
        b.total_amount,
        b.booking_status,
        b.created_at,
        s.slot_no,
        s.slot_type,
        l.name AS location_name,
        l.address,
        l.area,
        p.status AS payment_status,
        p.payment_method
      FROM bookings b
      INNER JOIN parking_slots s ON b.parking_slot_id = s.id
      INNER JOIN parking_locations l ON b.parking_location_id = l.id
      LEFT JOIN payments p ON b.id = p.booking_id
      WHERE b.customer_id = ? OR b.driver_phone = (SELECT phone FROM users WHERE id = ?)
      ORDER BY b.created_at DESC
    `, [userId, userId]);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let currentMonthSpent = 0;
    let currentMonthCount = 0;
    let totalSpentAllTime = 0;
    let validBookingsCount = 0;

    // Monthly aggregation map for the last 6 months
    const monthlyMap = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const key = `${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}`;
      monthlyMap[key] = { month: key, total: 0, count: 0 };
    }

    const history = [];

    for (const b of rows) {
      const amount = parseFloat(b.total_amount) || 0;
      const bDate = new Date(b.created_at || b.start_time);
      const isPaidOrCompleted = b.booking_status === 'completed' || b.booking_status === 'active' || b.payment_status === 'paid';

      if (isPaidOrCompleted) {
        totalSpentAllTime += amount;
        validBookingsCount += 1;

        if (bDate.getMonth() === currentMonth && bDate.getFullYear() === currentYear) {
          currentMonthSpent += amount;
          currentMonthCount += 1;
        }

        const mKey = `${bDate.toLocaleString('en-US', { month: 'short' })} ${bDate.getFullYear()}`;
        if (monthlyMap[mKey]) {
          monthlyMap[mKey].total += amount;
          monthlyMap[mKey].count += 1;
        }
      }

      history.push({
        id: b.id,
        bookingRef: b.booking_ref,
        vehicleNumber: b.vehicle_number,
        locationName: b.location_name,
        address: b.address,
        area: b.area,
        slotNo: b.slot_no,
        slotType: b.slot_type,
        startTime: b.start_time,
        endTime: b.end_time,
        durationHours: b.duration_hours,
        totalAmount: amount,
        status: b.booking_status,
        paymentStatus: b.payment_status || 'paid',
        paymentMethod: b.payment_method || 'upi',
        createdAt: b.created_at
      });
    }

    const averageCost = validBookingsCount > 0 ? (totalSpentAllTime / validBookingsCount) : 0;
    const monthlySpendingChart = Object.values(monthlyMap);

    res.json({
      success: true,
      data: {
        summary: {
          currentMonthSpending: parseFloat(currentMonthSpent.toFixed(2)),
          currentMonthBookings: currentMonthCount,
          totalSpendingAllTime: parseFloat(totalSpentAllTime.toFixed(2)),
          totalBookingsCount: rows.length,
          averageCost: parseFloat(averageCost.toFixed(2))
        },
        monthlyChart: monthlySpendingChart,
        history
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/bookings/owner-bookings (Owner-filtered incoming bookings)
 */
async function getOwnerBookings(req, res, next) {
  try {
    await syncExpiredSessions();

    const ownerId = req.user.id;
    const { status, location_id, search } = req.query;

    let query = `
      SELECT 
        b.id,
        b.booking_ref,
        b.vehicle_number,
        b.driver_name,
        b.driver_phone,
        b.start_time,
        b.end_time,
        b.duration_hours,
        b.hourly_rate_applied,
        b.total_amount,
        b.booking_status,
        b.check_in_time,
        b.check_out_time,
        b.created_at,
        s.slot_no,
        s.slot_type,
        l.id AS location_id,
        l.name AS location_name,
        l.area,
        p.status AS payment_status,
        p.payment_method,
        p.transaction_reference,
        p.customer_utr,
        p.confirmed_by,
        p.confirmed_at
      FROM bookings b
      INNER JOIN parking_slots s ON b.parking_slot_id = s.id
      INNER JOIN parking_locations l ON b.parking_location_id = l.id
      LEFT JOIN payments p ON b.id = p.booking_id
      WHERE l.owner_id = ?
    `;

    const params = [ownerId];

    if (location_id) {
      query += ' AND l.id = ?';
      params.push(parseInt(location_id, 10));
    }

    if (status && status !== 'all') {
      query += ' AND b.booking_status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (b.booking_ref LIKE ? OR b.vehicle_number LIKE ? OR b.driver_name LIKE ? OR s.slot_no LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    query += ' ORDER BY b.created_at DESC LIMIT 100';

    const [rows] = await pool.query(query, params);

    const now = new Date().getTime();

    const bookings = rows.map(b => {
      const end = new Date(b.end_time).getTime();
      const remainingSeconds = Math.max(0, Math.floor((end - now) / 1000));

      return {
        id: b.id,
        bookingRef: b.booking_ref,
        customerName: b.driver_name,
        customerPhone: b.driver_phone,
        vehicleNumber: b.vehicle_number,
        slotNo: b.slot_no,
        slotType: b.slot_type,
        locationId: b.location_id,
        locationName: b.location_name,
        area: b.area,
        startTime: b.start_time,
        endTime: b.end_time,
        remainingSeconds,
        durationHours: b.duration_hours,
        hourlyRate: parseFloat(b.hourly_rate_applied),
        totalAmount: parseFloat(b.total_amount),
        bookingStatus: b.booking_status,
        paymentStatus: b.payment_status || 'pending',
        paymentMethod: b.payment_method || 'upi',
        transactionRef: b.transaction_reference,
        customerUtr: b.customer_utr,
        confirmedBy: b.confirmed_by,
        confirmedAt: b.confirmed_at,
        checkInTime: b.check_in_time,
        checkOutTime: b.check_out_time,
        createdAt: b.created_at
      };
    });

    res.json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/bookings/expenses
 * Real-time parking expenses and analytics for the authenticated customer.
 * Aggregates actual completed and paid database records.
 */
async function getCustomerExpenses(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      const error = new Error('Authentication required to view your parking expenses.');
      error.statusCode = 401;
      return next(error);
    }

    const userId = req.user.id;

    // 1. Fetch all bookings for this customer with location & payment details
    const [rows] = await pool.query(`
      SELECT 
        b.id,
        b.booking_ref,
        b.vehicle_number,
        b.driver_name,
        b.start_time,
        b.end_time,
        b.duration_hours,
        b.total_amount,
        b.booking_status,
        b.created_at,
        s.slot_no,
        s.slot_type,
        l.name AS location_name,
        l.address,
        l.area,
        p.status AS payment_status,
        p.payment_method
      FROM bookings b
      INNER JOIN parking_slots s ON b.parking_slot_id = s.id
      INNER JOIN parking_locations l ON b.parking_location_id = l.id
      LEFT JOIN payments p ON b.id = p.booking_id
      WHERE b.customer_id = ? OR b.driver_phone = (SELECT phone FROM users WHERE id = ?)
      ORDER BY b.created_at DESC
    `, [userId, userId]);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let currentMonthSpent = 0;
    let currentMonthCount = 0;
    let totalSpentAllTime = 0;
    let validBookingsCount = 0;

    // Monthly aggregation map for the last 6 months
    const monthlyMap = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const key = `${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}`;
      monthlyMap[key] = { month: key, total: 0, count: 0 };
    }

    const history = [];

    for (const b of rows) {
      const amount = parseFloat(b.total_amount) || 0;
      const bDate = new Date(b.created_at || b.start_time);
      const isPaidOrCompleted = b.booking_status === 'completed' || b.booking_status === 'active' || b.payment_status === 'paid';

      if (isPaidOrCompleted) {
        totalSpentAllTime += amount;
        validBookingsCount += 1;

        if (bDate.getMonth() === currentMonth && bDate.getFullYear() === currentYear) {
          currentMonthSpent += amount;
          currentMonthCount += 1;
        }

        const mKey = `${bDate.toLocaleString('en-US', { month: 'short' })} ${bDate.getFullYear()}`;
        if (monthlyMap[mKey]) {
          monthlyMap[mKey].total += amount;
          monthlyMap[mKey].count += 1;
        }
      }

      history.push({
        id: b.id,
        bookingRef: b.booking_ref,
        vehicleNumber: b.vehicle_number,
        locationName: b.location_name,
        address: b.address,
        area: b.area,
        slotNo: b.slot_no,
        slotType: b.slot_type,
        startTime: b.start_time,
        endTime: b.end_time,
        durationHours: b.duration_hours,
        totalAmount: amount,
        status: b.booking_status,
        paymentStatus: b.payment_status || 'paid',
        paymentMethod: b.payment_method || 'upi',
        createdAt: b.created_at
      });
    }

    const averageCost = validBookingsCount > 0 ? (totalSpentAllTime / validBookingsCount) : 0;
    const monthlySpendingChart = Object.values(monthlyMap);

    res.json({
      success: true,
      data: {
        summary: {
          currentMonthSpending: parseFloat(currentMonthSpent.toFixed(2)),
          currentMonthBookings: currentMonthCount,
          totalSpendingAllTime: parseFloat(totalSpentAllTime.toFixed(2)),
          totalBookingsCount: rows.length,
          averageCost: parseFloat(averageCost.toFixed(2))
        },
        monthlyChart: monthlySpendingChart,
        history
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/bookings/:idOrRef
 */
async function getBookingByIdOrRef(req, res, next) {
  try {
    const identifier = req.params.idOrRef;
    const isNumeric = /^\d+$/.test(identifier);

    const query = `
      SELECT 
        b.id,
        b.booking_ref,
        b.customer_id,
        b.vehicle_number,
        b.driver_name,
        b.driver_phone,
        b.start_time,
        b.end_time,
        b.duration_hours,
        b.hourly_rate_applied,
        b.total_amount,
        b.booking_status,
        b.check_in_time,
        b.check_out_time,
        b.cancellation_reason,
        b.extension_count,
        b.created_at,
        b.qr_pass_status,
        b.qr_validated_at,
        s.id AS slot_id,
        s.slot_no,
        s.slot_type,
        s.bay_row,
        s.bay_column,
        s.status AS slot_status,
        l.id AS location_id,
        l.name AS location_name,
        l.address,
        l.area,
        l.city,
        l.latitude,
        l.longitude,
        l.owner_id,
        u.full_name AS owner_name,
        u.upi_id AS owner_upi_id,
        u.upi_name AS owner_upi_name,
        u.upi_description AS owner_upi_desc,
        p.status AS payment_status,
        p.payment_method,
        p.transaction_reference,
        p.customer_utr,
        p.confirmed_by,
        p.confirmed_at
      FROM bookings b
      INNER JOIN parking_slots s ON b.parking_slot_id = s.id
      INNER JOIN parking_locations l ON b.parking_location_id = l.id
      LEFT JOIN users u ON l.owner_id = u.id
      LEFT JOIN payments p ON b.id = p.booking_id
      WHERE ${isNumeric ? 'b.id = ?' : 'b.booking_ref = ?'}
    `;

    const [rows] = await pool.query(query, [identifier]);

    if (rows.length === 0) {
      const error = new Error(`Booking '${identifier}' not found.`);
      error.statusCode = 404;
      return next(error);
    }

    const b = rows[0];

    // IDOR Protection: verify user is either the customer or the facility owner
    const isCustomer = req.user && req.user.id === b.customer_id;
    const isFacilityOwner = req.user && req.user.role === 'owner' && req.user.id === b.owner_id;
    if (!isCustomer && !isFacilityOwner) {
      const error = new Error('Access denied. You do not have permission to view this reservation.');
      error.statusCode = 403;
      return next(error);
    }
    const now = new Date().getTime();
    const end = new Date(b.end_time).getTime();
    const remainingSeconds = Math.max(0, Math.floor((end - now) / 1000));

    const ownerUpi = (b.owner_upi_id && b.owner_upi_id.trim()) || `owner${b.owner_id || 1}@okhdfcbank`;
    const ownerName = (b.owner_upi_name && b.owner_upi_name.trim()) || (b.owner_name && b.owner_name.trim()) || `${b.location_name} Parking`;
    const upiUri = `upi://pay?pa=${encodeURIComponent(ownerUpi)}&pn=${encodeURIComponent(ownerName)}&am=${parseFloat(b.total_amount).toFixed(2)}&cu=INR&tn=${encodeURIComponent(b.booking_ref)}`;

    res.json({
      success: true,
      data: {
        id: b.id,
        bookingRef: b.booking_ref,
        customerId: b.customer_id,
        vehicleNumber: b.vehicle_number,
        driverName: b.driver_name,
        driverPhone: b.driver_phone,
        slotId: b.slot_id,
        slotNo: b.slot_no,
        slotType: b.slot_type,
        bayRow: b.bay_row,
        bayColumn: b.bay_column,
        locationId: b.location_id,
        locationName: b.location_name,
        address: b.address,
        area: b.area,
        city: b.city,
        latitude: parseFloat(b.latitude),
        longitude: parseFloat(b.longitude),
        startTime: b.start_time,
        endTime: b.end_time,
        remainingSeconds,
        durationHours: b.duration_hours,
        hourlyRate: parseFloat(b.hourly_rate_applied),
        totalAmount: parseFloat(b.total_amount),
        extensionCount: b.extension_count,
        status: b.booking_status,
        paymentStatus: b.payment_status || 'pending',
        paymentMethod: b.payment_method || 'upi',
        transactionRef: b.transaction_reference,
        customerUtr: b.customer_utr,
        confirmedBy: b.confirmed_by,
        confirmedAt: b.confirmed_at,
        ownerUpiId: ownerUpi,
        ownerUpiName: ownerName,
        ownerUpiDesc: b.owner_upi_desc,
        upiUri,
        payment: {
          amount: parseFloat(b.total_amount),
          status: b.payment_status || 'pending',
          method: b.payment_method || 'upi',
          transactionRef: b.transaction_reference,
          customerUtr: b.customer_utr,
          confirmedBy: b.confirmed_by,
          confirmedAt: b.confirmed_at,
          ownerUpiId: ownerUpi,
          ownerUpiName: ownerName,
          bookingRef: b.booking_ref,
          upiUri
        },
        createdAt: b.created_at,
        directions: `Drive to ${b.address}, ${b.area}. Follow Driveway to Row ${b.bay_row}, Bay ${b.slot_no}.`
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/bookings/:id/confirm-payment (Space Owner manually confirms verified UPI receipt)
 */
async function confirmPayment(req, res, next) {
  try {
    const bookingId = parseInt(req.params.id, 10);
    const ownerId = req.user.id;

    if (isNaN(bookingId)) {
      const error = new Error('Invalid booking ID.');
      error.statusCode = 400;
      return next(error);
    }

    const [rows] = await pool.query(
      `SELECT b.id, b.booking_ref, b.driver_name, b.customer_id, b.total_amount,
              l.owner_id, l.name AS location_name,
              p.id AS payment_id, p.status AS payment_status, p.customer_utr
       FROM bookings b
       INNER JOIN parking_locations l ON b.parking_location_id = l.id
       LEFT JOIN payments p ON b.id = p.booking_id
       WHERE b.id = ?`,
      [bookingId]
    );

    if (rows.length === 0) {
      const error = new Error(`Booking #${bookingId} not found.`);
      error.statusCode = 404;
      return next(error);
    }

    const booking = rows[0];

    // Ownership Authorization Check: An owner can only confirm payments for their own locations
    if (booking.owner_id !== ownerId) {
      const error = new Error('Access denied. You can only confirm payments for your own parking facilities.');
      error.statusCode = 403;
      return next(error);
    }

    if (booking.payment_status === 'paid') {
      return res.json({
        success: true,
        message: 'Payment is already confirmed as paid.',
        paymentStatus: 'paid'
      });
    }

    await pool.query(
      `UPDATE payments 
       SET status = 'paid', 
           paid_at = UTC_TIMESTAMP(), 
           confirmed_by = ?, 
           confirmed_at = UTC_TIMESTAMP() 
       WHERE booking_id = ?`,
      [ownerId, bookingId]
    );

    // Notify customer that their UPI transfer has been confirmed
    if (booking.customer_id) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type) 
         VALUES (?, 'Payment Confirmed ✓', ?, 'payment')`,
        [
          booking.customer_id,
          `The parking owner has verified your UPI payment of ₹${parseFloat(booking.total_amount).toFixed(2)} for reservation ${booking.booking_ref}.`
        ]
      );
    }

    res.json({
      success: true,
      message: `Payment for booking ${booking.booking_ref} confirmed successfully.`,
      paymentStatus: 'paid',
      confirmedBy: ownerId,
      confirmedAt: new Date()
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/bookings/:id/submit-utr (Customer records their UPI transaction reference / UTR)
 */
async function submitCustomerUtr(req, res, next) {
  try {
    const bookingId = parseInt(req.params.id, 10);
    const userId = req.user.id;
    const { utr } = req.body;

    if (isNaN(bookingId)) {
      const error = new Error('Invalid booking ID.');
      error.statusCode = 400;
      return next(error);
    }

    if (!utr || typeof utr !== 'string' || !/^[a-zA-Z0-9_\-]{6,35}$/.test(utr.trim())) {
      const error = new Error('Please provide a valid UPI Reference / UTR number (6-35 alphanumeric characters).');
      error.statusCode = 400;
      return next(error);
    }

    const cleanUtr = utr.trim().toUpperCase();

    const [rows] = await pool.query(
      `SELECT b.id, b.booking_ref, b.customer_id, l.owner_id, l.name AS location_name,
              p.id AS payment_id, p.status AS payment_status
       FROM bookings b
       INNER JOIN parking_locations l ON b.parking_location_id = l.id
       LEFT JOIN payments p ON b.id = p.booking_id
       WHERE b.id = ?`,
      [bookingId]
    );

    if (rows.length === 0) {
      const error = new Error(`Booking #${bookingId} not found.`);
      error.statusCode = 404;
      return next(error);
    }

    const booking = rows[0];

    // Authorization: User must be the customer of this booking or an owner
    if (booking.customer_id !== userId && req.user.role !== 'owner') {
      const error = new Error('Access denied. You can only submit payment details for your own booking.');
      error.statusCode = 403;
      return next(error);
    }

    await pool.query(
      `UPDATE payments 
       SET customer_utr = ? 
       WHERE booking_id = ?`,
      [cleanUtr, bookingId]
    );

    // Notify the space owner
    if (booking.owner_id) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type) 
         VALUES (?, 'Customer Submitted Payment UTR', ?, 'payment')`,
        [
          booking.owner_id,
          `Customer submitted UPI Reference ${cleanUtr} for booking ${booking.booking_ref}. Please verify in your bank app.`
        ]
      );
    }

    res.json({
      success: true,
      message: 'UPI transaction reference submitted successfully. Space owner will verify.',
      customerUtr: cleanUtr
    });
  } catch (error) {
    next(error);
  }
}


/**
 * GET /api/bookings/:idOrRef/qr-pass
 * Returns the QR pass token for a customer's own booking
 * The token is re-generated (a new one) each time — but validated against the stored hash
 */
async function getBookingQrPass(req, res, next) {
  try {
    const identifier = req.params.idOrRef;
    const isNumeric = /^\d+$/.test(identifier);

    if (!req.user || !req.user.id) {
      const error = new Error('Authentication required.');
      error.statusCode = 401;
      return next(error);
    }

    const [rows] = await pool.query(
      `SELECT b.id, b.booking_ref, b.customer_id, b.booking_status, b.qr_pass_token_hash, b.qr_pass_status,
              b.vehicle_number, b.driver_name, b.start_time, b.end_time, b.duration_hours, b.total_amount,
              s.slot_no, s.slot_type, l.id AS location_id, l.name AS location_name, l.address, l.area, l.owner_id
       FROM bookings b
       INNER JOIN parking_slots s ON b.parking_slot_id = s.id
       INNER JOIN parking_locations l ON b.parking_location_id = l.id
       WHERE ${isNumeric ? 'b.id = ?' : 'b.booking_ref = ?'}`,
      [identifier]
    );

    if (rows.length === 0) {
      const error = new Error('Booking not found.');
      error.statusCode = 404;
      return next(error);
    }

    const booking = rows[0];

    // Authorization: only the booking customer or the facility owner can access QR pass
    const isCustomer = req.user.id === booking.customer_id;
    const isFacilityOwner = req.user.role === 'owner' && req.user.id === booking.owner_id;
    if (!isCustomer && !isFacilityOwner) {
      const error = new Error('Access denied. You can only view QR passes for your own bookings.');
      error.statusCode = 403;
      return next(error);
    }

    if (!booking.qr_pass_token_hash) {
      const error = new Error('No QR pass has been generated for this booking.');
      error.statusCode = 404;
      return next(error);
    }

    // Generate a fresh token and update the stored hash
    // This ensures single-access security — each retrieval issues a new token
    const newToken = generateQrPassToken();
    const newHash = hashQrToken(newToken);

    await pool.query(
      'UPDATE bookings SET qr_pass_token_hash = ? WHERE id = ?',
      [newHash, booking.id]
    );

    // Build secure validation URL
    const validationPayload = JSON.stringify({
      token: newToken,
      ref: booking.booking_ref,
      bid: booking.id
    });

    res.json({
      success: true,
      data: {
        bookingId: booking.id,
        bookingRef: booking.booking_ref,
        qrPayload: validationPayload,
        qrPassStatus: booking.qr_pass_status,
        bookingStatus: booking.booking_status,
        vehicleNumber: booking.vehicle_number,
        driverName: booking.driver_name,
        slotNo: booking.slot_no,
        slotType: booking.slot_type,
        locationName: booking.location_name,
        address: booking.address,
        area: booking.area,
        startTime: booking.start_time,
        endTime: booking.end_time,
        durationHours: booking.duration_hours,
        totalAmount: parseFloat(booking.total_amount)
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/bookings/validate-pass
 * Validates a QR pass token for parking entry (Owner/Staff only)
 * Atomic validation to prevent duplicate scans
 */
async function validateQrPass(req, res, next) {
  try {
    if (!req.user || req.user.role !== 'owner') {
      const error = new Error('Only authorized facility owners can validate parking passes.');
      error.statusCode = 403;
      return next(error);
    }

    let { token, ref, bookingRef, code, bid } = req.body;

    // Handle scanned string that might be JSON string
    if (token && typeof token === 'string' && token.startsWith('{')) {
      try {
        const parsed = JSON.parse(token);
        if (parsed.token) token = parsed.token;
        if (parsed.ref && !ref) ref = parsed.ref;
      } catch (e) {
        // use token as-is
      }
    }

    // Support generic code input from scanner / manual entry
    if (!token && !ref && !bookingRef && code) {
      if (typeof code === 'string' && code.startsWith('{')) {
        try {
          const parsed = JSON.parse(code);
          token = parsed.token;
          ref = parsed.ref;
        } catch (e) {
          ref = code;
        }
      } else if (typeof code === 'string' && code.length > 30) {
        token = code;
      } else {
        ref = code;
      }
    }

    if (!token && !ref && !bookingRef) {
      const error = new Error('QR pass token or booking reference is required.');
      error.statusCode = 400;
      return next(error);
    }

    const result = await withTransaction(async (connection) => {
      let rows;
      if (token) {
        const tokenHash = hashQrToken(token);
        [rows] = await connection.query(
          `SELECT b.id, b.booking_ref, b.customer_id, b.booking_status, b.qr_pass_status,
                  b.qr_pass_token_hash, b.vehicle_number, b.driver_name, b.driver_phone,
                  b.start_time, b.end_time, b.duration_hours, b.total_amount,
                  b.qr_validated_at,
                  s.slot_no, s.slot_type,
                  l.id AS location_id, l.name AS location_name, l.area, l.owner_id
           FROM bookings b
           INNER JOIN parking_slots s ON b.parking_slot_id = s.id
           INNER JOIN parking_locations l ON b.parking_location_id = l.id
           WHERE b.qr_pass_token_hash = ?
           FOR UPDATE`,
          [tokenHash]
        );
      } else {
        const targetRef = (ref || bookingRef).trim().toUpperCase();
        [rows] = await connection.query(
          `SELECT b.id, b.booking_ref, b.customer_id, b.booking_status, b.qr_pass_status,
                  b.qr_pass_token_hash, b.vehicle_number, b.driver_name, b.driver_phone,
                  b.start_time, b.end_time, b.duration_hours, b.total_amount,
                  b.qr_validated_at,
                  s.slot_no, s.slot_type,
                  l.id AS location_id, l.name AS location_name, l.area, l.owner_id
           FROM bookings b
           INNER JOIN parking_slots s ON b.parking_slot_id = s.id
           INNER JOIN parking_locations l ON b.parking_location_id = l.id
           WHERE b.booking_ref = ?
           FOR UPDATE`,
          [targetRef]
        );
      }

      if (rows.length === 0) {
        return {
          valid: false,
          reason: 'invalid',
          message: 'Invalid QR pass code. No matching reservation found.'
        };
      }

      const booking = rows[0];

      // Verify this owner has authority over this facility
      if (booking.owner_id !== req.user.id) {
        return {
          valid: false,
          reason: 'wrong_facility',
          message: 'This reservation belongs to a different parking facility. You are not authorized to validate it.'
        };
      }

      // Check booking status
      if (booking.booking_status === 'cancelled') {
        return {
          valid: false,
          reason: 'cancelled',
          message: `Reservation ${booking.booking_ref} has been cancelled.`,
          bookingRef: booking.booking_ref
        };
      }

      if (booking.booking_status === 'completed') {
        return {
          valid: false,
          reason: 'completed',
          message: `Reservation ${booking.booking_ref} is already completed.`,
          bookingRef: booking.booking_ref
        };
      }

      if (booking.booking_status === 'expired') {
        return {
          valid: false,
          reason: 'expired',
          message: `Reservation ${booking.booking_ref} has expired.`,
          bookingRef: booking.booking_ref
        };
      }

      // Check QR pass status
      if (booking.qr_pass_status === 'used') {
        return {
          valid: false,
          reason: 'already_used',
          message: `QR pass for ${booking.booking_ref} has already been used for entry at ${new Date(booking.qr_validated_at).toLocaleString()}.`,
          bookingRef: booking.booking_ref,
          validatedAt: booking.qr_validated_at
        };
      }

      if (booking.qr_pass_status === 'revoked') {
        return {
          valid: false,
          reason: 'revoked',
          message: `QR pass for ${booking.booking_ref} has been revoked.`,
          bookingRef: booking.booking_ref
        };
      }

      // Check time validity
      const now = new Date();
      const startTime = new Date(booking.start_time);
      const endTime = new Date(booking.end_time);

      // Allow entry up to 30 minutes before start time
      const earlyEntryWindow = new Date(startTime.getTime() - 30 * 60 * 1000);

      if (now < earlyEntryWindow) {
        return {
          valid: false,
          reason: 'not_yet_valid',
          message: `Reservation ${booking.booking_ref} is not yet valid. Entry opens at ${startTime.toLocaleTimeString()}.`,
          bookingRef: booking.booking_ref,
          validFrom: booking.start_time
        };
      }

      // Allow entry up to 30 minutes after end time (grace period)
      const graceEndTime = new Date(endTime.getTime() + 30 * 60 * 1000);
      if (now > graceEndTime) {
        // Mark as expired
        await connection.query(
          `UPDATE bookings SET qr_pass_status = 'expired', booking_status = 'expired', updated_at = NOW() WHERE id = ?`,
          [booking.id]
        );
        return {
          valid: false,
          reason: 'expired',
          message: `Reservation ${booking.booking_ref} has expired. Session ended at ${endTime.toLocaleTimeString()}.`,
          bookingRef: booking.booking_ref
        };
      }

      // ✅ VALID — Atomically mark as used
      await connection.query(
        `UPDATE bookings 
         SET qr_pass_status = 'used', 
             qr_validated_at = NOW(), 
             qr_validated_by = ?,
             check_in_time = COALESCE(check_in_time, NOW()),
             updated_at = NOW() 
         WHERE id = ?`,
        [req.user.id, booking.id]
      );

      // Notify the customer
      if (booking.customer_id) {
        await connection.query(
          `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'booking')`,
          [
            booking.customer_id,
            'Entry Validated ✓',
            `Your parking pass for Bay ${booking.slot_no} at ${booking.location_name} has been validated. Welcome!`
          ]
        );
      }

      return {
        valid: true,
        reason: 'valid',
        message: `✓ Valid reservation! ${booking.driver_name} — Bay ${booking.slot_no} at ${booking.location_name}.`,
        bookingRef: booking.booking_ref,
        booking: {
          id: booking.id,
          bookingRef: booking.booking_ref,
          driverName: booking.driver_name,
          driverPhone: booking.driver_phone,
          vehicleNumber: booking.vehicle_number,
          slotNo: booking.slot_no,
          slotType: booking.slot_type,
          locationName: booking.location_name,
          area: booking.area,
          startTime: booking.start_time,
          endTime: booking.end_time,
          durationHours: booking.duration_hours,
          totalAmount: parseFloat(booking.total_amount),
          validatedAt: new Date()
        }
      };
    });

    const statusCode = result.valid ? 200 : (result.reason === 'invalid' ? 404 : 400);

    res.status(statusCode).json({
      success: result.valid,
      ...result
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createBooking,
  extendBooking,
  cancelBooking,
  updateBookingStatus,
  getActiveCarLocation,
  getMyBookings,
  getCustomerExpenses,
  getOwnerBookings,
  getBookingByIdOrRef,
  getBookingQrPass,
  validateQrPass,
  confirmPayment,
  submitCustomerUtr
};

