/**
 * Payment & Subscription Controller (controllers/payment.controller.js)
 * HTTP handlers for Razorpay order generation, signature verification, webhook intake, and transaction history.
 */

const paymentService = require('../services/payment.service');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Create a new Razorpay checkout order for plan upgrade
 * @route   POST /api/payments/create-order
 * @access  Protected (Candidate)
 */
const createOrder = asyncHandler(async (req, res) => {
  const { plan } = req.body;
  const order = await paymentService.createOrder(req.user._id, plan || 'premium');

  return ApiResponse.success(res, order, 'Razorpay order created successfully', 201);
});

/**
 * @desc    Verify Razorpay payment signature and activate 30-day Premium subscription
 * @route   POST /api/payments/verify
 * @access  Protected (Candidate)
 */
const verifyPayment = asyncHandler(async (req, res) => {
  const result = await paymentService.verifyPayment(req.user._id, req.body);

  return ApiResponse.success(res, result, 'Payment verified successfully and Premium Pro activated');
});

/**
 * @desc    Intake and process asynchronous Razorpay webhook events
 * @route   POST /api/payments/webhook
 * @access  Public (Cryptographically verified via HMAC signature)
 */
const handleWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const rawBody = req.rawBody || JSON.stringify(req.body);

  const result = await paymentService.processWebhook(rawBody, signature);

  return res.status(200).json({ status: 'ok', ...result });
});

/**
 * @desc    List authenticated candidate's payment history with pagination
 * @route   GET /api/payments
 * @access  Protected (Candidate)
 */
const listPayments = asyncHandler(async (req, res) => {
  const data = await paymentService.listPayments(req.user._id, req.query);

  return ApiResponse.success(res, data, 'Payment history retrieved successfully');
});

/**
 * @desc    Get specific payment transaction record by ID
 * @route   GET /api/payments/:id
 * @access  Protected (Candidate)
 */
const getPaymentById = asyncHandler(async (req, res) => {
  const payment = await paymentService.getPaymentById(req.user._id, req.params.id);

  return ApiResponse.success(res, { payment }, 'Payment details retrieved successfully');
});

module.exports = {
  createOrder,
  verifyPayment,
  handleWebhook,
  listPayments,
  getPaymentById
};
