const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'parkfind_academic_project_secure_jwt_secret_key_2026';

/**
 * Middleware to verify JWT authentication token
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error = new Error('Authentication required. Please provide a valid token.');
    error.statusCode = 401;
    return next(error);
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    const error = new Error('Invalid or expired authentication token.');
    error.statusCode = 401;
    return next(error);
  }
}

/**
 * Role-Based Access Control middleware
 * @param {...string} allowedRoles - 'customer', 'owner'
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      const error = new Error('Authentication required.');
      error.statusCode = 401;
      return next(error);
    }

    if (!allowedRoles.includes(req.user.role)) {
      const error = new Error(`Access forbidden. This action requires ${allowedRoles.join(' or ')} privileges.`);
      error.statusCode = 403;
      return next(error);
    }

    next();
  };
}

/**
 * Optional authentication: attaches user if token is valid, but allows guest if missing
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      // Ignore token decode error for optional auth
    }
  }
  next();
}

module.exports = {
  requireAuth,
  requireRole,
  optionalAuth
};
