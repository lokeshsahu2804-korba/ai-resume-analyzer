/**
 * Centralized Application Logger (logger.js)
 * Clean, lightweight logging wrapper with ISO timestamps and level categorization.
 */

const logger = {
  info: (message, meta = null) => {
    const timestamp = new Date().toISOString();
    if (meta) {
      console.log(`[${timestamp}] [INFO]: ${message}`, meta);
    } else {
      console.log(`[${timestamp}] [INFO]: ${message}`);
    }
  },

  warn: (message, meta = null) => {
    const timestamp = new Date().toISOString();
    if (meta) {
      console.warn(`[${timestamp}] [WARN]: ${message}`, meta);
    } else {
      console.warn(`[${timestamp}] [WARN]: ${message}`);
    }
  },

  error: (message, error = null) => {
    const timestamp = new Date().toISOString();
    if (error) {
      console.error(`[${timestamp}] [ERROR]: ${message}`, error);
    } else {
      console.error(`[${timestamp}] [ERROR]: ${message}`);
    }
  },

  debug: (message, meta = null) => {
    if (process.env.NODE_ENV === 'development') {
      const timestamp = new Date().toISOString();
      if (meta) {
        console.debug(`[${timestamp}] [DEBUG]: ${message}`, meta);
      } else {
        console.debug(`[${timestamp}] [DEBUG]: ${message}`);
      }
    }
  }
};

module.exports = logger;
