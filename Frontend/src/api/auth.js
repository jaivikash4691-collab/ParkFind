import { apiRequest } from './client';

export const authApi = {
  login: (credentials) => 
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  register: (userData) => 
    apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  getMe: () => 
    apiRequest('/auth/me', {
      method: 'GET',
    }),
};
