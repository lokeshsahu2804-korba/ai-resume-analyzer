/**
 * User Mongoose Model (models/User.js)
 * Stores user account credentials, profile details, usage quotas, and subscription tier.
 */

const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema(
  {
    phone: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: '' },
    linkedin: { type: String, trim: true, default: '' },
    github: { type: String, trim: true, default: '' },
    portfolio: { type: String, trim: true, default: '' },
    bio: { type: String, trim: true, default: '' }
  },
  { _id: false }
);

const usageLimitsSchema = new mongoose.Schema(
  {
    resumeAnalysesUsed: { type: Number, default: 0, min: 0 },
    resumeAnalysesLimit: { type: Number, default: 3, min: 0 },
    lastResetDate: { type: Date, default: Date.now }
  },
  { _id: false }
);

const subscriptionSchema = new mongoose.Schema(
  {
    razorpaySubscriptionId: { type: String, default: null },
    razorpayCustomerId: { type: String, default: null },
    status: {
      type: String,
      enum: ['none', 'active', 'cancelled', 'expired'],
      default: 'none',
      index: true
    },
    currentPeriodEnd: { type: Date, default: null },
    plan: { type: String, default: 'free' }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long']
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
      index: true
    },
    plan: {
      type: String,
      enum: ['free', 'premium'],
      default: 'free'
    },
    profile: {
      type: profileSchema,
      default: () => ({})
    },
    usageLimits: {
      type: usageLimitsSchema,
      default: () => ({})
    },
    subscription: {
      type: subscriptionSchema,
      default: () => ({})
    }
  },
  {
    timestamps: true
  }
);

const User = mongoose.model('User', userSchema);

module.exports = User;
