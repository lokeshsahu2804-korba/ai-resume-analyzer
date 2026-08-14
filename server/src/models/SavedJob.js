/**
 * SavedJob Mongoose Model (models/SavedJob.js)
 * Represents bookmarked jobs saved by users with personal notes.
 */

const mongoose = require('mongoose');

const savedJobSchema = new mongoose.Schema(
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
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    savedAt: {
      type: Date,
      default: Date.now
    }
  }
);

// Compound Unique Index: prevents duplicate bookmarks of the same job by the same user
savedJobSchema.index({ userId: 1, jobId: 1 }, { unique: true });
savedJobSchema.index({ userId: 1, savedAt: -1 });

const SavedJob = mongoose.model('SavedJob', savedJobSchema);

module.exports = SavedJob;
