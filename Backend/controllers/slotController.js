const { pool } = require('../config/db');

/**
 * GET /api/slots
 * Fetch parking slots with optional filtering by location_id, status, or slot_type
 */
async function getAllSlots(req, res, next) {
  try {
    const { location_id, status, slot_type } = req.query;

    let query = `
      SELECT 
        s.id,
        s.parking_location_id AS location_id,
        s.slot_no,
        s.slot_type,
        s.bay_row,
        s.bay_column,
        s.status,
        s.updated_at,
        l.name AS location_name,
        l.area,
        l.hourly_rate
      FROM parking_slots s
      INNER JOIN parking_locations l ON s.parking_location_id = l.id
      WHERE 1=1
    `;

    const params = [];

    if (location_id) {
      query += ' AND s.parking_location_id = ?';
      params.push(parseInt(location_id, 10));
    }

    if (status) {
      query += ' AND s.status = ?';
      params.push(status.toLowerCase());
    }

    if (slot_type) {
      query += ' AND s.slot_type = ?';
      params.push(slot_type.toLowerCase());
    }

    query += ' ORDER BY s.parking_location_id ASC, s.bay_row ASC, s.bay_column ASC, s.slot_no ASC';

    const [slots] = await pool.query(query, params);

    res.json({
      success: true,
      message: 'Slots retrieved successfully',
      count: slots.length,
      data: slots.map(s => ({
        id: s.id,
        locationId: s.location_id,
        locationName: s.location_name,
        area: s.area,
        slotNo: s.slot_no,
        slotType: s.slot_type,
        bayRow: s.bay_row,
        bayColumn: s.bay_column,
        status: s.status,
        hourlyRate: parseFloat(s.hourly_rate),
        updatedAt: s.updated_at
      }))
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/slots/:id
 */
async function getSlotById(req, res, next) {
  try {
    const slotId = req.params.id;

    const query = `
      SELECT 
        s.id,
        s.parking_location_id AS location_id,
        s.slot_no,
        s.slot_type,
        s.bay_row,
        s.bay_column,
        s.status,
        s.updated_at,
        l.name AS location_name,
        l.area,
        l.hourly_rate,
        b.id AS active_booking_id,
        b.booking_ref,
        b.vehicle_number,
        b.driver_name,
        b.start_time,
        b.end_time
      FROM parking_slots s
      INNER JOIN parking_locations l ON s.parking_location_id = l.id
      LEFT JOIN bookings b ON s.id = b.parking_slot_id AND b.booking_status = 'active'
      WHERE s.id = ?
    `;

    const [rows] = await pool.query(query, [slotId]);

    if (rows.length === 0) {
      const error = new Error(`Parking slot #${slotId} not found.`);
      error.statusCode = 404;
      return next(error);
    }

    const slot = rows[0];

    res.json({
      success: true,
      data: {
        id: slot.id,
        locationId: slot.location_id,
        locationName: slot.location_name,
        area: slot.area,
        slotNo: slot.slot_no,
        slotType: slot.slot_type,
        bayRow: slot.bay_row,
        bayColumn: slot.bay_column,
        status: slot.status,
        hourlyRate: parseFloat(slot.hourly_rate),
        updatedAt: slot.updated_at,
        currentBooking: slot.active_booking_id ? {
          bookingId: slot.active_booking_id,
          bookingRef: slot.booking_ref,
          vehicleNumber: slot.vehicle_number,
          driverName: slot.driver_name,
          startTime: slot.start_time,
          endTime: slot.end_time
        } : null
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/slots/:id/status
 * Update slot status (Available / Reserved / Occupied / Maintenance)
 */
async function updateSlotStatus(req, res, next) {
  try {
    const slotId = req.params.id;
    const { status } = req.body;

    const validStatuses = ['available', 'reserved', 'occupied', 'maintenance'];
    if (!validStatuses.includes(status)) {
      const error = new Error(`Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}`);
      error.statusCode = 400;
      return next(error);
    }

    // Check slot existence and ownership if user is owner
    const [slotRows] = await pool.query(`
      SELECT s.id, s.slot_no, s.parking_location_id, l.owner_id 
      FROM parking_slots s
      INNER JOIN parking_locations l ON s.parking_location_id = l.id
      WHERE s.id = ?
    `, [slotId]);

    if (slotRows.length === 0) {
      const error = new Error(`Slot #${slotId} not found.`);
      error.statusCode = 404;
      return next(error);
    }

    if (req.user && req.user.role === 'owner' && slotRows[0].owner_id !== req.user.id) {
      const error = new Error('Unauthorized. You can only update slots in your own parking locations.');
      error.statusCode = 403;
      return next(error);
    }

    await pool.query(
      'UPDATE parking_slots SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, slotId]
    );

    res.json({
      success: true,
      message: `Slot ${slotRows[0].slot_no} status updated to ${status}.`,
      data: { slotId: parseInt(slotId, 10), status }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/slots (Owner-only)
 * Add a new slot to a location
 */
async function addSlot(req, res, next) {
  try {
    const { location_id, slot_no, slot_type = 'standard', bay_row = 1, bay_column = 1 } = req.body;

    const [loc] = await pool.query('SELECT owner_id FROM parking_locations WHERE id = ?', [location_id]);
    if (loc.length === 0) {
      const error = new Error(`Parking location #${location_id} not found.`);
      error.statusCode = 404;
      return next(error);
    }

    if (loc[0].owner_id !== req.user.id) {
      const error = new Error('Unauthorized to modify this location.');
      error.statusCode = 403;
      return next(error);
    }

    const [result] = await pool.query(`
      INSERT INTO parking_slots (parking_location_id, slot_no, slot_type, bay_row, bay_column, status)
      VALUES (?, ?, ?, ?, ?, 'available')
    `, [location_id, slot_no.trim(), slot_type, bay_row, bay_column]);

    // Update location total_capacity count
    await pool.query(`
      UPDATE parking_locations 
      SET total_capacity = (SELECT COUNT(id) FROM parking_slots WHERE parking_location_id = ?)
      WHERE id = ?
    `, [location_id, location_id]);

    res.status(201).json({
      success: true,
      message: `Slot ${slot_no} added successfully.`,
      data: { id: result.insertId, slotNo: slot_no, slotType: slot_type }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllSlots,
  getSlotById,
  updateSlotStatus,
  addSlot
};
