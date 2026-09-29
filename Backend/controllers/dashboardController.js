const { pool } = require('../config/db');

/**
 * GET /api/dashboard/stats
 * Provides comprehensive statistics for customer discovery or owner business management
 */
async function getSummaryStats(req, res, next) {
  try {
    const isOwner = req.user && req.user.role === 'owner';
    const ownerId = isOwner ? req.user.id : null;

    // 1. Overall Marketplace Metrics
    const [[slotStats]] = await pool.query(`
      SELECT 
        COUNT(id) AS total_slots,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) AS available_slots,
        SUM(CASE WHEN status = 'reserved' THEN 1 ELSE 0 END) AS reserved_slots,
        SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) AS occupied_slots,
        SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) AS maintenance_slots
      FROM parking_slots
    `);

    const [[locationStats]] = await pool.query(`
      SELECT 
        COUNT(id) AS total_locations,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open_locations
      FROM parking_locations
    `);

    const [[bookingStats]] = await pool.query(`
      SELECT 
        COUNT(id) AS total_bookings,
        SUM(CASE WHEN booking_status = 'active' THEN 1 ELSE 0 END) AS active_bookings,
        SUM(CASE WHEN booking_status = 'completed' THEN 1 ELSE 0 END) AS completed_bookings,
        SUM(CASE WHEN booking_status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_bookings,
        COALESCE(SUM(CASE WHEN booking_status IN ('active', 'completed') THEN total_amount ELSE 0 END), 0) AS total_revenue
      FROM bookings
    `);

    // 2. Area breakdown across Coimbatore
    const [areaBreakdown] = await pool.query(`
      SELECT 
        l.area,
        COUNT(DISTINCT l.id) AS location_count,
        COUNT(s.id) AS total_slots,
        SUM(CASE WHEN s.status = 'available' THEN 1 ELSE 0 END) AS available_slots,
        ROUND((SUM(CASE WHEN s.status != 'available' THEN 1 ELSE 0 END) / NULLIF(COUNT(s.id), 0)) * 100, 1) AS occupancy_pct
      FROM parking_locations l
      LEFT JOIN parking_slots s ON l.id = s.parking_location_id
      WHERE l.status = 'open'
      GROUP BY l.area
      ORDER BY location_count DESC
    `);

    let ownerStats = null;

    // 3. Owner-Specific Business Data if logged in as Owner
    if (isOwner) {
      const [ownerLocs] = await pool.query(`
        SELECT 
          l.id,
          l.name,
          l.area,
          l.hourly_rate,
          COUNT(s.id) AS total_slots,
          SUM(CASE WHEN s.status = 'available' THEN 1 ELSE 0 END) AS available_slots,
          SUM(CASE WHEN s.status != 'available' THEN 1 ELSE 0 END) AS occupied_slots,
          COALESCE((SELECT SUM(b.total_amount) FROM bookings b WHERE b.parking_location_id = l.id AND b.booking_status IN ('active', 'completed')), 0) AS earnings,
          (SELECT COUNT(b.id) FROM bookings b WHERE b.parking_location_id = l.id AND b.booking_status = 'active') AS active_sessions
        FROM parking_locations l
        LEFT JOIN parking_slots s ON l.id = s.parking_location_id
        WHERE l.owner_id = ?
        GROUP BY l.id
      `, [ownerId]);

      const [recentBookings] = await pool.query(`
        SELECT 
          b.id, b.booking_ref, b.driver_name, b.driver_phone, b.vehicle_number,
          b.start_time, b.end_time, b.duration_hours, b.total_amount, b.booking_status,
          s.slot_no, l.name AS location_name, p.status AS payment_status
        FROM bookings b
        INNER JOIN parking_slots s ON b.parking_slot_id = s.id
        INNER JOIN parking_locations l ON b.parking_location_id = l.id
        LEFT JOIN payments p ON b.id = p.booking_id
        WHERE l.owner_id = ?
        ORDER BY b.created_at DESC
        LIMIT 5
      `, [ownerId]);

      const ownerTotalSlots = ownerLocs.reduce((acc, l) => acc + parseInt(l.total_slots, 10), 0);
      const ownerAvailableSlots = ownerLocs.reduce((acc, l) => acc + parseInt(l.available_slots, 10), 0);
      const ownerActiveSessions = ownerLocs.reduce((acc, l) => acc + parseInt(l.active_sessions, 10), 0);
      const ownerTotalEarnings = ownerLocs.reduce((acc, l) => acc + parseFloat(l.earnings), 0);

      ownerStats = {
        totalLocations: ownerLocs.length,
        totalSlots: ownerTotalSlots,
        availableSlots: ownerAvailableSlots,
        occupiedSlots: ownerTotalSlots - ownerAvailableSlots,
        occupancyPercentage: ownerTotalSlots > 0 ? Math.round(((ownerTotalSlots - ownerAvailableSlots) / ownerTotalSlots) * 100) : 0,
        activeBookings: ownerActiveSessions,
        totalEarnings: ownerTotalEarnings,
        locations: ownerLocs,
        recentBookings
      };
    }

    const totalSlots = parseInt(slotStats.total_slots, 10) || 0;
    const availableSlots = parseInt(slotStats.available_slots, 10) || 0;
    const reservedSlots = parseInt(slotStats.reserved_slots, 10) || 0;
    const occupiedSlots = parseInt(slotStats.occupied_slots, 10) || 0;
    const takenSlots = reservedSlots + occupiedSlots;
    const overallOccupancy = totalSlots > 0 ? Math.round((takenSlots / totalSlots) * 100) : 0;

    res.json({
      success: true,
      data: {
        totalLocations: parseInt(locationStats.total_locations, 10) || 0,
        openLocations: parseInt(locationStats.open_locations, 10) || 0,
        totalSlots,
        availableSlots,
        reservedSlots,
        occupiedSlots,
        maintenanceSlots: parseInt(slotStats.maintenance_slots, 10) || 0,
        occupancyPercentage: overallOccupancy,
        totalBookings: parseInt(bookingStats.total_bookings, 10) || 0,
        activeBookings: parseInt(bookingStats.active_bookings, 10) || 0,
        completedBookings: parseInt(bookingStats.completed_bookings, 10) || 0,
        totalRevenue: parseFloat(bookingStats.total_revenue) || 0,
        areaBreakdown: areaBreakdown.map(a => ({
          area: a.area,
          locations: parseInt(a.location_count, 10),
          totalSlots: parseInt(a.total_slots, 10),
          availableSlots: parseInt(a.available_slots, 10),
          occupancyPct: parseFloat(a.occupancy_pct) || 0
        })),
        ownerStats
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSummaryStats
};
