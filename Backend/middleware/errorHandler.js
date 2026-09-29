/**
 * Centralized error handling middleware.
 * Formats errors consistently as JSON and avoids leaking internal stack traces in production.
 */
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
  const message = err.message || 'Internal Server Error';

  console.error(`[Error] ${req.method} ${req.originalUrl} - ${statusCode} - ${message}`);
  if (err.stack && process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message,
    statusCode,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

/**
 * 404 Route Not Found handler
 */
function notFoundHandler(req, res, next) {
  const error = new Error(`Resource not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

module.exports = {
  errorHandler,
  notFoundHandler
};
