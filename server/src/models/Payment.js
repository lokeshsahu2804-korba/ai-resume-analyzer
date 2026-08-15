/**
 * Payment Mongoose Model (models/Payment.js)
 * Records Razorpay order transactions, payment signatures, amounts in paise, and audit statuses.
 */

const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    razorpayOrderId: {
      type: String,
      required: [true, 'Razorpay order ID is required'],
      unique: true,
      trim: true
    },
    razorpayPaymentId: {
      type: String,
      default: null,
      trim: true,
      index: true
    },
    razorpaySignature: {
      type: String,
      default: null
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Amount must be a positive value'] // Amount in paise (₹499 = 49900 paise)
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true
    },
    status: {
      type: String,
      enum: ['created', 'paid', 'failed', 'refunded'],
      default: 'created'
    },
    plan: {
      type: String,
      default: 'premium'
    },
    webhookVerified: {
      type: Boolean,
      default: false
    },
    receipt: {
      type: String,
      default: null,
      trim: true
    },
    errorDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  {
    timestamps: true
  }
);

paymentSchema.index({ userId: 1, createdAt: -1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
