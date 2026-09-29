const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'parkfind_academic_project_secure_jwt_secret_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Helper to generate JWT token with role claim
 */
function createToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.full_name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * POST /api/auth/register
 */
async function register(req, res, next) {
  try {
    const { full_name, email, phone = '+91 98422 00000', password, role = 'customer' } = req.body;

    if (!full_name || !email || !password) {
      const error = new Error('Please provide full name, email, and password.');
      error.statusCode = 400;
      return next(error);
    }

    if (password.length < 6) {
      const error = new Error('Password must be at least 6 characters.');
      error.statusCode = 400;
      return next(error);
    }

    const assignedRole = role === 'owner' ? 'owner' : 'customer';

    // Check if email already exists
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing.length > 0) {
      const error = new Error('An account with this email already exists.');
      error.statusCode = 409;
      return next(error);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user
    const [result] = await pool.query(
      'INSERT INTO users (full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [full_name.trim(), email.toLowerCase().trim(), phone.trim(), passwordHash, assignedRole]
    );

    const user = {
      id: result.insertId,
      full_name: full_name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      role: assignedRole
    };

    const token = createToken(user);

    // Create welcome notification
    await pool.query(
      'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
      [
        user.id,
        'Welcome to ParkFind!',
        assignedRole === 'owner' 
          ? 'Welcome to the ParkFind Owner Platform. Start by listing your parking spaces and tracking live bookings.'
          : 'Welcome to ParkFind! Discover and reserve guaranteed parking spaces across Coimbatore.',
        'system'
      ]
    );

    res.status(201).json({
      success: true,
      message: `Account registered successfully as ${assignedRole}`,
      data: {
        user,
        token
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      const error = new Error('Please enter both email and password.');
      error.statusCode = 400;
      return next(error);
    }

    const [rows] = await pool.query(
      'SELECT id, full_name, email, phone, password_hash, role FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      return next(error);
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      return next(error);
    }

    // Optional role mismatch warning
    if (role && user.role !== role) {
      const error = new Error(`This account is registered as a ${user.role}, not an ${role}. Please use the correct login tab.`);
      error.statusCode = 403;
      return next(error);
    }

    const token = createToken(user);

    res.json({
      success: true,
      message: `Welcome back, ${user.full_name}!`,
      data: {
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/auth/me
 */
async function getMe(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT id, full_name, email, phone, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      return next(error);
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  getMe
};
