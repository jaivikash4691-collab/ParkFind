const { pool, withTransaction } = require('../config/db');

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
      WHERE booking_status = 'active' AND end_time < DATE_SUB(NOW(), INTERVAL 30 MINUTE)
    `);

    for (const b of expired) {
      await withTransaction(async (conn) => {
        await conn.query(
          `UPDATE bookings SET booking_status = 'completed', updated_at = NOW() WHERE id = ?`,
          [b.id]
        );
        await conn.query(
          `UPDATE parking_slots SET status = 'available', updated_at = NOW() WHERE id = ?`,
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
    const {
      slot_id,
      duration_hours,
      vehicle_number,
      driver_name,
      driver_phone,
      payment_method = 'upi'
    } = req.body;

    const customerId = req.user ? req.user.id : null;

    const bookingResult = await withTransaction(async (connection) => {
      // 1. Pessimistic Row Lock: Lock the selected slot and join location
      const [slotRows] = await connection.query(
        `SELECT s.id, s.parking_location_id, s.slot_no, s.slot_type, s.bay_row, s.bay_column, s.status,
                l.name AS location_name, l.address, l.area, l.city, l.hourly_rate, l.latitude, l.longitude,
                l.owner_id, l.status AS location_status
         FROM parking_slots s
         INNER JOIN parking_locations l ON s.parking_location_id = l.id
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

      // 6. Insert Demo Payment record
      await connection.query(
        `INSERT INTO payments (
          booking_id, amount, status, payment_method, transaction_reference, paid_at, created_at
        ) VALUES (?, ?, 'paid', ?, ?, NOW(), NOW())`,
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
            'Booking Confirmed!',
            `Your spot ${slot.slot_no} at ${slot.location_name} is reserved. Paid ₹${totalAmount.toFixed(2)}.`
          ]
        );
      }

      if (slot.owner_id) {
        await connection.query(
          `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'booking')`,
          [
            slot.owner_id,
            'New Customer Booking',
            `${driver_name} booked Bay ${slot.slot_no} at ${slot.location_name} (${vehicle_number}) for ${duration}h. Received ₹${totalAmount.toFixed(2)}.`
          ]
        );
      }

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
        paymentStatus: 'paid',
        bookingStatus: 'active',
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
    await syncExpiredSessions();

    const userId = req.user ? req.user.id : null;
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
        p.status AS payment_status,
        p.transaction_reference,
        r.id AS review_id,
        r.rating AS review_rating
      FROM bookings b
      INNER JOIN parking_slots s ON b.parking_slot_id = s.id
      INNER JOIN parking_locations l ON b.parking_location_id = l.id
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
        paymentStatus: b.payment_status || 'paid',
        transactionRef: b.transaction_reference,
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
        p.transaction_reference
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
        paymentStatus: b.payment_status || 'paid',
        paymentMethod: b.payment_method || 'upi',
        transactionRef: b.transaction_reference,
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
        p.status AS payment_status,
        p.payment_method,
        p.transaction_reference
      FROM bookings b
      INNER JOIN parking_slots s ON b.parking_slot_id = s.id
      INNER JOIN parking_locations l ON b.parking_location_id = l.id
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
    const now = new Date().getTime();
    const end = new Date(b.end_time).getTime();
    const remainingSeconds = Math.max(0, Math.floor((end - now) / 1000));

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
        paymentStatus: b.payment_status || 'paid',
        paymentMethod: b.payment_method || 'upi',
        transactionRef: b.transaction_reference,
        createdAt: b.created_at,
        directions: `Drive to ${b.address}, ${b.area}. Follow Driveway to Row ${b.bay_row}, Bay ${b.slot_no}.`
      }
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
  getOwnerBookings,
  getBookingByIdOrRef
};
