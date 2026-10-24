const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { requireAuth, requireRole, optionalAuth } = require('../middleware/auth');
const { validateBookingInput } = require('../middleware/validation');

// Protected Customer Booking Operations (Mandatory Server-Side Authentication)
router.post('/', requireAuth, validateBookingInput, bookingController.createBooking);
router.get('/my-bookings', requireAuth, bookingController.getMyBookings);
router.get('/active-car', optionalAuth, bookingController.getActiveCarLocation);
router.get('/owner-bookings', requireAuth, requireRole('owner'), bookingController.getOwnerBookings);

// Individual booking management (Protected against unauthorized modification)
router.get('/:idOrRef', requireAuth, bookingController.getBookingByIdOrRef);
router.put('/:id/extend', requireAuth, bookingController.extendBooking);
router.put('/:id/cancel', requireAuth, bookingController.cancelBooking);
router.put('/:id/status', requireAuth, requireRole('owner'), bookingController.updateBookingStatus);

module.exports = router;
