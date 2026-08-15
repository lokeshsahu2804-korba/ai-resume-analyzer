/**
 * Subscription Lifecycle & Billing Automation Scheduler (services/subscriptionScheduler.service.js)
 * Implements automated expiration sweeps, stale order reconciliation, and non-blocking background intervals.
 */

const User = require('../models/User');
const Payment = require('../models/Payment');
const notificationService = require('./notification.service');
const logger = require('../utils/logger');

let schedulerInterval = null;

/**
 * Sweeps the database for expired Premium subscriptions and atomically downgrades accounts to Free tier.
 *
 * @returns {Promise<{ expiredCount: number, userIds: string[] }>}
 */
const runExpirationSweep = async () => {
  const now = new Date();
  logger.info(`[Subscription Scheduler] Starting automated expiration sweep at ${now.toISOString()}`);

  try {
    const expiredUsers = await User.find({
      'subscription.status': { $in: ['active', 'cancelled'] },
      'subscription.currentPeriodEnd': { $lte: now }
    });

    const downgradedIds = [];

    for (const user of expiredUsers) {
      try {
        const previousEnd = user.subscription?.currentPeriodEnd;
        user.plan = 'free';
        user.subscription.plan = 'free';
        user.subscription.status = 'expired';
        user.usageLimits.resumeAnalysesLimit = 3;

        await user.save();
        downgradedIds.push(user._id.toString());
        logger.info(`[Subscription Scheduler] Downgraded expired user ${user._id} to Free tier (ended: ${previousEnd})`);

        // Non-blocking expiration notification dispatch
        notificationService
          .sendNotification({
            userId: user._id,
            type: 'subscription_expired',
            title: 'Premium Pro Subscription Expired',
            message: 'Your 30-day Premium Pro access period has ended. You have been switched to the Free tier (3 analyses/month). Renew anytime to regain unlimited AI analyses.',
            data: {
              expiredAt: now,
              plan: 'free'
            }
          })
          .catch((err) => logger.warn(`[Subscription Scheduler] Notification dispatch error for user ${user._id}: ${err.message}`));
      } catch (userErr) {
        logger.error(`[Subscription Scheduler] Error downgrading user ${user._id}: ${userErr.message}`);
      }
    }

    logger.info(`[Subscription Scheduler] Expiration sweep completed. ${downgradedIds.length} user(s) downgraded.`);
    return {
      expiredCount: downgradedIds.length,
      userIds: downgradedIds
    };
  } catch (err) {
    logger.error(`[Subscription Scheduler] Expiration sweep failed: ${err.message}`);
    return { expiredCount: 0, userIds: [] };
  }
};

/**
 * Cleans up and reconciles unfulfilled payment orders created more than 24 hours ago.
 *
 * @returns {Promise<{ cleanedCount: number }>}
 */
const cleanupStaleOrders = async () => {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  try {
    const result = await Payment.updateMany(
      {
        status: 'created',
        createdAt: { $lt: cutoff }
      },
      {
        $set: {
          status: 'failed',
          errorDetails: { reason: 'Order expired after 24 hours of inactivity' }
        }
      }
    );

    if (result.modifiedCount > 0) {
      logger.info(`[Subscription Scheduler] Reconciled ${result.modifiedCount} stale created payment orders to 'failed'.`);
    }

    return { cleanedCount: result.modifiedCount || 0 };
  } catch (err) {
    logger.warn(`[Subscription Scheduler] Stale payment cleanup notice: ${err.message}`);
    return { cleanedCount: 0 };
  }
};

/**
 * Initializes the background scheduler on server startup.
 * Runs an immediate sweep followed by recurring intervals every 60 minutes.
 */
const startSubscriptionScheduler = () => {
  if (schedulerInterval) {
    return schedulerInterval;
  }

  logger.info('[Subscription Scheduler] Initializing subscription lifecycle scheduler (Interval: 60 minutes)...');

  // 1. Immediate startup sweep
  (async () => {
    try {
      await runExpirationSweep();
      await cleanupStaleOrders();
    } catch (err) {
      logger.warn(`[Subscription Scheduler] Startup sweep notice: ${err.message}`);
    }
  })();

  // 2. Recurring sweep every 60 minutes
  const intervalMs = 60 * 60 * 1000;
  schedulerInterval = setInterval(async () => {
    try {
      await runExpirationSweep();
      await cleanupStaleOrders();
    } catch (err) {
      logger.warn(`[Subscription Scheduler] Periodic execution notice: ${err.message}`);
    }
  }, intervalMs);

  // Prevent scheduler from blocking server process termination
  if (schedulerInterval.unref) {
    schedulerInterval.unref();
  }

  return schedulerInterval;
};

/**
 * Stops the background scheduler (for testing and teardown).
 */
const stopSubscriptionScheduler = () => {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    logger.info('[Subscription Scheduler] Subscription lifecycle scheduler stopped.');
  }
};

module.exports = {
  runExpirationSweep,
  cleanupStaleOrders,
  startSubscriptionScheduler,
  stopSubscriptionScheduler
};
