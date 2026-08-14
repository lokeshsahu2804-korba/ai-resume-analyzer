/**
 * Authentication API Endpoints (api/auth.api.js)
 */

import { apiClient } from './client.js';

export async function signupApi(data) {
  return apiClient('/auth/signup', {
    method: 'POST',
    body: data
  });
}

export async function loginApi(data) {
  return apiClient('/auth/login', {
    method: 'POST',
    body: data
  });
}

export async function logoutApi() {
  return apiClient('/auth/logout', {
    method: 'POST'
  });
}

export async function getMeApi() {
  return apiClient('/auth/me', {
    method: 'GET'
  });
}
