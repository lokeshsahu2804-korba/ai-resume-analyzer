/**
 * API Client Utility (api/client.js)
 * Centralized fetch client configured with CORS credentials and error parsing.
 */
const BASE_URL =
  typeof API_BASE_URL !== 'undefined'
    ? API_BASE_URL
    : typeof window !== 'undefined' && window.API_BASE_URL
      ? window.API_BASE_URL
      : 'https://ai-resume-analyzer-rn7x.onrender.com/api';

/**
 * Standard API request wrapper
 *
 * @param {string} endpoint - API path (e.g. '/auth/login')
 * @param {RequestInit} [options={}] - Standard fetch options
 * @returns {Promise<any>} Parsed response data
 */
export async function apiClient(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers,
    credentials: 'include' // Enforces sending and receiving httpOnly cookies
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);
    const result = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg =
        result?.error?.message ||
        (result?.error?.details && result.error.details.map((d) => d.message).join(', ')) ||
        `HTTP Error ${response.status}`;

      const error = new Error(errorMsg);
      error.statusCode = response.status;
      error.code = result?.error?.code || 'UNKNOWN_ERROR';
      error.details = result?.error?.details || null;
      throw error;
    }

    return result;
  } catch (err) {
    // Network errors or thrown ApiErrors
    if (!err.statusCode) {
      err.message = 'Unable to connect to server. Please check your internet connection.';
    }
    throw err;
  }
}
