const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/auth');

// GET /api/dashboard/stats - Summary statistics (Protected)
router.get('/stats', requireAuth, dashboardController.getSummaryStats);

module.exports = router;
