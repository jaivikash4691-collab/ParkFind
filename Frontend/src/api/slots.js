import { apiRequest } from './client';

export const slotsApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/slots${query ? `?${query}` : ''}`);
  },

  getById: (id) => 
    apiRequest(`/slots/${id}`),

  updateStatus: (id, status) => 
    apiRequest(`/slots/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  addSlot: (slotData) => 
    apiRequest('/slots', {
      method: 'POST',
      body: JSON.stringify(slotData),
    }),
};
