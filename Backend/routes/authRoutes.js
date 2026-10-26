const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', requireAuth, authController.getMe);

// Space Owner UPI Payment Settings
router.get('/owner-payment-settings', requireAuth, requireRole('owner'), authController.getOwnerPaymentSettings);
router.put('/owner-payment-settings', requireAuth, requireRole('owner'), authController.updateOwnerPaymentSettings);

module.exports = router;

