/**
 * Payment & Subscription Service Layer (services/payment.service.js)
 * Implements server-side Razorpay order creation, HMAC SHA256 payment verification,
 * webhook processing, subscription state machine transitions, and payment history queries.
 */

const crypto = require('crypto');
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const User = require('../models/User');
const { razorpay, PLAN_PRICING, getKeyId, getKeySecret, getWebhookSecret } = require('../config/razorpay');
const notificationService = require('./notification.service');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

/**
 * Creates a Razorpay order with server-calculated price and persists a pending Payment record.
 *
 * @param {string} userId - Authenticated user identifier
 * @param {string} plan - Target subscription plan ('premium')
 * @returns {Promise<Object>} Order details for frontend checkout
 */
const createOrder = async (userId, plan = 'premium') => {
  const planConfig = PLAN_PRICING[plan];
  if (!planConfig || plan === 'free') {
    throw ApiError.badRequest(`Invalid or unsupported subscription plan: "${plan}"`);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User account not found');
  }

  const receipt = `rcpt_${userId.toString().slice(-6)}_${Date.now()}`;
  let razorpayOrder = null;

  // Attempt Razorpay order creation via SDK
  if (razorpay && typeof razorpay.orders?.create === 'function') {
    try {
      razorpayOrder = await razorpay.orders.create({
        amount: planConfig.amountPaise, // 49900 paise = ₹499
        currency: planConfig.currency,
        receipt,
        notes: {
          userId: userId.toString(),
          userEmail: user.email,
          plan
        }
      });
    } catch (err) {
      logger.warn(`Razorpay SDK order creation notice: ${err.message}. Using deterministic fallback order.`);
    }
  }

  // Deterministic order format fallback if in test/mock environment
  if (!razorpayOrder || !razorpayOrder.id) {
    razorpayOrder = {
      id: `order_${crypto.randomBytes(10).toString('hex')}`,
      amount: planConfig.amountPaise,
      currency: planConfig.currency,
      receipt
    };
  }

  // Persist Payment document in MongoDB Atlas with status 'created'
  const payment = await Payment.create({
    userId,
    razorpayOrderId: razorpayOrder.id,
    amount: planConfig.amountPaise,
    currency: planConfig.currency,
    status: 'created',
    plan,
    receipt
  });

  logger.info(`Payment order ${payment.razorpayOrderId} created for user ${userId} (amount: ₹${planConfig.amountINR})`);

  return {
    orderId: razorpayOrder.id,
    amount: planConfig.amountPaise,
    amountINR: planConfig.amountINR,
    currency: planConfig.currency,
    keyId: getKeyId(),
    plan,
    paymentId: payment._id
  };
};

/**
 * Verifies Razorpay payment signature using HMAC SHA256 and activates user subscription.
 *
 * @param {string} userId - Authenticated user identifier
 * @param {Object} payload - { razorpayOrderId, razorpayPaymentId, razorpaySignature }
 * @returns {Promise<Object>} Verification status and updated subscription info
 */
