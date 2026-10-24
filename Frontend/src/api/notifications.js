import { apiRequest } from './client';

export const notificationsApi = {
  getAll: () => 
    apiRequest('/notifications'),

  markRead: (id) => 
    apiRequest(`/notifications/${id}/read`, {
      method: 'PUT',
    }),

  markAllRead: () => 
    apiRequest('/notifications/read-all', {
      method: 'PUT',
    }),
};
