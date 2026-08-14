/**
 * ResumeAnalysis Mongoose Model (models/ResumeAnalysis.js)
 * Stores AI ATS scoring breakdown, category ratings, strength/weakness evaluations, and actionable suggestions.
 */

const mongoose = require('mongoose');

const scoreCategorySchema = new mongoose.Schema(
  {
    score: { type: Number, required: true, min: 0 },
    maxScore: { type: Number, required: true },
    details: { type: String, default: '' }
  },
  { _id: false }
);

const atsScoreSchema = new mongoose.Schema(
  {
    overall: {
      type: Number,
      required: [true, 'Overall ATS score is required'],
      min: [0, 'Score cannot be negative'],
      max: [100, 'Score cannot exceed 100']
    },
    breakdown: {
      keywordRelevance: { type: scoreCategorySchema, required: true },
      skillsAnalysis: { type: scoreCategorySchema, required: true },
      experienceQuality: { type: scoreCategorySchema, required: true },
      educationRelevance: { type: scoreCategorySchema, required: true },
      structureFormatting: { type: scoreCategorySchema, required: true },
      quantifiableAchievements: { type: scoreCategorySchema, required: true },
      sectionCompleteness: { type: scoreCategorySchema, required: true }
    }
  },
  { _id: false }
);

const suggestionSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ['skills', 'experience', 'formatting', 'content'],
      required: true
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      required: true
    },
    suggestion: {
      type: String,
      required: true
    },
    example: {
      type: String,
      default: ''
    }
  },
  { _id: false }
);

const skillsAnalysisSchema = new mongoose.Schema(
  {
    technical: [{ type: String }],
    soft: [{ type: String }],
    missing: [{ type: String }],
    trending: [{ type: String }]
  },
  { _id: false }
);

const resumeAnalysisSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
      required: true,
      index: true
    },
    atsScore: {
      type: atsScoreSchema,
      required: true
    },
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    suggestions: [suggestionSchema],
    skillsAnalysis: {
      type: skillsAnalysisSchema,
      default: () => ({})
    },
    aiInsights: {
      type: String,
      default: ''
    },
    isPremium: {
      type: Boolean,
      default: false
    },
    processingTimeMs: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

resumeAnalysisSchema.index({ userId: 1, createdAt: -1 });

const ResumeAnalysis = mongoose.model('ResumeAnalysis', resumeAnalysisSchema);

module.exports = ResumeAnalysis;
