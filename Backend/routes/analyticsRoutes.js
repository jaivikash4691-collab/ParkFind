const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { requireAuth } = require('../middleware/auth');

// GET /api/analytics/forecast - Moving-average statistical parking demand forecast (Protected)
router.get('/forecast', requireAuth, analyticsController.getDemandForecast);

module.exports = router;
