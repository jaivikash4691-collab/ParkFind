const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');

// GET /api/recommendations - Multi-factor parking recommendations
router.get('/', recommendationController.getRecommendations);

module.exports = router;
