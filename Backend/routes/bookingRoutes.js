const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { requireAuth, requireRole, optionalAuth } = require('../middleware/auth');
const { validateBookingInput } = require('../middleware/validation');

// Protected Customer Booking Operations (Mandatory Server-Side Authentication)
router.post('/', requireAuth, validateBookingInput, bookingController.createBooking);
router.get('/my-bookings', requireAuth, bookingController.getMyBookings);
router.get('/expenses', requireAuth, bookingController.getCustomerExpenses);
router.get('/active-car', optionalAuth, bookingController.getActiveCarLocation);
router.get('/owner-bookings', requireAuth, requireRole('owner'), bookingController.getOwnerBookings);

// Individual booking management (Protected against unauthorized modification)
// QR Pass validation (Owner/Staff only) - registered BEFORE :idOrRef to prevent shadowing
router.post('/validate-pass', requireAuth, requireRole('owner'), bookingController.validateQrPass);
router.post('/verify-qr', requireAuth, requireRole('owner'), bookingController.validateQrPass);

// QR Pass retrieval (Customer or Facility Owner)
router.get('/:idOrRef/qr-pass', requireAuth, bookingController.getBookingQrPass);

router.get('/:idOrRef', requireAuth, bookingController.getBookingByIdOrRef);
router.put('/:id/extend', requireAuth, bookingController.extendBooking);
router.put('/:id/cancel', requireAuth, bookingController.cancelBooking);
router.put('/:id/status', requireAuth, requireRole('owner'), bookingController.updateBookingStatus);

// UPI Payment confirmation and UTR recording
router.put('/:id/confirm-payment', requireAuth, requireRole('owner'), bookingController.confirmPayment);
router.post('/:id/submit-utr', requireAuth, bookingController.submitCustomerUtr);

module.exports = router;


