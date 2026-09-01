const { isRedisReady, getRedisClient } = require('../config/redis');

/**
 * Get a cached value from Redis.
 * Returns null on cache miss, Redis disabled, or Redis unavailable.
 *
 * @param {string} key
 * @returns {Promise<any|null>}
 */
const getCache = async (key) => {
  if (!isRedisReady()) return null;
  try {
    const redis = getRedisClient();
    const data = await redis.get(key);
    if (data === null) return null;
    return JSON.parse(data);
  } catch (err) {
    console.warn(`⚠️  Cache get failed for key "${key}": ${err.message}`);
    return null;
  }
};

/**
 * Store a value in Redis cache with optional TTL.
 * No-op if Redis is disabled or unavailable.
 *
 * @param {string} key
 * @param {any} data  — Must be JSON-serializable
 * @param {number} [ttlSeconds]  — Defaults to REDIS_CACHE_TTL_SECONDS from env
 * @returns {Promise<void>}
 */
const setCache = async (key, data, ttlSeconds) => {
  if (!isRedisReady()) return;
  const { REDIS_CACHE_TTL_SECONDS } = require('../config/env');
  const ttl = ttlSeconds ?? REDIS_CACHE_TTL_SECONDS ?? 300;
  try {
    const redis = getRedisClient();
    await redis.set(key, JSON.stringify(data), 'EX', ttl);
  } catch (err) {
    console.warn(`⚠️  Cache set failed for key "${key}": ${err.message}`);
  }
};

/**
 * Delete a key from Redis cache (cache invalidation).
 * No-op if Redis is disabled or unavailable.
 *
 * @param {string} key
 * @returns {Promise<void>}
 */
const deleteCache = async (key) => {
  if (!isRedisReady()) return;
  try {
    const redis = getRedisClient();
    await redis.del(key);
  } catch (err) {
    console.warn(`⚠️  Cache delete failed for key "${key}": ${err.message}`);
  }
};

/**
 * Delete multiple keys matching a pattern from Redis cache.
 * No-op if Redis is disabled or unavailable.
 * Use sparingly — SCAN-based, not KEYS.
 *
 * @param {string} pattern — e.g. "app:categories:*"
 * @returns {Promise<void>}
 */
const deleteCachePattern = async (pattern) => {
  if (!isRedisReady()) return;
  try {
    const redis = getRedisClient();
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    console.warn(`⚠️  Cache pattern delete failed for "${pattern}": ${err.message}`);
  }
};

module.exports = { getCache, setCache, deleteCache, deleteCachePattern };
