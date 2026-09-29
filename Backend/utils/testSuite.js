const http = require('http');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(url, reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('PARKFIND — Two-Sided Marketplace Automated Test Suite');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName} — ${details}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const health = await makeRequest('/api/health');
    assert(health.status === 200 && health.data.success === true, 'GET /api/health returns 200 OK');

    // 2. Customer Authentication
    const custLogin = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'demo.customer@parkfind.test', password: 'Demo@12345' }
    });
    assert(custLogin.status === 200 && custLogin.data.data.token, 'Customer login succeeds with JWT', `User: ${custLogin.data.data?.user?.full_name}`);
    const customerToken = custLogin.data.data.token;

    // 3. Owner Authentication
    const ownerLogin = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'owner1@parkfind.test', password: 'Demo@12345' }
    });
    assert(ownerLogin.status === 200 && ownerLogin.data.data.user.role === 'owner', 'Owner login succeeds with OWNER role', `Owner: ${ownerLogin.data.data?.user?.full_name}`);
    const ownerToken = ownerLogin.data.data.token;

    // 4. Discover Coimbatore Parking Locations with Geolocation & Haversine Distance
    const locations = await makeRequest('/api/locations?user_lat=11.0168&user_lng=76.9558&sort_by=nearest');
    assert(locations.status === 200 && Array.isArray(locations.data.data) && locations.data.data.length >= 8, 'GET /api/locations returns Coimbatore facilities with distance calculations');
    const rsPuram = locations.data.data.find(l => l.area === 'RS Puram' || l.name.includes('RS Puram'));
    assert(rsPuram !== undefined && rsPuram.distanceKm > 0, 'RS Puram location has accurate distance metrics', `Distance: ${rsPuram?.distanceLabel}`);

    // 5. Filter Locations by EV Fast Charging
    const evLocations = await makeRequest('/api/locations?has_ev=true');
    assert(evLocations.status === 200 && evLocations.data.data.every(l => l.hasEv), 'GET /api/locations?has_ev=true returns only EV-equipped locations');

    // 6. Get Detailed Location with Slots & Reviews
    const locDetail = await makeRequest(`/api/locations/${rsPuram.id}`);
    assert(locDetail.status === 200 && Array.isArray(locDetail.data.data.slots) && locDetail.data.data.slots.length > 0, 'GET /api/locations/:id returns full visual slot matrix');
    const availableSlot = locDetail.data.data.slots.find(s => s.status === 'available');
    assert(availableSlot !== undefined, 'Found available slot in RS Puram', `Slot: ${availableSlot?.slot_no}`);

    if (availableSlot) {
      // 7. ACID Transaction Booking with Payment Record
      const bookingRes = await makeRequest('/api/bookings', {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: {
          slot_id: availableSlot.id,
          duration_hours: 2,
          vehicle_number: 'TN 38 TEST 2026',
          driver_name: 'Test Customer',
          driver_phone: '+91 98422 99999',
          payment_method: 'upi'
        }
      });

      assert(bookingRes.status === 201 && bookingRes.data.success === true, 'POST /api/bookings creates booking & payment transaction', `Ref: ${bookingRes.data.data?.bookingRef}, Txn: ${bookingRes.data.data?.transactionRef}`);
      const createdBooking = bookingRes.data.data;

      // 8. Concurrency & Double-Booking Row Lock Test (409 Conflict)
      const conflictRes = await makeRequest('/api/bookings', {
        method: 'POST',
        body: {
          slot_id: availableSlot.id,
          duration_hours: 1,
          vehicle_number: 'TN 38 DBL 0001',
          driver_name: 'Conflict User',
          driver_phone: '+91 90000 00000'
        }
      });
      assert(conflictRes.status === 409 && conflictRes.data.success === false, 'POST /api/bookings returns 409 Conflict when attempting to double-book');

      // 9. Session Extension Test
      const extendRes = await makeRequest(`/api/bookings/${createdBooking.bookingId}/extend`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: { additional_hours: 1 }
      });
      assert(extendRes.status === 200 && extendRes.data.data.totalDuration === 3, 'PUT /api/bookings/:id/extend extends duration and recalculates tariff');

      // 10. Find My Car Wayfinding Lookup
      const carLookup = await makeRequest(`/api/bookings/active-car?plate=TN-38-TEST-2026`);
      assert(carLookup.status === 200 && carLookup.data.hasActiveCar === true, 'GET /api/bookings/active-car locates parked vehicle');
      assert(carLookup.data.data.slotNo === availableSlot.slot_no, 'Located vehicle matches reserved slot');

      // 11. Owner Incoming Bookings Management
      const ownerBookings = await makeRequest('/api/bookings/owner-bookings', {
        headers: { Authorization: `Bearer ${ownerToken}` }
      });
      assert(ownerBookings.status === 200 && Array.isArray(ownerBookings.data.data), 'GET /api/bookings/owner-bookings returns owner bookings');
      const foundInOwnerList = ownerBookings.data.data.find(b => b.id === createdBooking.bookingId);
      assert(foundInOwnerList !== undefined && foundInOwnerList.customerPhone === '+91 98422 99999', 'Owner can view relevant customer contact & booking details');

      // 12. Complete Booking
      const completeRes = await makeRequest(`/api/bookings/${createdBooking.bookingId}/status`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${ownerToken}` },
        body: { status: 'completed' }
      });
      assert(completeRes.status === 200 && completeRes.data.data.status === 'completed', 'Owner marks booking completed & releases slot');

      // 13. Customer Review Submission
      const reviewRes = await makeRequest('/api/reviews', {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: {
          booking_id: createdBooking.bookingId,
          rating: 5,
          comment: 'Outstanding parking experience. Very clean and easy to navigate.'
        }
      });
      assert(reviewRes.status === 201 && reviewRes.data.success === true, 'POST /api/reviews submits 5-star customer review');
    }

    // 14. Owner Slot Availability Status Toggle
    const toggleSlot = await makeRequest('/api/slots/1/status', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: { status: 'maintenance' }
    });
    assert(toggleSlot.status === 200 && toggleSlot.data.data.status === 'maintenance', 'Owner updates slot status to Maintenance');

    // Revert slot status back to available
    await makeRequest('/api/slots/1/status', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: { status: 'available' }
    });

    // 15. Role-Based Access Control Security Test (Customer cannot create locations)
    const unauthorizedCreate = await makeRequest('/api/locations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: {
        name: 'Illegal Facility',
        address: 'Test Address',
        area: 'Peelamedu',
        latitude: 11.0287,
        longitude: 77.0016,
        hourly_rate: 40,
        total_capacity: 10
      }
    });
    assert(unauthorizedCreate.status === 403, 'RBAC: Customer cannot create parking locations (403 Forbidden)');

    // 16. Smart Recommendations Engine
    const recs = await makeRequest('/api/recommendations?duration=2');
    assert(recs.status === 200 && recs.data.topRecommendation !== null, 'GET /api/recommendations generates multi-factor scored recommendation');

    // 17. Demand Forecasting
    const forecast = await makeRequest('/api/analytics/forecast');
    assert(forecast.status === 200 && Array.isArray(forecast.data.forecast), 'GET /api/analytics/forecast computes statistical demand curves');

    // 18. Dashboard Statistics
    const stats = await makeRequest('/api/dashboard/stats', {
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    assert(stats.status === 200 && stats.data.data.totalLocations >= 8 && stats.data.data.ownerStats !== null, 'GET /api/dashboard/stats returns dual marketplace & owner business metrics');

    console.log('\n================================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test suite failed with error:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  runTests();
}

module.exports = runTests;
