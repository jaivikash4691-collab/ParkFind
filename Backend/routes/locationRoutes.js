const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validateLocationInput } = require('../middleware/validation');

// Public routes
router.get('/meta/cities', locationController.getCities);
router.get('/', locationController.getAllLocations);
router.get('/:id', locationController.getLocationById);

// Owner-only protected routes
router.get('/owner/my-locations', requireAuth, requireRole('owner'), locationController.getOwnerLocations);
router.post('/', requireAuth, requireRole('owner'), validateLocationInput, locationController.createLocation);
router.put('/:id', requireAuth, requireRole('owner'), locationController.updateLocation);

module.exports = router;
