const express = require('express');
const router = express.Router();
const slotController = require('../controllers/slotController');
const { requireAuth, requireRole, optionalAuth } = require('../middleware/auth');

router.get('/', slotController.getAllSlots);
router.get('/:id', slotController.getSlotById);
router.put('/:id/status', optionalAuth, slotController.updateSlotStatus);
router.post('/', requireAuth, requireRole('owner'), slotController.addSlot);

module.exports = router;
