/**
 * Notification Mongoose Model (models/Notification.js)
 * Stores user notifications with 30-day TTL auto-cleanup.
 */

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['analysis_complete', 'job_match', 'payment', 'system'],
      required: true
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({})
    },
    isRead: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }
);

// Indexes
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

// TTL Auto-cleanup Index: Documents automatically deleted by MongoDB 30 days (2,592,000s) after creation
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
