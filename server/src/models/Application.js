/**
 * Application Mongoose Model (models/Application.js)
 * Tracks user job application lifecycle stages, timeline history, and match scores.
 */

const mongoose = require('mongoose');

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['applied', 'interviewing', 'offered', 'rejected', 'withdrawn'],
      required: true
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    note: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: false }
);

const applicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true
    },
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
      default: null
    },
    status: {
      type: String,
      enum: ['applied', 'interviewing', 'offered', 'rejected', 'withdrawn'],
      default: 'applied'
    },
    appliedAt: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    interviewDate: {
      type: Date,
      default: null
    },
    statusHistory: [statusHistorySchema],
    matchScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Indexes
applicationSchema.index({ userId: 1, jobId: 1 }, { unique: true });
applicationSchema.index({ userId: 1, status: 1 });
applicationSchema.index({ userId: 1, createdAt: -1 });

const Application = mongoose.model('Application', applicationSchema);

module.exports = Application;
