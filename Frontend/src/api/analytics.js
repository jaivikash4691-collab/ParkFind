import { apiRequest } from './client';

export const analyticsApi = {
  getDemandForecast: () => 
    apiRequest('/analytics/forecast'),
};