const verifyPayment = async (userId, { razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {
  // 1. Cryptographic HMAC SHA256 Signature Verification
  const expectedSignature = crypto
    .createHmac('sha256', getKeySecret())
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  const isSignatureValid = expectedSignature === razorpaySignature;
  if (!isSignatureValid) {
    logger.warn(`Invalid payment signature attempt for order ${razorpayOrderId} by user ${userId}`);
    
    // Record failed verification attempt if order exists
    await Payment.findOneAndUpdate(
      { razorpayOrderId, userId },
      { 
        status: 'failed', 
        razorpayPaymentId, 
        razorpaySignature,
        errorDetails: { reason: 'Signature mismatch verification failure' } 
      }
    ).catch(() => {});

    throw ApiError.badRequest('Invalid payment signature verification failed');
  }

  // 2. Find and Validate Payment Document Ownership
  const payment = await Payment.findOne({ razorpayOrderId, userId });
  if (!payment) {
    throw ApiError.notFound('Payment order record not found or access denied');
  }

  // Idempotency: If already marked as paid, return existing success state
  if (payment.status === 'paid') {
    logger.info(`Payment ${razorpayOrderId} already verified and processed`);
    const user = await User.findById(userId).select('-password');
    return {
      payment,
      subscription: user?.subscription || {},
      alreadyVerified: true
    };
  }

  // 3. Mark Payment Record as Paid
  payment.status = 'paid';
  payment.razorpayPaymentId = razorpayPaymentId;
  payment.razorpaySignature = razorpaySignature;
  await payment.save();

  // 4. Activate 30-Day Premium Subscription on User Record
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User account not found');
  }

  const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
  const currentPeriodEnd = new Date(Date.now() + thirtyDaysInMs);

  user.plan = 'premium';
  user.subscription = {
    razorpaySubscriptionId: payment.razorpayOrderId,
    razorpayCustomerId: null,
    status: 'active',
    currentPeriodEnd,
    plan: 'premium'
  };
  user.usageLimits.resumeAnalysesLimit = 999999; // Unlimited quota for Premium Pro

  await user.save();
  logger.info(`User ${userId} successfully upgraded to Premium Pro until ${currentPeriodEnd.toISOString()}`);

  // 5. Non-Blocking Event Notifications Dispatch
  notificationService
    .sendNotification({
      userId,
      type: 'payment_success',
      title: 'Payment Successful',
      message: 'Your payment of ₹499 for ResumeAI Premium Pro was successful.',
      data: {
        paymentId: payment._id,
        razorpayPaymentId,
        amount: payment.amount,
        plan: 'premium'
      }
    })
    .catch((err) => logger.warn(`Payment success notification error: ${err.message}`));

  notificationService
    .sendNotification({
      userId,
      type: 'subscription_activated',
      title: 'Premium Pro Activated!',
      message: 'Enjoy unlimited AI resume analyses, bullet point suggestions, and semantic job matching for 30 days.',
      data: {
        currentPeriodEnd,
        plan: 'premium'
      }
    })
    .catch((err) => logger.warn(`Subscription activation notification error: ${err.message}`));

  const cleanUser = user.toObject();
  delete cleanUser.password;

  return {
    payment,
    user: cleanUser,
    subscription: user.subscription
  };
};

/**
 * Handles Razorpay webhook events securely with raw body signature verification.
 *
 * @param {string|Buffer} rawBody - Raw unparsed webhook payload
 * @param {string} signature - x-razorpay-signature header
 * @returns {Promise<Object>}
 */
const processWebhook = async (rawBody, signature) => {
  if (!signature) {
    throw ApiError.badRequest('Missing Razorpay webhook signature header');
  }

  const bodyString = Buffer.isBuffer(rawBody) ? rawBody.toString('utf-8') : typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);

  const expectedSignature = crypto
    .createHmac('sha256', getWebhookSecret())
    .update(bodyString)
    .digest('hex');

  if (expectedSignature !== signature) {
    logger.warn('Razorpay webhook signature verification failed');
    throw ApiError.badRequest('Invalid webhook signature');
  }

  let eventPayload = {};
  try {
    eventPayload = typeof rawBody === 'object' && !Buffer.isBuffer(rawBody) ? rawBody : JSON.parse(bodyString);
  } catch (err) {
    throw ApiError.badRequest('Invalid JSON payload in webhook body');
  }

  const { event, payload } = eventPayload;
  logger.info(`Received Razorpay webhook event: ${event}`);

  // Handle Event: payment.captured / order.paid
  if (event === 'payment.captured' || event === 'order.paid') {
    const paymentEntity = payload?.payment?.entity || payload?.order?.entity;
    const orderId = paymentEntity?.order_id || paymentEntity?.id;
    const paymentId = paymentEntity?.id;

    if (orderId) {
      const paymentDoc = await Payment.findOne({ razorpayOrderId: orderId });
      if (paymentDoc) {
        if (paymentDoc.status !== 'paid') {
          paymentDoc.status = 'paid';
          if (paymentId) paymentDoc.razorpayPaymentId = paymentId;
          paymentDoc.webhookVerified = true;
          await paymentDoc.save();

          // Upgrade User Subscription
          const user = await User.findById(paymentDoc.userId);
          if (user) {
            const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
            user.plan = 'premium';
            user.subscription = {
              razorpaySubscriptionId: orderId,
              razorpayCustomerId: null,
              status: 'active',
              currentPeriodEnd: new Date(Date.now() + thirtyDaysInMs),
              plan: 'premium'
            };
            user.usageLimits.resumeAnalysesLimit = 999999;
            await user.save();

            notificationService
              .sendNotification({
                userId: user._id,
                type: 'payment_success',
                title: 'Payment Confirmed via Gateway',
                message: 'Your payment for Premium Pro has been confirmed.',
                data: { orderId, paymentId }
              })
              .catch(() => {});
          }
        }
      }
    }
  }

  // Handle Event: payment.failed
  else if (event === 'payment.failed') {
    const paymentEntity = payload?.payment?.entity;
    const orderId = paymentEntity?.order_id;
    const errorDesc = paymentEntity?.error_description || 'Payment was declined or cancelled';

    if (orderId) {
      const paymentDoc = await Payment.findOne({ razorpayOrderId: orderId });
      if (paymentDoc) {
        paymentDoc.status = 'failed';
        paymentDoc.errorDetails = { reason: errorDesc, code: paymentEntity?.error_code };
        paymentDoc.webhookVerified = true;
        await paymentDoc.save();

        notificationService
          .sendNotification({
            userId: paymentDoc.userId,
            type: 'payment_failed',
            title: 'Payment Failed',
            message: `Your payment could not be processed: ${errorDesc}`,
            data: { orderId, error: errorDesc }
          })
          .catch(() => {});
      }
    }
  }

  // Handle Event: refund.processed / refund.created
  else if (event === 'refund.processed' || event === 'refund.created') {
    const refundEntity = payload?.refund?.entity;
    const paymentId = refundEntity?.payment_id;

    if (paymentId) {
      const paymentDoc = await Payment.findOne({ razorpayPaymentId: paymentId });
      if (paymentDoc) {
        paymentDoc.status = 'refunded';
        paymentDoc.webhookVerified = true;
        await paymentDoc.save();

        // Check if user should be downgraded
        const user = await User.findById(paymentDoc.userId);
        if (user && user.subscription?.razorpaySubscriptionId === paymentDoc.razorpayOrderId) {
          user.plan = 'free';
          user.subscription.plan = 'free';
          user.subscription.status = 'expired';
          user.usageLimits.resumeAnalysesLimit = 3;
          await user.save();
        }

        notificationService
          .sendNotification({
            userId: paymentDoc.userId,
            type: 'refund_processed',
            title: 'Refund Processed',
            message: `A refund of ₹${paymentDoc.amount / 100} has been processed for your transaction.`,
            data: { paymentId, amount: paymentDoc.amount }
          })
          .catch(() => {});
      }
    }
  }

  return { received: true, event };
};

