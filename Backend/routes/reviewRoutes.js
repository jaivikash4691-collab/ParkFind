const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { requireAuth } = require('../middleware/auth');

router.post('/', requireAuth, reviewController.createReview);
router.get('/location/:locationId', requireAuth, reviewController.getLocationReviews);

module.exports = router;
