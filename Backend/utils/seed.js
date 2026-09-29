const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const host = process.env.DB_HOST || '127.0.0.1';
const port = parseInt(process.env.DB_PORT || '3306', 10);
const user = process.env.DB_USER || 'root';
const password = process.env.DB_PASSWORD || '';
const database = process.env.DB_NAME || 'ParkIt';

async function seedDatabase() {
  console.log('--------------------------------------------------');
  console.log('PARKFIND — Database Migration & Coimbatore Seeding');
  console.log('--------------------------------------------------');
  console.log(`Connecting to MySQL at ${host}:${port} as ${user}...`);

  let connection;
  try {
    // 1. Initial connection without selecting database (to create DB if not exists)
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: true
    });

    console.log('[1/4] Ensuring database exists...');
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
    await connection.query(`USE \`${database}\`;`);
    console.log(`[2/4] Switched to database: ${database}`);

    // 2. Read the SQL schema file
    const sqlFilePath = path.join(__dirname, '../../Database/parkit.sql');
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`Schema file not found at: ${sqlFilePath}`);
    }

    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('[3/4] Executing schema definitions, indexes & Coimbatore seed data...');
    await connection.query(sqlContent);

    // 3. Verify counts
    const [[{ userCount }]] = await connection.query('SELECT COUNT(*) AS userCount FROM users');
    const [[{ locationCount }]] = await connection.query('SELECT COUNT(*) AS locationCount FROM parking_locations');
    const [[{ floorCount }]] = await connection.query('SELECT COUNT(*) AS floorCount FROM parking_floors');
    const [[{ rowCount }]] = await connection.query('SELECT COUNT(*) AS rowCount FROM parking_rows');
    const [[{ slotCount }]] = await connection.query('SELECT COUNT(*) AS slotCount FROM parking_slots');
    const [[{ bookingCount }]] = await connection.query('SELECT COUNT(*) AS bookingCount FROM bookings');
    const [[{ paymentCount }]] = await connection.query('SELECT COUNT(*) AS paymentCount FROM payments');
    const [[{ reviewCount }]] = await connection.query('SELECT COUNT(*) AS reviewCount FROM reviews');
    const [[{ notificationCount }]] = await connection.query('SELECT COUNT(*) AS notificationCount FROM notifications');

    console.log('[4/4] Verification Summary:');
    console.log(`  ✓ Users created:         ${userCount}`);
    console.log(`  ✓ Locations created:     ${locationCount}`);
    console.log(`  ✓ Floors created:        ${floorCount}`);
    console.log(`  ✓ Rows created:          ${rowCount}`);
    console.log(`  ✓ Slots created:         ${slotCount}`);
    console.log(`  ✓ Bookings created:      ${bookingCount}`);
    console.log(`  ✓ Payments created:      ${paymentCount}`);
    console.log(`  ✓ Reviews created:       ${reviewCount}`);
    console.log(`  ✓ Notifications created: ${notificationCount}`);

    console.log('--------------------------------------------------');
    console.log('✓ Database initialization completed successfully!');
    console.log('--------------------------------------------------');
  } catch (error) {
    console.error('✗ Database seeding failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
