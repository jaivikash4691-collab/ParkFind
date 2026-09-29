const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { requireAuth, requireRole, optionalAuth } = require('../middleware/auth');
const { validateBookingInput } = require('../middleware/validation');

// Customer booking creation & lookups
router.post('/', optionalAuth, validateBookingInput, bookingController.createBooking);
router.get('/active-car', optionalAuth, bookingController.getActiveCarLocation);
router.get('/my-bookings', optionalAuth, bookingController.getMyBookings);
router.get('/owner-bookings', requireAuth, requireRole('owner'), bookingController.getOwnerBookings);

// Individual booking management
router.get('/:idOrRef', bookingController.getBookingByIdOrRef);
router.put('/:id/extend', optionalAuth, bookingController.extendBooking);
router.put('/:id/cancel', optionalAuth, bookingController.cancelBooking);
router.put('/:id/status', optionalAuth, bookingController.updateBookingStatus);

module.exports = router;
