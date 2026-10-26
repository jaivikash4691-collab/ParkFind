const express = require('express');
const router = express.Router();
const slotController = require('../controllers/slotController');
const { requireAuth, requireRole } = require('../middleware/auth');

// Protected slot management
router.get('/', requireAuth, slotController.getAllSlots);
router.get('/:id', requireAuth, slotController.getSlotById);
router.put('/:id/status', requireAuth, requireRole('owner'), slotController.updateSlotStatus);
router.post('/', requireAuth, requireRole('owner'), slotController.addSlot);

module.exports = router;
