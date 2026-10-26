const { pool } = require('../config/db');

async function inspect() {
  try {
    const [userCols] = await pool.query('SHOW COLUMNS FROM users');
    console.log('users columns:', userCols.map(c => `${c.Field} (${c.Type})`));

    const [payCols] = await pool.query('SHOW COLUMNS FROM payments');
    console.log('payments columns:', payCols.map(c => `${c.Field} (${c.Type})`));

    const [bookCols] = await pool.query('SHOW COLUMNS FROM bookings');
    console.log('bookings columns:', bookCols.map(c => `${c.Field} (${c.Type})`));

    const [locCols] = await pool.query('SHOW COLUMNS FROM parking_locations');
    console.log('parking_locations columns:', locCols.map(c => `${c.Field} (${c.Type})`));

    const [ownerUsers] = await pool.query("SELECT id, full_name, email, role FROM users WHERE role = 'owner'");
    console.log('Owner users:', ownerUsers);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

inspect();
