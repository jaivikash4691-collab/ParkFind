const { pool, withTransaction } = require('../config/db');

/**
 * Calculate Great-Circle Distance (Haversine Formula) in Kilometers
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Format distance to clean human-readable label
 */
function formatDistance(distanceKm) {
  if (distanceKm === null || isNaN(distanceKm)) return null;
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m away`;
  }
  return `${distanceKm.toFixed(1)} km away`;
}

/**
 * Check if a location is currently open based on operating hours
 */
function isLocationCurrentlyOpen(loc) {
  if (loc.status === 'closed' || loc.status === 'maintenance') return false;
  if (loc.is_24_7) return true;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [openH, openM] = (loc.opening_time || '06:00').split(':').map(Number);
  const [closeH, closeM] = (loc.closing_time || '23:00').split(':').map(Number);

  const openMinutes = openH * 60 + (openM || 0);
  const closeMinutes = closeH * 60 + (closeM || 0);

  if (closeMinutes >= openMinutes) {
    return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
  } else {
    // Over midnight
    return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
  }
}

/**
 * GET /api/locations
 * Discover & search parking locations across any city with real distance, filters & sorting
 */
async function getAllLocations(req, res, next) {
  try {
    const {
      search,
      city,
      area,
      max_price,
      has_ev,
      is_covered,
      is_24_7,
      is_accessible,
      status,
      user_lat,
      user_lng,
      sort_by = 'recommended'
    } = req.query;

    let query = `
      SELECT 
        l.id,
        l.owner_id,
        l.name,
        l.description,
        l.address,
        l.area,
        l.city,
        l.state,
        l.country,
        l.latitude,
        l.longitude,
        l.hourly_rate,
        l.total_capacity,
        l.status,
        l.opening_time,
        l.closing_time,
        l.is_covered,
        l.has_ev,
        l.has_cctv,
        l.has_security,
        l.is_24_7,
        l.is_accessible,
        l.image_url,
        l.created_at,
        u.full_name AS owner_name,
        COUNT(DISTINCT s.id) AS total_slots_count,
        SUM(CASE WHEN s.status = 'available' THEN 1 ELSE 0 END) AS available_slots,
        SUM(CASE WHEN s.status = 'reserved' THEN 1 ELSE 0 END) AS reserved_slots,
        SUM(CASE WHEN s.status = 'occupied' THEN 1 ELSE 0 END) AS occupied_slots,
        SUM(CASE WHEN s.status = 'maintenance' THEN 1 ELSE 0 END) AS maintenance_slots,
        COALESCE(AVG(r.rating), 4.8) AS avg_rating,
        COUNT(DISTINCT r.id) AS review_count
      FROM parking_locations l
      INNER JOIN users u ON l.owner_id = u.id
      LEFT JOIN parking_slots s ON l.id = s.parking_location_id
      LEFT JOIN reviews r ON l.id = r.parking_location_id
      WHERE 1=1
    `;

    const params = [];

    if (search) {
      query += ` AND (l.name LIKE ? OR l.address LIKE ? OR l.area LIKE ? OR l.city LIKE ? OR l.description LIKE ?)`;
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s, s);
    }

    if (city && city !== 'all') {
      query += ` AND l.city = ?`;
      params.push(city.trim());
    }

    if (area && area !== 'all') {
      query += ` AND l.area = ?`;
      params.push(area.trim());
    }

    if (max_price) {
      query += ` AND l.hourly_rate <= ?`;
      params.push(parseFloat(max_price));
    }

    if (has_ev === 'true' || has_ev === '1') {
      query += ` AND l.has_ev = TRUE`;
    }

    if (is_covered === 'true' || is_covered === '1') {
      query += ` AND l.is_covered = TRUE`;
    }

    if (is_24_7 === 'true' || is_24_7 === '1') {
      query += ` AND l.is_24_7 = TRUE`;
    }

    if (is_accessible === 'true' || is_accessible === '1') {
      query += ` AND l.is_accessible = TRUE`;
    }

    if (status) {
      query += ` AND l.status = ?`;
      params.push(status);
    }

    query += `
      GROUP BY 
        l.id, l.owner_id, l.name, l.description, l.address, l.area, l.city, l.state, l.country,
        l.latitude, l.longitude, l.hourly_rate, l.total_capacity, l.status,
        l.opening_time, l.closing_time, l.is_covered, l.has_ev, l.has_cctv,
        l.has_security, l.is_24_7, l.is_accessible, l.image_url, l.created_at, u.full_name
    `;

    const [rows] = await pool.query(query, params);

    const clientLat = user_lat ? parseFloat(user_lat) : null;
    const clientLng = user_lng ? parseFloat(user_lng) : null;

    let locations = rows.map(loc => {
      const totalSlots = parseInt(loc.total_slots_count, 10) || loc.total_capacity;
      const availableSlots = parseInt(loc.available_slots, 10) || 0;
      const reservedSlots = parseInt(loc.reserved_slots, 10) || 0;
      const occupiedSlots = parseInt(loc.occupied_slots, 10) || 0;
      const maintenanceSlots = parseInt(loc.maintenance_slots, 10) || 0;
      const takenSlots = reservedSlots + occupiedSlots;
      const occupancyRate = totalSlots > 0 ? Math.round((takenSlots / totalSlots) * 100) : 0;

      let distanceKm = null;
      let distanceMeters = null;
      let distanceLabel = null;

      if (clientLat !== null && clientLng !== null && !isNaN(clientLat) && !isNaN(clientLng)) {
        distanceKm = calculateHaversineDistance(clientLat, clientLng, parseFloat(loc.latitude), parseFloat(loc.longitude));
        distanceMeters = Math.round(distanceKm * 1000);
        distanceLabel = formatDistance(distanceKm);
      }

      const isOpen = isLocationCurrentlyOpen(loc);

      return {
        id: loc.id,
        ownerId: loc.owner_id,
        ownerName: loc.owner_name,
        name: loc.name,
        description: loc.description,
        address: loc.address,
        area: loc.area,
        city: loc.city,
        state: loc.state,
        country: loc.country,
        latitude: parseFloat(loc.latitude),
        longitude: parseFloat(loc.longitude),
        hourlyRate: parseFloat(loc.hourly_rate),
        totalCapacity: totalSlots,
        availableSlots,
        reservedSlots,
        occupiedSlots,
        maintenanceSlots,
        occupancyRate,
        isFull: availableSlots === 0,
        isOpen,
        status: loc.status,
        openingTime: loc.opening_time,
        closingTime: loc.closing_time,
        isCovered: Boolean(loc.is_covered),
        hasEv: Boolean(loc.has_ev),
        hasCctv: Boolean(loc.has_cctv),
        hasSecurity: Boolean(loc.has_security),
        is24x7: Boolean(loc.is_24_7),
        isAccessible: Boolean(loc.is_accessible),
        imageUrl: loc.image_url,
        rating: parseFloat(parseFloat(loc.avg_rating).toFixed(1)),
        reviewCount: parseInt(loc.review_count, 10) || 0,
        distanceKm: distanceKm !== null ? parseFloat(distanceKm.toFixed(2)) : null,
        distanceMeters,
        distanceLabel
      };
    });

    // Client-requested Sorting
    if (sort_by === 'nearest' && clientLat !== null) {
      locations.sort((a, b) => (a.distanceKm !== null ? a.distanceKm : 99999) - (b.distanceKm !== null ? b.distanceKm : 99999));
    } else if (sort_by === 'price_asc') {
      locations.sort((a, b) => a.hourlyRate - b.hourlyRate);
    } else if (sort_by === 'price_desc') {
      locations.sort((a, b) => b.hourlyRate - a.hourlyRate);
    } else if (sort_by === 'available_desc') {
      locations.sort((a, b) => b.availableSlots - a.availableSlots);
    } else if (sort_by === 'rating_desc') {
      locations.sort((a, b) => b.rating - a.rating);
    } else {
      // Recommended: high availability + good rating + open status
      locations.sort((a, b) => {
        const scoreA = (a.availableSlots * 2) + (a.rating * 5) - (a.hourlyRate * 0.2) + (a.isOpen ? 20 : 0);
        const scoreB = (b.availableSlots * 2) + (b.rating * 5) - (b.hourlyRate * 0.2) + (b.isOpen ? 20 : 0);
        return scoreB - scoreA;
      });
    }

    res.json({
      success: true,
      count: locations.length,
      data: locations
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/locations/:id
 * Retrieve a single location with its full hierarchical slot matrix, floors, rows, owner info and recent reviews
 */
async function getLocationById(req, res, next) {
  try {
    const locationId = req.params.id;

    const [locationRows] = await pool.query(`
      SELECT 
        l.*,
        u.full_name AS owner_name,
        u.phone AS owner_phone,
        u.email AS owner_email,
        COALESCE(AVG(r.rating), 4.8) AS avg_rating,
        COUNT(DISTINCT r.id) AS review_count
      FROM parking_locations l
      INNER JOIN users u ON l.owner_id = u.id
      LEFT JOIN reviews r ON l.id = r.parking_location_id
      WHERE l.id = ?
      GROUP BY l.id, u.full_name, u.phone, u.email
    `, [locationId]);

    if (locationRows.length === 0) {
      const error = new Error(`Parking location #${locationId} not found.`);
      error.statusCode = 404;
      return next(error);
    }

    const loc = locationRows[0];

    // Fetch floors
    const [floors] = await pool.query(`
      SELECT id, floor_name, floor_number 
      FROM parking_floors 
      WHERE parking_location_id = ?
      ORDER BY floor_number ASC
    `, [locationId]);

    // Fetch rows
    const [rows] = await pool.query(`
      SELECT r.id, r.floor_id, r.row_name, r.display_order
      FROM parking_rows r
      INNER JOIN parking_floors f ON r.floor_id = f.id
      WHERE f.parking_location_id = ?
      ORDER BY r.display_order ASC
    `, [locationId]);

    // Fetch individual parking slots
    const [slots] = await pool.query(`
      SELECT s.id, s.slot_no, s.slot_type, s.bay_row, s.bay_column, s.position_x, s.position_y,
             s.status, s.floor_id, s.row_id, s.updated_at,
             f.floor_name, f.floor_number, r.row_name
      FROM parking_slots s
      LEFT JOIN parking_floors f ON s.floor_id = f.id
      LEFT JOIN parking_rows r ON s.row_id = r.id
      WHERE s.parking_location_id = ?
      ORDER BY s.bay_row ASC, s.bay_column ASC, s.slot_no ASC
    `, [locationId]);

    // Fetch recent reviews
    const [reviews] = await pool.query(`
      SELECT r.id, r.rating, r.comment, r.created_at, u.full_name AS customer_name
      FROM reviews r
      INNER JOIN users u ON r.customer_id = u.id
      WHERE r.parking_location_id = ?
      ORDER BY r.created_at DESC
      LIMIT 10
    `, [locationId]);

    const availableSlots = slots.filter(s => s.status === 'available').length;
    const reservedSlots = slots.filter(s => s.status === 'reserved').length;
    const occupiedSlots = slots.filter(s => s.status === 'occupied').length;

    // Build hierarchical floor & row structure
    const hierarchicalFloors = (floors.length > 0 ? floors : [{ id: null, floor_name: 'Main Deck', floor_number: 0 }]).map(floor => {
      const floorRows = rows.filter(r => r.floor_id === floor.id);
      const floorSlots = slots.filter(s => s.floor_id === floor.id || (floor.id === null && s.floor_id === null));
      return {
        id: floor.id,
        floorName: floor.floor_name,
        floorNumber: floor.floor_number,
        rows: floorRows.map(row => ({
          id: row.id,
          rowName: row.row_name,
          displayOrder: row.display_order,
          slots: floorSlots.filter(s => s.row_id === row.id)
        })),
        slots: floorSlots
      };
    });

    res.json({
      success: true,
      data: {
        id: loc.id,
        ownerId: loc.owner_id,
        ownerName: loc.owner_name,
        name: loc.name,
        description: loc.description,
        address: loc.address,
        area: loc.area,
        city: loc.city,
        state: loc.state,
        country: loc.country,
        latitude: parseFloat(loc.latitude),
        longitude: parseFloat(loc.longitude),
        hourlyRate: parseFloat(loc.hourly_rate),
        totalCapacity: slots.length || loc.total_capacity,
        availableSlots,
        reservedSlots,
        occupiedSlots,
        occupancyRate: slots.length > 0 ? Math.round(((reservedSlots + occupiedSlots) / slots.length) * 100) : 0,
        isFull: availableSlots === 0,
        isOpen: isLocationCurrentlyOpen(loc),
        status: loc.status,
        openingTime: loc.opening_time,
        closingTime: loc.closing_time,
        isCovered: Boolean(loc.is_covered),
        hasEv: Boolean(loc.has_ev),
        hasCctv: Boolean(loc.has_cctv),
        hasSecurity: Boolean(loc.has_security),
        is24x7: Boolean(loc.is_24_7),
        isAccessible: Boolean(loc.is_accessible),
        imageUrl: loc.image_url,
        rating: parseFloat(parseFloat(loc.avg_rating).toFixed(1)),
        reviewCount: parseInt(loc.review_count, 10) || 0,
        floors: hierarchicalFloors,
        slots,
        reviews
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/locations/meta/cities
 * Returns list of distinct cities and areas for dynamic search filters
 */
async function getCities(req, res, next) {
  try {
    const [cities] = await pool.query(`
      SELECT city, COUNT(id) AS location_count 
      FROM parking_locations 
      GROUP BY city 
      ORDER BY location_count DESC
    `);
    const [areas] = await pool.query(`
      SELECT area, city, COUNT(id) AS location_count 
      FROM parking_locations 
      GROUP BY area, city 
      ORDER BY area ASC
    `);

    res.json({
      success: true,
      data: {
        cities: cities.map(c => ({ name: c.city, count: c.location_count })),
        areas: areas.map(a => ({ name: a.area, city: a.city, count: a.location_count }))
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/locations (Owner-only)
 * Create a new parking location listing with auto-generated floors, rows, and slots
 */
async function createLocation(req, res, next) {
  try {
    const ownerId = req.user.id;
    const {
      name,
      description,
      address,
      area,
      city = 'Coimbatore',
      state = 'Tamil Nadu',
      country = 'India',
      latitude,
      longitude,
      hourly_rate,
      total_capacity = 12,
      opening_time = '06:00',
      closing_time = '23:00',
      is_covered = true,
      has_ev = false,
      has_cctv = true,
      has_security = true,
      is_24_7 = false,
      is_accessible = true,
      image_url
    } = req.body;

    const result = await withTransaction(async (conn) => {
      // 1. Insert Location
      const [insertLoc] = await conn.query(`
        INSERT INTO parking_locations (
          owner_id, name, description, address, area, city, state, country,
          latitude, longitude, hourly_rate, total_capacity, status,
          opening_time, closing_time, is_covered, has_ev, has_cctv,
          has_security, is_24_7, is_accessible, image_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        ownerId,
        name.trim(),
        description || '',
        address.trim(),
        area.trim(),
        city.trim(),
        state.trim(),
        country.trim(),
        parseFloat(latitude),
        parseFloat(longitude),
        parseFloat(hourly_rate),
        parseInt(total_capacity, 10),
        opening_time,
        closing_time,
        Boolean(is_covered),
        Boolean(has_ev),
        Boolean(has_cctv),
        Boolean(has_security),
        Boolean(is_24_7),
        Boolean(is_accessible),
        image_url || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=600&auto=format&fit=crop&q=80'
      ]);

      const newLocationId = insertLoc.insertId;
      const capacity = parseInt(total_capacity, 10);

      // 2. Create Default Floor
      const [floorRes] = await conn.query(`
        INSERT INTO parking_floors (parking_location_id, floor_name, floor_number)
        VALUES (?, 'Ground Floor', 0)
      `, [newLocationId]);
      const defaultFloorId = floorRes.insertId;

      // 3. Create Default Rows
      const [rowRes1] = await conn.query(`
        INSERT INTO parking_rows (floor_id, row_name, display_order)
        VALUES (?, 'Row A', 1)
      `, [defaultFloorId]);
      const [rowRes2] = await conn.query(`
        INSERT INTO parking_rows (floor_id, row_name, display_order)
        VALUES (?, 'Row B', 2)
      `, [defaultFloorId]);

      const row1Id = rowRes1.insertId;
      const row2Id = rowRes2.insertId;

      // 4. Generate initial physical slots (2 rows)
      const slotsToInsert = [];
      const slotsPerRow = Math.ceil(capacity / 2);

      for (let i = 1; i <= capacity; i++) {
        const isRow1 = i <= slotsPerRow;
        const rowId = isRow1 ? row1Id : row2Id;
        const bayRow = isRow1 ? 1 : 2;
        const bayCol = isRow1 ? i : i - slotsPerRow;
        const slotPrefix = isRow1 ? 'A' : 'B';
        const slotNo = `${slotPrefix}-${String(bayCol).padStart(2, '0')}`;
        let slotType = 'standard';
        if (i === 1 && Boolean(is_accessible)) slotType = 'accessible';
        else if ((i === 2 || i === 3) && Boolean(has_ev)) slotType = 'ev_charging';

        slotsToInsert.push([
          newLocationId,
          defaultFloorId,
          rowId,
          slotNo,
          slotType,
          bayRow,
          bayCol,
          bayCol * 20,
          bayRow * 40,
          'available'
        ]);
      }

      if (slotsToInsert.length > 0) {
        await conn.query(`
          INSERT INTO parking_slots (
            parking_location_id, floor_id, row_id, slot_no, slot_type,
            bay_row, bay_column, position_x, position_y, status
          ) VALUES ?
        `, [slotsToInsert]);
      }

      return newLocationId;
    });

    res.status(201).json({
      success: true,
      message: `Parking listing '${name}' created successfully with ${total_capacity} slots.`,
      data: { locationId: result }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/locations/:id (Owner-only)
 * Update existing parking location details & pricing
 */
async function updateLocation(req, res, next) {
  try {
    const ownerId = req.user.id;
    const locationId = req.params.id;

    const [locRows] = await pool.query(
      'SELECT id, owner_id FROM parking_locations WHERE id = ?',
      [locationId]
    );

    if (locRows.length === 0) {
      const error = new Error(`Location #${locationId} not found.`);
      error.statusCode = 404;
      return next(error);
    }

    if (locRows[0].owner_id !== ownerId) {
      const error = new Error('Unauthorized. You can only manage your own parking locations.');
      error.statusCode = 403;
      return next(error);
    }

    const {
      name,
      description,
      address,
      area,
      city,
      hourly_rate,
      opening_time,
      closing_time,
      is_covered,
      has_ev,
      has_cctv,
      has_security,
      is_24_7,
      is_accessible,
      status
    } = req.body;

    await pool.query(`
      UPDATE parking_locations SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        address = COALESCE(?, address),
        area = COALESCE(?, area),
        city = COALESCE(?, city),
        hourly_rate = COALESCE(?, hourly_rate),
        opening_time = COALESCE(?, opening_time),
        closing_time = COALESCE(?, closing_time),
        is_covered = COALESCE(?, is_covered),
        has_ev = COALESCE(?, has_ev),
        has_cctv = COALESCE(?, has_cctv),
        has_security = COALESCE(?, has_security),
        is_24_7 = COALESCE(?, is_24_7),
        is_accessible = COALESCE(?, is_accessible),
        status = COALESCE(?, status),
        updated_at = NOW()
      WHERE id = ?
    `, [
      name, description, address, area, city,
      hourly_rate ? parseFloat(hourly_rate) : null,
      opening_time, closing_time,
      is_covered !== undefined ? Boolean(is_covered) : null,
      has_ev !== undefined ? Boolean(has_ev) : null,
      has_cctv !== undefined ? Boolean(has_cctv) : null,
      has_security !== undefined ? Boolean(has_security) : null,
      is_24_7 !== undefined ? Boolean(is_24_7) : null,
      is_accessible !== undefined ? Boolean(is_accessible) : null,
      status,
      locationId
    ]);

    res.json({
      success: true,
      message: `Parking facility #${locationId} details updated successfully.`
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/locations/owner/my-locations (Owner-only)
 * Returns all parking spaces listed by the authenticated owner with live occupancy and earnings metrics
 */
async function getOwnerLocations(req, res, next) {
  try {
    const ownerId = req.user.id;

    const [rows] = await pool.query(`
      SELECT 
        l.id,
        l.name,
        l.description,
        l.address,
        l.area,
        l.city,
        l.state,
        l.country,
        l.latitude,
        l.longitude,
        l.hourly_rate,
        l.total_capacity,
        l.status,
        l.opening_time,
        l.closing_time,
        l.is_covered,
        l.has_ev,
        l.has_cctv,
        l.has_security,
        l.is_24_7,
        l.is_accessible,
        l.image_url,
        l.created_at,
        COUNT(DISTINCT s.id) AS total_slots,
        SUM(CASE WHEN s.status = 'available' THEN 1 ELSE 0 END) AS available_slots,
        SUM(CASE WHEN s.status = 'reserved' THEN 1 ELSE 0 END) AS reserved_slots,
        SUM(CASE WHEN s.status = 'occupied' THEN 1 ELSE 0 END) AS occupied_slots,
        SUM(CASE WHEN s.status = 'maintenance' THEN 1 ELSE 0 END) AS maintenance_slots,
        (SELECT COUNT(b.id) FROM bookings b WHERE b.parking_location_id = l.id) AS total_bookings,
        (SELECT COUNT(b.id) FROM bookings b WHERE b.parking_location_id = l.id AND b.booking_status = 'active') AS active_bookings,
        COALESCE((SELECT SUM(b.total_amount) FROM bookings b WHERE b.parking_location_id = l.id AND b.booking_status IN ('active', 'completed')), 0) AS total_earnings
      FROM parking_locations l
      LEFT JOIN parking_slots s ON l.id = s.parking_location_id
      WHERE l.owner_id = ?
      GROUP BY l.id
      ORDER BY l.created_at DESC
    `, [ownerId]);

    const locations = rows.map(loc => {
      const total = parseInt(loc.total_slots, 10) || loc.total_capacity;
      const avail = parseInt(loc.available_slots, 10) || 0;
      const taken = total - avail;
      const occPct = total > 0 ? Math.round((taken / total) * 100) : 0;

      return {
        id: loc.id,
        name: loc.name,
        description: loc.description,
        address: loc.address,
        area: loc.area,
        city: loc.city,
        state: loc.state,
        country: loc.country,
        latitude: parseFloat(loc.latitude),
        longitude: parseFloat(loc.longitude),
        hourlyRate: parseFloat(loc.hourly_rate),
        totalCapacity: total,
        availableSlots: avail,
        reservedSlots: parseInt(loc.reserved_slots, 10) || 0,
        occupiedSlots: parseInt(loc.occupied_slots, 10) || 0,
        maintenanceSlots: parseInt(loc.maintenance_slots, 10) || 0,
        occupancyRate: occPct,
        status: loc.status,
        openingTime: loc.opening_time,
        closingTime: loc.closing_time,
        isCovered: Boolean(loc.is_covered),
        hasEv: Boolean(loc.has_ev),
        hasCctv: Boolean(loc.has_cctv),
        hasSecurity: Boolean(loc.has_security),
        is24x7: Boolean(loc.is_24_7),
        isAccessible: Boolean(loc.is_accessible),
        imageUrl: loc.image_url,
        totalBookings: parseInt(loc.total_bookings, 10) || 0,
        activeBookings: parseInt(loc.active_bookings, 10) || 0,
        totalEarnings: parseFloat(loc.total_earnings) || 0
      };
    });

    res.json({
      success: true,
      count: locations.length,
      data: locations
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllLocations,
  getLocationById,
  getCities,
  createLocation,
  updateLocation,
  getOwnerLocations
};
