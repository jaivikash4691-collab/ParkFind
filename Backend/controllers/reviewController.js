const { pool } = require('../config/db');

/**
 * POST /api/reviews
 * Submit rating & review for a completed booking
 */
async function createReview(req, res, next) {
  try {
    const customerId = req.user ? req.user.id : null;
    const { booking_id, rating, comment } = req.body;

    if (!booking_id) {
      const error = new Error('booking_id is required.');
      error.statusCode = 400;
      return next(error);
    }

    const starRating = parseInt(rating, 10);
    if (isNaN(starRating) || starRating < 1 || starRating > 5) {
      const error = new Error('Rating must be an integer between 1 and 5 stars.');
      error.statusCode = 400;
      return next(error);
    }

    // Verify booking
    const [bookingRows] = await pool.query(`
      SELECT b.id, b.parking_location_id, b.customer_id, b.booking_status, l.owner_id, l.name AS location_name
      FROM bookings b
      INNER JOIN parking_locations l ON b.parking_location_id = l.id
      WHERE b.id = ?
    `, [booking_id]);

    if (bookingRows.length === 0) {
      const error = new Error(`Booking #${booking_id} not found.`);
      error.statusCode = 404;
      return next(error);
    }

    const booking = bookingRows[0];

    // Check if already reviewed
    const [existing] = await pool.query('SELECT id FROM reviews WHERE booking_id = ?', [booking_id]);
    if (existing.length > 0) {
      const error = new Error('A review has already been submitted for this booking.');
      error.statusCode = 409;
      return next(error);
    }

    const actualCustomerId = customerId || booking.customer_id || 1;

    const [insertResult] = await pool.query(`
      INSERT INTO reviews (booking_id, parking_location_id, customer_id, rating, comment, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
    `, [booking_id, booking.parking_location_id, actualCustomerId, starRating, comment || '']);

    // Notify owner
    if (booking.owner_id) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'alert')`,
        [
          booking.owner_id,
          'New Review Received',
          `A customer rated ${booking.location_name} ${starRating} ⭐: "${comment || 'No comment'}"`
        ]
      );
    }

    res.status(201).json({
      success: true,
      message: 'Thank you! Your review has been published.',
      data: {
        reviewId: insertResult.insertId,
        rating: starRating,
        comment
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/reviews/location/:locationId
 */
async function getLocationReviews(req, res, next) {
  try {
    const locationId = req.params.locationId;

    const [reviews] = await pool.query(`
      SELECT r.id, r.rating, r.comment, r.created_at, u.full_name AS customer_name
      FROM reviews r
      INNER JOIN users u ON r.customer_id = u.id
      WHERE r.parking_location_id = ?
      ORDER BY r.created_at DESC
    `, [locationId]);

    const [[{ avgRating, totalReviews }]] = await pool.query(`
      SELECT COALESCE(AVG(rating), 0) AS avgRating, COUNT(id) AS totalReviews
      FROM reviews WHERE parking_location_id = ?
    `, [locationId]);

    res.json({
      success: true,
      averageRating: parseFloat(parseFloat(avgRating).toFixed(1)),
      totalReviews: parseInt(totalReviews, 10),
      data: reviews
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createReview,
  getLocationReviews
};
