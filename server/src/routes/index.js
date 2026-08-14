/**
 * Master Router Aggregator (routes/index.js)
 * Mounts all sub-routers under their respective /api namespaces.
 */

const express = require('express');
const router = express.Router();

const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const resumeRoutes = require('./resume.routes');
const jobRoutes = require('./job.routes');
const adminRoutes = require('./admin.routes');

// Route Registrations
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/resumes', resumeRoutes);
router.use('/jobs', jobRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
