import { apiRequest } from './client';

export const locationsApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '' && val !== 'all') {
        query.append(key, val);
      }
    });
    const queryString = query.toString();
    return apiRequest(`/locations${queryString ? `?${queryString}` : ''}`);
  },

  getById: (id) => 
    apiRequest(`/locations/${id}`),

  getCities: () => 
    apiRequest('/locations/meta/cities'),

  getOwnerLocations: () => 
    apiRequest('/locations/owner/my-locations'),

  create: (data) => 
    apiRequest('/locations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id, data) => 
    apiRequest(`/locations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getRecommendations: (params = {}) => {
    const query = new URLSearchParams();
    if (params.user_lat) query.append('user_lat', params.user_lat);
    if (params.user_lng) query.append('user_lng', params.user_lng);
    const queryString = query.toString();
    return apiRequest(`/recommendations${queryString ? `?${queryString}` : ''}`);
  },
};
