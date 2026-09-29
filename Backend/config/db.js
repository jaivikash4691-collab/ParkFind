const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

// Create connection pool for high concurrency and connection reuse
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ParkIt',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  timezone: '+00:00'
});

/**
 * Test the database connection and log status
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log(`[Database] Successfully connected to MySQL (${process.env.DB_NAME || 'ParkIt'}) at ${process.env.DB_HOST || '127.0.0.1'}:${process.env.DB_PORT || '3306'}`);
    connection.release();
    return true;
  } catch (error) {
    console.error(`[Database Error] Failed to connect to MySQL: ${error.message}`);
    return false;
  }
}

/**
 * Execute a callback within an explicit MySQL transaction.
 * Automatically handles START TRANSACTION, COMMIT, and ROLLBACK.
 * 
 * @param {Function} callback - Async function receiving (connection)
 * @returns {Promise<any>}
 */
async function withTransaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  testConnection,
  withTransaction
};
