/**
 * User Profile & Account API Endpoints (api/user.api.js)
 */

import { apiClient } from './client.js';

export async function getProfileApi() {
  return apiClient('/users/me', {
    method: 'GET'
  });
}

export async function updateProfileApi(data) {
  return apiClient('/users/profile', {
    method: 'PUT',
    body: data
  });
}

export async function changePasswordApi(data) {
  return apiClient('/users/password', {
    method: 'PUT',
    body: data
  });
}

export async function getSubscriptionApi() {
  return apiClient('/users/subscription', {
    method: 'GET'
  });
}

export async function deleteAccountApi() {
  return apiClient('/users/account', {
    method: 'DELETE'
  });
}
