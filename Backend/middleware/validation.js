/**
 * Input validation helpers for ParkFind REST endpoints
 */

function validateBookingInput(req, res, next) {
  const { slot_id, duration_hours, vehicle_number, driver_name, driver_phone } = req.body;

  if (!slot_id || isNaN(parseInt(slot_id, 10))) {
    const error = new Error('Valid slot_id is required.');
    error.statusCode = 400;
    return next(error);
  }

  const duration = parseInt(duration_hours, 10);
  if (isNaN(duration) || duration < 1 || duration > 48) {
    const error = new Error('Duration must be between 1 and 48 hours.');
    error.statusCode = 400;
    return next(error);
  }

  if (!vehicle_number || typeof vehicle_number !== 'string' || vehicle_number.trim().length < 4) {
    const error = new Error('A valid vehicle registration number is required (min 4 characters).');
    error.statusCode = 400;
    return next(error);
  }

  if (!driver_name || typeof driver_name !== 'string' || driver_name.trim().length < 2) {
    const error = new Error('Driver name is required.');
    error.statusCode = 400;
    return next(error);
  }

  if (!driver_phone || typeof driver_phone !== 'string' || driver_phone.trim().length < 8) {
    const error = new Error('Valid contact phone number is required.');
    error.statusCode = 400;
    return next(error);
  }

  next();
}

function validateLocationInput(req, res, next) {
  const { name, address, area, latitude, longitude, hourly_rate, total_capacity } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length < 3) {
    const error = new Error('Location name must be at least 3 characters.');
    error.statusCode = 400;
    return next(error);
  }

  if (!address || typeof address !== 'string' || address.trim().length < 5) {
    const error = new Error('Valid address is required.');
    error.statusCode = 400;
    return next(error);
  }

  if (!area || typeof area !== 'string' || area.trim().length < 2) {
    const error = new Error('Area is required (e.g. RS Puram, Gandhipuram).');
    error.statusCode = 400;
    return next(error);
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    const error = new Error('Valid GPS coordinates (latitude, longitude) are required.');
    error.statusCode = 400;
    return next(error);
  }

  const rate = parseFloat(hourly_rate);
  if (isNaN(rate) || rate < 0) {
    const error = new Error('Hourly rate must be a non-negative number.');
    error.statusCode = 400;
    return next(error);
  }

  const capacity = parseInt(total_capacity, 10);
  if (isNaN(capacity) || capacity < 1) {
    const error = new Error('Total capacity must be at least 1.');
    error.statusCode = 400;
    return next(error);
  }

  next();
}

module.exports = {
  validateBookingInput,
  validateLocationInput
};
