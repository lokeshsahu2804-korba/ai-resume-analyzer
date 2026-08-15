/**
 * Payment & Subscription Routes (routes/payment.routes.js)
 * Mounts payment order creation, verification, webhooks, and history endpoints.
 */

const express = require('express');
const router = express.Router();

const paymentController = require('../controllers/payment.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const {
  createOrderSchema,
  verifyPaymentSchema,
  listPaymentsQuerySchema,
  paymentIdParamSchema
} = require('../validators/payment.validator');

// Public Webhook Endpoint (Cryptographically authenticated via Razorpay signature)
router.post('/webhook', paymentController.handleWebhook);

// Protected Candidate Endpoints
router.use(requireAuth);

router.post(
  '/create-order',
  validate(createOrderSchema, 'body'),
  paymentController.createOrder
);

router.post(
  '/verify',
  validate(verifyPaymentSchema, 'body'),
  paymentController.verifyPayment
);

router.get(
  '/',
  validate(listPaymentsQuerySchema, 'query'),
  paymentController.listPayments
);

router.get(
  '/:id',
  validate(paymentIdParamSchema, 'params'),
  paymentController.getPaymentById
);

module.exports = router;
