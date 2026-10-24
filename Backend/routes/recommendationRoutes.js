const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const { requireAuth } = require('../middleware/auth');

// GET /api/recommendations - Multi-factor parking recommendations (Protected)
router.get('/', requireAuth, recommendationController.getRecommendations);

module.exports = router;
