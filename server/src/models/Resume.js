/**
 * Resume Mongoose Model (models/Resume.js)
 * Stores uploaded resume file metadata and extracted/structured parsing data.
 */

const mongoose = require('mongoose');

const fileMetadataSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    cloudinaryPublicId: { type: String, default: '' },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const experienceEntrySchema = new mongoose.Schema(
  {
    title: { type: String, default: '' },
    company: { type: String, default: '' },
    location: { type: String, default: '' },
    startDate: { type: String, default: '' },
    endDate: { type: String, default: '' },
    current: { type: Boolean, default: false },
    description: { type: String, default: '' },
    achievements: [{ type: String }]
  },
  { _id: false }
);

const educationEntrySchema = new mongoose.Schema(
  {
    degree: { type: String, default: '' },
    field: { type: String, default: '' },
    institution: { type: String, default: '' },
    graduationDate: { type: String, default: '' },
    gpa: { type: String, default: '' }
  },
  { _id: false }
);

const projectEntrySchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    description: { type: String, default: '' },
    technologies: [{ type: String }],
    url: { type: String, default: '' }
  },
  { _id: false }
);

const parsedDataSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    location: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    github: { type: String, default: '' },
    portfolio: { type: String, default: '' },
    summary: { type: String, default: '' },
    skills: [{ type: String, trim: true }],
    experience: [experienceEntrySchema],
    education: [educationEntrySchema],
    certifications: [{ type: String, trim: true }],
    languages: [{ type: String, trim: true }],
    projects: [projectEntrySchema]
  },
  { _id: false }
);

const resumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    file: {
      type: fileMetadataSchema,
      required: true
    },
    extractedText: {
      type: String,
      default: ''
    },
    parsed: {
      type: parsedDataSchema,
      default: () => ({})
    },
    status: {
      type: String,
      enum: ['uploaded', 'processing', 'parsed', 'analyzed', 'failed'],
      default: 'uploaded',
      index: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Performance Indexes
resumeSchema.index({ userId: 1, createdAt: -1 });
resumeSchema.index({ userId: 1, isActive: 1 });

const Resume = mongoose.model('Resume', resumeSchema);

module.exports = Resume;
