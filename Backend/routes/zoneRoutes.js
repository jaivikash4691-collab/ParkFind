const express = require('express');
const router = express.Router();
const zoneController = require('../controllers/zoneController');
const { requireAuth } = require('../middleware/auth');
const { validateIdParam } = require('../middleware/validation');

// All zone endpoints require authentication
router.get('/', requireAuth, zoneController.getAllZones);
router.get('/alternates', requireAuth, zoneController.getSmartAlternates);
router.get('/:id', requireAuth, validateIdParam('id'), zoneController.getZoneById);

module.exports = router;
