import { apiRequest } from './client';

export const dashboardApi = {
  getStats: () => 
    apiRequest('/dashboard/stats'),
};
