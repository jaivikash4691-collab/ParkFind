const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Standardized API client for Parkit
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // Attach stored JWT token from sessionStorage if present
  try {
    const savedUser = sessionStorage.getItem('parkit_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      if (parsed.token) {
        headers['Authorization'] = `Bearer ${parsed.token}`;
      }
    }
  } catch (e) {
    // Ignore storage parse errors
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Parse JSON response
  let data;
  try {
    data = await response.json();
  } catch (err) {
    throw new Error(`Server returned status ${response.status} with non-JSON response.`);
  }

  if (!response.ok || !data.success) {
    if (response.status === 401) {
      try {
        sessionStorage.removeItem('parkit_user');
      } catch (e) {
        // ignore
      }
    }
    const errorMessage = data?.message || `HTTP ${response.status}: An error occurred while communicating with the server.`;
    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data.data;
}
