const { pool } = require('../config/db');

/**
 * Great-Circle Distance
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
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
 * GET /api/recommendations
 * Multi-factor recommendation engine across Coimbatore parking facilities
 */
async function getRecommendations(req, res, next) {
  try {
    const requestedDuration = parseInt(req.query.duration || '2', 10);
    const requireEv = req.query.hasEv === 'true' || req.query.hasEv === '1';
    const userLat = req.query.user_lat ? parseFloat(req.query.user_lat) : 11.0168; // Default Coimbatore Center
    const userLng = req.query.user_lng ? parseFloat(req.query.user_lng) : 76.9558;

    const query = `
      SELECT 
        l.id,
        l.name,
        l.address,
        l.area,
        l.city,
        l.latitude,
        l.longitude,
        l.hourly_rate,
        l.total_capacity,
        l.has_ev,
        l.is_covered,
        l.is_24_7,
        l.is_accessible,
        l.image_url,
        l.status,
        COUNT(s.id) AS total_slots_count,
        SUM(CASE WHEN s.status = 'available' THEN 1 ELSE 0 END) AS available_slots,
        SUM(CASE WHEN s.status = 'available' AND s.slot_type = 'ev_charging' THEN 1 ELSE 0 END) AS available_ev_slots,
        COALESCE(AVG(r.rating), 4.8) AS avg_rating
      FROM parking_locations l
      LEFT JOIN parking_slots s ON l.id = s.parking_location_id
      LEFT JOIN reviews r ON l.id = r.parking_location_id
      WHERE l.status = 'open'
      GROUP BY l.id
    `;

    const [rows] = await pool.query(query);

    if (rows.length === 0) {
      return res.json({ success: true, topRecommendation: null, data: [] });
    }

    const maxRate = Math.max(...rows.map(r => parseFloat(r.hourly_rate)));

    const scoredLocations = rows.map(loc => {
      const totalSlots = parseInt(loc.total_slots_count, 10) || loc.total_capacity;
      const availableSlots = parseInt(loc.available_slots, 10) || 0;
      const availableEvSlots = parseInt(loc.available_ev_slots, 10) || 0;
      const hourlyRate = parseFloat(loc.hourly_rate);
      const rating = parseFloat(parseFloat(loc.avg_rating).toFixed(1));
      
      const distanceKm = calculateHaversineDistance(userLat, userLng, parseFloat(loc.latitude), parseFloat(loc.longitude));
      const distanceMeters = Math.round(distanceKm * 1000);

      // 1. Availability Score (0-100)
      const availScore = totalSlots > 0 ? Math.round((availableSlots / totalSlots) * 100) : 0;

      // 2. Price Score (0-100) - Lower rate = higher score
      const priceScore = maxRate > 0 ? Math.round(((maxRate - hourlyRate + 15) / (maxRate + 15)) * 100) : 50;

      // 3. Proximity Score (0-100) - Closer distance = higher score
      const proxScore = Math.max(0, Math.min(100, Math.round(100 - (distanceKm * 10))));

      // 4. Rating Score (0-100)
      const ratingScore = Math.round((rating / 5) * 100);

      // Composite calculation
      let compositeScore = 0;
      if (availableSlots > 0) {
        compositeScore = Math.round(
          (availScore * 0.35) +
          (priceScore * 0.25) +
          (proxScore * 0.20) +
          (ratingScore * 0.20)
        );

        if (requireEv && availableEvSlots > 0) {
          compositeScore += 10;
        }
      }

      const estimatedCost = hourlyRate * requestedDuration;

      return {
        id: loc.id,
        name: loc.name,
        address: loc.address,
        area: loc.area,
        city: loc.city,
        latitude: parseFloat(loc.latitude),
        longitude: parseFloat(loc.longitude),
        hourlyRate,
        estimatedCost,
        requestedDuration,
        availableSlots,
        totalSlots,
        availableEvSlots,
        hasEv: Boolean(loc.has_ev),
        isCovered: Boolean(loc.is_covered),
        is24x7: Boolean(loc.is_24_7),
        isAccessible: Boolean(loc.is_accessible),
        imageUrl: loc.image_url,
        rating,
        distanceKm: parseFloat(distanceKm.toFixed(2)),
        distanceMeters,
        distanceLabel: distanceKm < 1 ? `${distanceMeters} m away` : `${distanceKm.toFixed(1)} km away`,
        compositeScore,
        isFull: availableSlots === 0
      };
    });

    // Sort descending by composite score
    scoredLocations.sort((a, b) => b.compositeScore - a.compositeScore);

    // Assign badge and natural explanation
    const recommendations = scoredLocations.map((loc, idx) => {
      let badge = 'Good Alternative';
      let reason = '';

      if (loc.isFull) {
        badge = 'Currently Full';
        reason = `${loc.name} has 0 spaces free. Please select an alternate location.`;
      } else if (idx === 0) {
        badge = 'Best Overall Match';
        reason = `Best balance of open bays (${loc.availableSlots} available), competitive ₹${loc.hourlyRate}/hr rate, and high customer rating (${loc.rating} ⭐).`;
      } else if (loc.hourlyRate === Math.min(...scoredLocations.filter(x => !x.isFull).map(x => x.hourlyRate))) {
        badge = 'Most Economical';
        reason = `Lowest hourly rate in Coimbatore at ₹${loc.hourlyRate}/hr with ${loc.availableSlots} open spots.`;
      } else if (loc.distanceKm === Math.min(...scoredLocations.filter(x => !x.isFull).map(x => x.distanceKm))) {
        badge = 'Nearest Location';
        reason = `Closest parking space to your location (${loc.distanceLabel}) in ${loc.area}.`;
      } else if (loc.hasEv && loc.availableEvSlots > 0) {
        badge = 'EV Fast Charging';
        reason = `Equipped with dedicated EV fast charging bays with ${loc.availableEvSlots} chargers open.`;
      } else {
        reason = `Reliable covered parking in ${loc.area} with ${loc.availableSlots} bays free.`;
      }

      return {
        ...loc,
        badge,
        reason
      };
    });

    res.json({
      success: true,
      message: 'Recommendations generated successfully for Coimbatore',
      topRecommendation: recommendations.find(r => !r.isFull) || recommendations[0],
      data: recommendations
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getRecommendations
};
