import { apiRequest } from './client';

export const reviewsApi = {
  create: (reviewData) => 
    apiRequest('/reviews', {
      method: 'POST',
      body: JSON.stringify(reviewData),
    }),

  getByLocation: (locationId) => 
    apiRequest(`/reviews/location/${locationId}`),
};
