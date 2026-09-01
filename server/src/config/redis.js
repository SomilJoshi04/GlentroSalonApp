const Redis = require('ioredis');
const { REDIS_ENABLED, REDIS_URL } = require('./env');

let client = null;
let _isReady = false;

/**
 * Initialize the Redis client.
 * Called once during server startup.
 * Safe to call even if Redis is disabled.
 */
const initRedis = async () => {
  if (!REDIS_ENABLED) {
    console.log('ℹ️  Redis is DISABLED (REDIS_ENABLED=false). Running without Redis.');
    return;
  }

  if (!REDIS_URL) {
    console.warn('⚠️  REDIS_ENABLED=true but REDIS_URL is not set. Redis will not connect.');
    return;
  }

  try {
    client = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
      connectTimeout: 5000,
      // Suppress aggressive reconnection to avoid log flooding
      retryStrategy(times) {
        if (times > 3) {
          console.warn(`⚠️  Redis: Max reconnect attempts reached. Operating in fallback mode.`);
          return null; // Stop retrying
        }
        return Math.min(times * 500, 2000);
      },
    });

    client.on('connect', () => {
      _isReady = true;
      console.log('✅ Redis connected successfully.');
    });

    client.on('ready', () => {
      _isReady = true;
    });

    client.on('error', (err) => {
      _isReady = false;
      // Log only the message, never the full URL (which may contain password)
      console.error(`⚠️  Redis error: ${err.message}`);
    });

    client.on('close', () => {
      _isReady = false;
    });

    client.on('reconnecting', () => {
      _isReady = false;
    });

    // Attempt connection
    await client.connect();
  } catch (err) {
    _isReady = false;
    console.warn(`⚠️  Redis connection failed: ${err.message}. App will run in fallback mode.`);
  }
};

/**
 * Returns true if Redis is explicitly enabled in config.
 */
const isRedisEnabled = () => REDIS_ENABLED === true;

/**
 * Returns true only if Redis is enabled AND currently connected/ready.
 */
const isRedisReady = () => REDIS_ENABLED === true && _isReady && client !== null;

/**
 * Returns the raw ioredis client.
 * Returns null if Redis is disabled or not ready.
 * Callers should always check isRedisReady() before using.
 */
const getRedisClient = () => {
  if (!isRedisReady()) return null;
  return client;
};

/**
 * Gracefully close the Redis connection on shutdown.
 */
const closeRedis = async () => {
  if (client) {
    try {
      await client.quit();
      console.log('🔴 Redis connection closed.');
    } catch (_) {
      // Ignore close errors
    }
  }
};

module.exports = {
  initRedis,
  isRedisEnabled,
  isRedisReady,
  getRedisClient,
  closeRedis,
};