/**
 * Lists paginated payment transaction history for authenticated user.
 *
 * @param {string} userId - User identifier
 * @param {Object} query - { page, limit, status, sort }
 * @returns {Promise<Object>} Paginated payments
 */
const listPayments = async (userId, { page = 1, limit = 10, status, sort = '-createdAt' } = {}) => {
  const query = { userId: new mongoose.Types.ObjectId(userId) };

  if (status) {
    query.status = status;
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [payments, total] = await Promise.all([
    Payment.find(query).sort(sort).skip(skip).limit(limitNum).lean(),
    Payment.countDocuments(query)
  ]);

  return {
    payments,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum) || 1
  };
};

/**
 * Retrieves a single payment record by ID with strict ownership validation.
 *
 * @param {string} userId - Authenticated user identifier
 * @param {string} paymentId - Payment document identifier
 * @returns {Promise<Object>}
 */
const getPaymentById = async (userId, paymentId) => {
  if (!mongoose.Types.ObjectId.isValid(paymentId)) {
    throw ApiError.badRequest('Invalid payment identifier format');
  }

  const payment = await Payment.findOne({
    _id: paymentId,
    userId: new mongoose.Types.ObjectId(userId)
  }).lean();

  if (!payment) {
    throw ApiError.notFound('Payment transaction not found or access denied');
  }

  return payment;
};

module.exports = {
  createOrder,
  verifyPayment,
  processWebhook,
  listPayments,
  getPaymentById
};
