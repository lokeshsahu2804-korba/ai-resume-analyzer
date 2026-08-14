/**
 * Job Mongoose Model (models/Job.js)
 * Stores job listings, experience levels, requirement criteria, and normalized skills for semantic matching.
 */

const mongoose = require('mongoose');

const requirementsSchema = new mongoose.Schema(
  {
    skills: [{ type: String, trim: true }],
    experience: { type: String, trim: true, default: '' },
    education: { type: String, trim: true, default: '' },
    certifications: [{ type: String, trim: true }]
  },
  { _id: false }
);

const salarySchema = new mongoose.Schema(
  {
    min: { type: Number, default: null },
    max: { type: Number, default: null },
    currency: { type: String, default: 'INR' }
  },
  { _id: false }
);

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true
    },
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true
    },
    location: {
      type: String,
      required: [true, 'Job location is required'],
      trim: true
    },
    type: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'internship'],
      default: 'full-time'
    },
    experienceLevel: {
      type: String,
      enum: ['entry', 'mid', 'senior', 'lead'],
      default: 'mid',
      index: true
    },
    description: {
      type: String,
      required: [true, 'Job description is required']
    },
    requirements: {
      type: requirementsSchema,
      required: true
    },
    salary: {
      type: salarySchema,
      default: () => ({})
    },
    applicationUrl: {
      type: String,
      trim: true,
      default: ''
    },
    source: {
      type: String,
      default: 'manual'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    postedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      default: null
    },
    skillsNormalized: [{
      type: String,
      lowercase: true,
      trim: true,
      index: true
    }]
  },
  {
    timestamps: true
  }
);

// Search & Filtering Indexes
jobSchema.index({ title: 'text', description: 'text' });
jobSchema.index({ isActive: 1, postedAt: -1 });
jobSchema.index({ 'requirements.skills': 1 });

const Job = mongoose.model('Job', jobSchema);

module.exports = Job;
