const http = require('http');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

function request(urlPath, method = 'GET', data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE_URL);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = { method, headers };

    const req = http.request(url, options, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch (e) {
          resolve({ status: res.statusCode, raw });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runSimulation() {
  console.log('================================================================');
  console.log('PARKFIND — Coimbatore Two-Sided Marketplace Simulation');
  console.log('================================================================\n');

  // Step 1: Customer Login
  console.log('[Step 1] Customer logs in...');
  const custAuth = await request('/api/auth/login', 'POST', {
    email: 'demo.customer@parkfind.test',
    password: 'Demo@12345'
  });
  const custToken = custAuth.body.data.token;
  console.log(`  ✓ Signed in as: ${custAuth.body.data.user.full_name} (${custAuth.body.data.user.role})`);

  // Step 2: Search Nearby Parking in Coimbatore with Geolocation
  console.log('\n[Step 2] Customer searches for nearby parking around RS Puram...');
  const locRes = await request('/api/locations?user_lat=11.0084&user_lng=76.9482&sort_by=nearest');
  const topMatch = locRes.body.data.find(l => l.name.includes('RS Puram')) || locRes.body.data[0];
  console.log(`  ✓ Target facility: ${topMatch.name} in ${topMatch.area} (${topMatch.distanceLabel || 'Coimbatore'})`);
  console.log(`    - Tariff: ₹${topMatch.hourlyRate}/hr | Available: ${topMatch.availableSlots}/${topMatch.totalCapacity} bays`);

  // Step 3: View Location Detail & Pick Slot
  console.log(`\n[Step 3] Customer views layout of ${topMatch.name}...`);
  const locDetail = await request(`/api/locations/${topMatch.id}`);
  const availSlot = locDetail.body.data.slots.find(s => s.status === 'available');
  console.log(`  ✓ Selected Bay: ${availSlot.slot_no} (${availSlot.slot_type})`);

  // Step 4: Reserve Slot & Complete Demo Payment
  console.log(`\n[Step 4] Customer books Bay ${availSlot.slot_no} for 2 hours via Demo UPI...`);
  const bookingRes = await request('/api/bookings', 'POST', {
    slot_id: availSlot.id,
    duration_hours: 2,
    vehicle_number: 'TN 38 SIM 2026',
    driver_name: 'Raveendran K',
    driver_phone: '+91 98422 10101',
    payment_method: 'upi'
  }, custToken);

  const booking = bookingRes.body.data;
  console.log(`  ✓ Booking Confirmed! Ref: ${booking.bookingRef}`);
  console.log(`    - Payment Txn:  ${booking.transactionRef} (PAID ₹${booking.totalAmount})`);
  console.log(`    - Direction:    ${booking.directions}`);

  // Step 5: Find My Car Verification
  console.log('\n[Step 5] Customer opens "Find My Car"...');
  const carLoc = await request(`/api/bookings/active-car?plate=TN-38-SIM-2026`);
  console.log(`  ✓ Car Located: Bay ${carLoc.body.data.slotNo} at ${carLoc.body.data.locationName}`);
  console.log(`    - Time Remaining: ${Math.floor(carLoc.body.data.remainingSeconds / 60)} minutes`);

  // Step 6: Owner Login & Management
  console.log('\n[Step 6] Parking Owner logs in to inspect incoming check-in...');
  const ownerAuth = await request('/api/auth/login', 'POST', {
    email: 'owner1@parkfind.test',
    password: 'Demo@12345'
  });
  const ownerToken = ownerAuth.body.data.token;
  console.log(`  ✓ Signed in as: ${ownerAuth.body.data.user.full_name} (${ownerAuth.body.data.user.role})`);

  const ownerBookings = await request('/api/bookings/owner-bookings', 'GET', null, ownerToken);
  const matched = ownerBookings.body.data.find(b => b.id === booking.bookingId);
  console.log(`  ✓ Owner verifies incoming booking for ${matched.customerName} (${matched.vehicleNumber})`);
  console.log(`    - Slot: ${matched.slotNo} | Paid: ₹${matched.totalAmount} | Status: ${matched.bookingStatus}`);

  // Step 7: Owner marks session completed
  console.log('\n[Step 7] Owner marks booking completed at exit gate...');
  const completeRes = await request(`/api/bookings/${booking.bookingId}/status`, 'PUT', { status: 'completed' }, ownerToken);
  console.log(`  ✓ ${completeRes.body.message}`);

  // Step 8: Customer submits review
  console.log('\n[Step 8] Customer leaves a 5-star rating & review...');
  const reviewRes = await request('/api/reviews', 'POST', {
    booking_id: booking.bookingId,
    rating: 5,
    comment: 'Super easy parking process and seamless wayfinding in Coimbatore!'
  }, custToken);
  console.log(`  ✓ Review submitted: 5 ★ ("${reviewRes.body.data.comment}")`);

  console.log('\n================================================================');
  console.log('✓ TWO-SIDED MARKETPLACE SIMULATION COMPLETED WITH 100% SUCCESS!');
  console.log('================================================================');
}

if (require.main === module) {
  runSimulation();
}

module.exports = runSimulation;
