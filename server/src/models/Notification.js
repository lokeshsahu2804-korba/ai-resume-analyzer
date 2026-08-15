/**
 * Notification Mongoose Model (models/Notification.js)
 * Stores candidate alerts and platform event notifications with 30-day TTL auto-cleanup.
 */

const mongoose = require('mongoose');

const NOTIFICATION_TYPES = [
  'application_submitted',
  'application_status_changed',
  'interview_scheduled',
  'offer_received',
  'application_rejected',
  'application_withdrawn',
  'resume_processed',
  'resume_processing_failed',
  'analysis_complete',
  'quota_warning',
  'job_match',
  'plan_updated',
  'system'
];

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
      enum: NOTIFICATION_TYPES,
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

// Compound Index for fast user notification retrieval and unread filtering
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

// TTL Auto-cleanup Index: Documents automatically deleted by MongoDB 30 days (2,592,000s) after creation
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

const Notification = mongoose.model('Notification', notificationSchema);

Notification.TYPES = NOTIFICATION_TYPES;

module.exports = Notification;
