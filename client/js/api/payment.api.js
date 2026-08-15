/**
 * Payment API Client (api/payment.api.js)
 * Fetch client for Razorpay order generation, signature verification, and transaction history.
 */

import { apiClient } from './client.js';

/**
 * Creates a server-side Razorpay order for plan upgrade.
 *
 * @param {string} [plan='premium'] - Target subscription plan
 * @returns {Promise<any>}
 */
export async function createOrderApi(plan = 'premium') {
  return apiClient('/payments/create-order', {
    method: 'POST',
    body: JSON.stringify({ plan })
  });
}

/**
 * Verifies Razorpay payment signature and activates 30-day Premium Pro subscription.
 *
 * @param {Object} payload - { razorpayOrderId, razorpayPaymentId, razorpaySignature }
 * @returns {Promise<any>}
 */
export async function verifyPaymentApi(payload) {
  return apiClient('/payments/verify', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

/**
 * Retrieves candidate's paginated payment transaction history.
 *
 * @param {Object} [params={}] - { page, limit, status }
 * @returns {Promise<any>}
 */
export async function getPaymentsApi(params = {}) {
  const cleanParams = {};
  Object.keys(params).forEach((k) => {
    if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
      cleanParams[k] = params[k];
    }
  });

  const queryStr = new URLSearchParams(cleanParams).toString();
  return apiClient(queryStr ? `/payments?${queryStr}` : '/payments', {
    method: 'GET'
  });
}

/**
 * Retrieves a single payment record by ID.
 *
 * @param {string} paymentId
 * @returns {Promise<any>}
 */
export async function getPaymentByIdApi(paymentId) {
  return apiClient(`/payments/${paymentId}`, {
    method: 'GET'
  });
}

/**
 * Cancels authenticated candidate's active Premium subscription.
 *
 * @returns {Promise<any>}
 */
export async function cancelSubscriptionApi() {
  return apiClient('/payments/cancel-subscription', {
    method: 'POST'
  });
}
