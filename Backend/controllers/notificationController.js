const { pool } = require('../config/db');

/**
 * GET /api/notifications
 */
async function getMyNotifications(req, res, next) {
  try {
    const userId = req.user ? req.user.id : null;

    if (!userId) {
      return res.json({ success: true, count: 0, unreadCount: 0, data: [] });
    }

    const [rows] = await pool.query(`
      SELECT id, title, message, type, is_read, created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 30
    `, [userId]);

    const unreadCount = rows.filter(n => !n.is_read).length;

    res.json({
      success: true,
      count: rows.length,
      unreadCount,
      data: rows
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/notifications/:id/read
 */
async function markAsRead(req, res, next) {
  try {
    const notificationId = req.params.id;
    const userId = req.user ? req.user.id : null;

    await pool.query(`
      UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?
    `, [notificationId, userId]);

    res.json({
      success: true,
      message: 'Notification marked as read.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/notifications/read-all
 */
async function markAllAsRead(req, res, next) {
  try {
    const userId = req.user ? req.user.id : null;

    if (userId) {
      await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [userId]);
    }

    res.json({
      success: true,
      message: 'All notifications marked as read.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead
};
