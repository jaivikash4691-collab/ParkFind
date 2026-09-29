const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { optionalAuth } = require('../middleware/auth');

router.post('/', optionalAuth, reviewController.createReview);
router.get('/location/:locationId', reviewController.getLocationReviews);

module.exports = router;
