const { pool } = require('../config/db');

/**
 * GET /api/zones
 * Fetch all parking zones with live availability metrics and occupancy calculations
 */
async function getAllZones(req, res, next) {
  try {
    const query = `
      SELECT 
        z.id,
        z.zone_code,
        z.zone_name,
        z.location,
        z.floor_level,
        z.hourly_rate,
        z.total_slots,
        z.description,
        z.is_active,
        COUNT(s.id) AS total_slots_count,
        SUM(CASE WHEN s.status = 'available' THEN 1 ELSE 0 END) AS available_slots,
        SUM(CASE WHEN s.status = 'reserved' THEN 1 ELSE 0 END) AS reserved_slots,
        SUM(CASE WHEN s.status = 'occupied' THEN 1 ELSE 0 END) AS occupied_slots,
        SUM(CASE WHEN s.status = 'maintenance' THEN 1 ELSE 0 END) AS maintenance_slots,
        ROUND((SUM(CASE WHEN s.status != 'available' THEN 1 ELSE 0 END) / NULLIF(COUNT(s.id), 0)) * 100, 1) AS occupancy_rate
      FROM zones z
      LEFT JOIN parking_slots s ON z.id = s.zone_id
      WHERE z.is_active = TRUE
      GROUP BY z.id, z.zone_code, z.zone_name, z.location, z.floor_level, z.hourly_rate, z.total_slots, z.description, z.is_active
      ORDER BY z.id ASC
    `;

    const [rows] = await pool.query(query);

    const zones = rows.map(zone => ({
      id: zone.id,
      code: zone.zone_code,
      name: zone.zone_name,
      location: zone.location,
      floorLevel: zone.floor_level,
      hourlyRate: parseFloat(zone.hourly_rate),
      totalSlots: parseInt(zone.total_slots_count, 10) || zone.total_slots,
      availableSlots: parseInt(zone.available_slots, 10) || 0,
      reservedSlots: parseInt(zone.reserved_slots, 10) || 0,
      occupiedSlots: parseInt(zone.occupied_slots, 10) || 0,
      maintenanceSlots: parseInt(zone.maintenance_slots, 10) || 0,
      occupancyRate: parseFloat(zone.occupancy_rate) || 0,
      description: zone.description,
      isFull: (parseInt(zone.available_slots, 10) || 0) === 0
    }));

    res.json({
      success: true,
      message: 'Parking zones retrieved successfully',
      data: zones
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/zones/:id
 * Fetch a single zone along with all its slots
 */
async function getZoneById(req, res, next) {
  try {
    const zoneId = req.params.id;

    const [zoneRows] = await pool.query(
      `SELECT id, zone_code, zone_name, location, floor_level, hourly_rate, total_slots, description 
       FROM zones WHERE id = ? AND is_active = TRUE`,
      [zoneId]
    );

    if (zoneRows.length === 0) {
      const error = new Error(`Parking zone with ID ${zoneId} was not found.`);
      error.statusCode = 404;
      return next(error);
    }

    const zone = zoneRows[0];

    const [slots] = await pool.query(
      `SELECT id, slot_no, slot_type, status, updated_at 
       FROM parking_slots 
       WHERE zone_id = ? 
       ORDER BY slot_no ASC`,
      [zoneId]
    );

    const availableSlots = slots.filter(s => s.status === 'available').length;

    res.json({
      success: true,
      data: {
        id: zone.id,
        code: zone.zone_code,
        name: zone.zone_name,
        location: zone.location,
        floorLevel: zone.floor_level,
        hourlyRate: parseFloat(zone.hourly_rate),
        totalSlots: slots.length,
        availableSlots,
        occupancyRate: Math.round(((slots.length - availableSlots) / (slots.length || 1)) * 100),
        description: zone.description,
        slots
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/zones/alternates
 * Smart alternate-parking recommendation when a selected zone is full or filling fast
 */
async function getSmartAlternates(req, res, next) {
  try {
    const excludeZoneId = parseInt(req.query.currentZoneId, 10) || 0;

    const query = `
      SELECT 
        z.id,
        z.zone_code,
        z.zone_name,
        z.location,
        z.floor_level,
        z.hourly_rate,
        COUNT(s.id) AS total_slots,
        SUM(CASE WHEN s.status = 'available' THEN 1 ELSE 0 END) AS available_slots
      FROM zones z
      INNER JOIN parking_slots s ON z.id = s.zone_id
      WHERE z.is_active = TRUE AND z.id != ?
      GROUP BY z.id, z.zone_code, z.zone_name, z.location, z.floor_level, z.hourly_rate
      HAVING available_slots > 0
      ORDER BY available_slots DESC, z.hourly_rate ASC
      LIMIT 3
    `;

    const [rows] = await pool.query(query, [excludeZoneId]);

    const walkingDistanceMap = {
      'Ground Floor': '1 min walk · Elevator next to bay',
      'Level 1': '2 min walk · Escalator available',
      'Rooftop': '3 min walk · Express elevator'
    };

    const recommendations = rows.map(r => ({
      id: r.id,
      code: r.zone_code,
      name: r.zone_name,
      location: r.location,
      floorLevel: r.floor_level,
      hourlyRate: parseFloat(r.hourly_rate),
      availableSlots: parseInt(r.available_slots, 10),
      totalSlots: parseInt(r.total_slots, 10),
      travelEstimate: walkingDistanceMap[r.floor_level] || 'Short indoor walk',
      tag: parseInt(r.available_slots, 10) >= 5 ? 'High Availability' : 'Limited Spots'
    }));

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllZones,
  getZoneById,
  getSmartAlternates
};
