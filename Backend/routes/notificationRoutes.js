const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, notificationController.getMyNotifications);
router.put('/read-all', requireAuth, notificationController.markAllAsRead);
router.put('/:id/read', requireAuth, notificationController.markAsRead);

module.exports = router;
