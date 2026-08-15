/**
 * Razorpay Payment Gateway Configuration (config/razorpay.js)
 * Initializes official Razorpay SDK client with server-side environment secrets.
 * Defines canonical plan pricing, quotas, and subscription durations.
 */

const Razorpay = require('razorpay');
const logger = require('../utils/logger');

// Canonical Plan Configurations (Server-Enforced)
const PLAN_PRICING = {
  free: {
    planId: 'free',
    name: 'Free Plan',
    amountPaise: 0,
    amountINR: 0,
    currency: 'INR',
    durationDays: null, // Forever
    resumeAnalysesLimit: 3
  },
  premium: {
    planId: 'premium',
    name: 'Premium Pro',
    amountPaise: 49900, // ₹499 = 49900 paise
    amountINR: 499,
    currency: 'INR',
    durationDays: 30, // 30-day access period
    resumeAnalysesLimit: 999999 // Unlimited
  }
};

const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_default';
const keySecret = process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_default';

let razorpay = null;

try {
  razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });
  logger.info(`Razorpay SDK initialized in ${keyId.startsWith('rzp_test_') ? 'TEST' : 'LIVE'} mode`);
} catch (err) {
  logger.warn(`Razorpay SDK initialization notice: ${err.message}`);
}

module.exports = {
  razorpay,
  PLAN_PRICING,
  getKeyId: () => process.env.RAZORPAY_KEY_ID || keyId,
  getKeySecret: () => process.env.RAZORPAY_KEY_SECRET || keySecret,
  getWebhookSecret: () => process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_webhook_secret_default'
};
