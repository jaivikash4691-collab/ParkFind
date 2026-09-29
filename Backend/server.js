const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { testConnection } = require('./config/db');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Parsing Middleware
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger for development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'ParkFind Smart Parking Marketplace API is operational',
    city: 'Coimbatore, Tamil Nadu',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// REST API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/locations', require('./routes/locationRoutes'));
app.use('/api/slots', require('./routes/slotRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/recommendations', require('./routes/recommendationRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));

// Legacy route alias for backwards compatibility
app.use('/api/zones', require('./routes/locationRoutes'));

// Static Frontend Serving
app.use(express.static(path.join(__dirname, '../Frontend')));

// 404 Handler for API routes
app.use('/api', notFoundHandler);

// Fallback to index.html for SPA routing
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, '../Frontend/index.html'));
  }
  next();
});

// Centralized Error Handler
app.use(errorHandler);

// Start Server
async function startServer() {
  const isDbConnected = await testConnection();
  if (!isDbConnected) {
    console.warn('⚠️  Warning: MySQL connection could not be established. Ensure MySQL service is running.');
  }

  app.listen(PORT, () => {
    console.log('====================================================');
    console.log(`🚀 PARKFIND Marketplace Server running on http://localhost:${PORT}`);
    console.log(`📡 Health Check:     http://localhost:${PORT}/api/health`);
    console.log(`🅿️  Locations API:    http://localhost:${PORT}/api/locations`);
    console.log(`📊 Dashboard API:    http://localhost:${PORT}/api/dashboard/stats`);
    console.log('====================================================');
  });
}

if (require.main === module) {
  startServer();
}

module.exports = app;
