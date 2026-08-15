/**
 * Payment & Subscription Request Validation Schemas (validators/payment.validator.js)
 * Validates order creation, HMAC signature verification, query filters, and payment ID parameters.
 */

const Joi = require('joi');

const createOrderSchema = Joi.object({
  plan: Joi.string().valid('premium').required().messages({
    'any.only': 'Only the "premium" plan is currently available for purchase',
    'any.required': 'Plan identifier is required'
  })
});

const verifyPaymentSchema = Joi.object({
  razorpayOrderId: Joi.string().trim().required().messages({
    'any.required': 'Razorpay order ID is required'
  }),
  razorpayPaymentId: Joi.string().trim().required().messages({
    'any.required': 'Razorpay payment ID is required'
  }),
  razorpaySignature: Joi.string().trim().required().messages({
    'any.required': 'Razorpay payment signature is required'
  })
});

const listPaymentsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string().valid('created', 'paid', 'failed', 'refunded').optional(),
  sort: Joi.string().valid('createdAt', '-createdAt').default('-createdAt')
});

const paymentIdParamSchema = Joi.object({
  id: Joi.string()
    .hex()
    .length(24)
    .required()
    .messages({
      'string.hex': 'Payment ID must be a valid 24-character hexadecimal ObjectId',
      'string.length': 'Payment ID must be exactly 24 characters long',
      'any.required': 'Payment ID parameter is required'
    })
});

module.exports = {
  createOrderSchema,
  verifyPaymentSchema,
  listPaymentsQuerySchema,
  paymentIdParamSchema
};
