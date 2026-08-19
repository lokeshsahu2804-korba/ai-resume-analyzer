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

  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  // 15-second timeout via AbortController/AbortSignal
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 15000) : null;

  const config = {
    ...options,
    headers,
    signal: options.signal || controller?.signal,
    credentials: 'include' // Enforces sending and receiving httpOnly cookies
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);
    if (timeoutId) clearTimeout(timeoutId);
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
    if (timeoutId) clearTimeout(timeoutId);
    // Network errors or thrown ApiErrors
    if (!err.statusCode) {
      if (err.name === 'AbortError') {
        err.message = 'Request timed out. Please try again.';
      } else {
        err.message = 'Unable to connect to server. Please check your internet connection.';
      }
    }
    throw err;
  }
}
