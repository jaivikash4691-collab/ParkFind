const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { optionalAuth } = require('../middleware/auth');

router.get('/stats', optionalAuth, dashboardController.getSummaryStats);

module.exports = router;
