const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validateLocationInput } = require('../middleware/validation');

// Protected routes (Mandatory Authentication Required for Search & Exploration)
router.get('/meta/cities', requireAuth, locationController.getCities);
router.get('/', requireAuth, locationController.getAllLocations);
router.get('/:id', requireAuth, locationController.getLocationById);

// Owner-only protected routes
router.get('/owner/my-locations', requireAuth, requireRole('owner'), locationController.getOwnerLocations);
router.post('/', requireAuth, requireRole('owner'), validateLocationInput, locationController.createLocation);
router.put('/:id', requireAuth, requireRole('owner'), locationController.updateLocation);

module.exports = router;
