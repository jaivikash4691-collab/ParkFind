const express = require('express');
const router = express.Router();
const zoneController = require('../controllers/zoneController');
const { validateIdParam } = require('../middleware/validation');

// GET /api/zones - List all active parking zones with live availability stats
router.get('/', zoneController.getAllZones);

// GET /api/zones/alternates - Smart alternate zone suggestions
router.get('/alternates', zoneController.getSmartAlternates);

// GET /api/zones/:id - Get specific zone and its slots
router.get('/:id', validateIdParam('id'), zoneController.getZoneById);

module.exports = router;
