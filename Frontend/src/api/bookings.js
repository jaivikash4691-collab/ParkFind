import { apiRequest } from './client';

export const bookingsApi = {
  create: (bookingData) => 
    apiRequest('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    }),

  getActiveCar: (params = {}) => {
    const query = new URLSearchParams();
    if (params.plate) query.append('plate', params.plate);
    if (params.ref) query.append('ref', params.ref);
    const queryString = query.toString();
    return apiRequest(`/bookings/active-car${queryString ? `?${queryString}` : ''}`);
  },

  getMyBookings: () => 
    apiRequest('/bookings/my-bookings'),

  getOwnerBookings: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/bookings/owner-bookings${query ? `?${query}` : ''}`);
  },

  getByIdOrRef: (idOrRef) => 
    apiRequest(`/bookings/${idOrRef}`),

  extend: (id, hours = 1) => 
    apiRequest(`/bookings/${id}/extend`, {
      method: 'PUT',
      body: JSON.stringify({ hours }),
    }),

  cancel: (id, reason = 'Customer request') => 
    apiRequest(`/bookings/${id}/cancel`, {
      method: 'PUT',
      body: JSON.stringify({ cancellation_reason: reason }),
    }),

  updateStatus: (id, status) => 
    apiRequest(`/bookings/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  getQrPass: (idOrRef) =>
    apiRequest(`/bookings/${idOrRef}/qr-pass`),

  validatePass: (data) =>
    apiRequest('/bookings/validate-pass', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  confirmPayment: (id) =>
    apiRequest(`/bookings/${id}/confirm-payment`, {
      method: 'PUT',
    }),

  submitUtr: (id, utr) =>
    apiRequest(`/bookings/${id}/submit-utr`, {
      method: 'POST',
      body: JSON.stringify({ utr }),
    }),
};


