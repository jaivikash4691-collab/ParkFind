const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

// GET /api/analytics/forecast - Moving-average statistical parking demand forecast
router.get('/forecast', analyticsController.getDemandForecast);

module.exports = router;
