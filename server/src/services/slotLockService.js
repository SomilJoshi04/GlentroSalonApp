/**
 * slotLockService.js
 * 
 * Production-Grade Distributed Atomic Slot Locking using Redis.
 * Prevents race conditions and double bookings when multiple customers 
 * attempt to book the same staff specialist or resource simultaneously.
 * 
 * Features:
 * - Atomic NX (Not eXists) lock acquisition
 * - Strict TTL expiration (prevents deadlocks if user drops connection)
 * - Safe release via Lua script (ensures a client only releases their own lock)
 * - Multi-slot atomic batch acquisition with automatic rollback on partial failure
 * - Safe fallback if Redis is disabled or offline
 */

const { isRedisReady, getRedisClient } = require('../config/redis');

// Default hold duration: 2 minutes (allows customer to review/pay without losing slot)
const DEFAULT_LOCK_TTL_SECONDS = 120;
const SLOT_BUCKET_MINUTES = 15;

/**
 * Convert Date or date string to strict "YYYY-MM-DD"
 */
const normalizeDateStr = (date) => {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Scan Redis non-blockingly for keys matching pattern
 */
const scanMatchingKeys = async (redis, pattern) => {
  let cursor = '0';
  const matchingKeys = [];
  do {
    const [nextCursor, foundKeys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;
    if (foundKeys && foundKeys.length > 0) {
      matchingKeys.push(...foundKeys);
    }
  } while (cursor !== '0');
  return matchingKeys;
};

/**
 * Convert "HH:MM" to total minutes from midnight
 */
const timeToMinutes = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Convert minutes from midnight to "HH:MM"
 */
const minutesToTime = (totalMinutes) => {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

/**
 * Break down a service start time and duration into discrete 15-minute slot buckets
 * e.g., 10:00 for 45 mins -> ['10:00', '10:15', '10:30']
 */
const getSlotBuckets = (startTime, durationMinutes, bucketMinutes = SLOT_BUCKET_MINUTES) => {
  const startMin = timeToMinutes(startTime);
  const endMin = startMin + durationMinutes;
  const buckets = [];

  for (let min = startMin; min < endMin; min += bucketMinutes) {
    buckets.push(minutesToTime(min));
  }

  return buckets;
};

/**
 * Safe Lua script to release a lock ONLY if the value matches the current holder
 */
const RELEASE_LOCK_LUA = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`;

/**
 * Acquire atomic lock for a single service (all 15-minute buckets)
 * 
 * @param {Object} params
 * @param {string} params.salonId
 * @param {string} params.staffId
 * @param {string} [params.resourceId]
 * @param {string} params.date - "YYYY-MM-DD"
 * @param {string} params.startTime - "HH:MM"
 * @param {number} params.duration - in minutes
 * @param {string} params.userId - holder ID
 * @param {number} [params.ttlSeconds]
 * @returns {Promise<{ success: boolean, lockKeys: string[], reason?: string }>}
 */
const acquireSlotLock = async ({
  salonId,
  staffId,
  resourceId = null,
  date,
  startTime,
  duration,
  userId,
  ttlSeconds = DEFAULT_LOCK_TTL_SECONDS,
}) => {
  if (!isRedisReady()) {
    // Graceful fallback: allow MongoDB transaction consistency if Redis is disabled
    return { success: true, lockKeys: [], fallback: true };
  }

  const redis = getRedisClient();
  const dateStr = normalizeDateStr(date);
  const buckets = getSlotBuckets(startTime, duration);

  const keysToLock = [];

  // Generate staff bucket lock keys
  if (staffId) {
    for (const bucket of buckets) {
      keysToLock.push(`lock:slot:${salonId}:${staffId}:${dateStr}:${bucket}`);
    }
  }

  // Generate resource bucket lock keys (e.g. Jacuzzi)
  if (resourceId) {
    for (const bucket of buckets) {
      keysToLock.push(`lock:res:${salonId}:${resourceId}:${dateStr}:${bucket}`);
    }
  }

  const acquiredKeys = [];

  for (const key of keysToLock) {
    try {
      // SET key userId NX EX ttlSeconds
      const result = await redis.set(key, userId.toString(), 'EX', ttlSeconds, 'NX');
      
      if (result === 'OK') {
        acquiredKeys.push(key);
      } else {
        // Check if the current holder is already this user (e.g. user retrying)
        const currentHolder = await redis.get(key);
        if (currentHolder === userId.toString()) {
          // Refresh TTL and proceed
          await redis.expire(key, ttlSeconds);
          acquiredKeys.push(key);
        } else {
          // Conflict detected! Roll back all keys acquired so far in this attempt
          await releaseSlotLocks(acquiredKeys, userId);
          return {
            success: false,
            reason: 'SLOT_LOCKED',
            conflictingKey: key,
          };
        }
      }
    } catch (err) {
      console.warn(`Redis lock error for key ${key}: ${err.message}. Rolling back.`);
      await releaseSlotLocks(acquiredKeys, userId);
      return { success: false, reason: 'REDIS_ERROR', error: err.message };
    }
  }

  return { success: true, lockKeys: acquiredKeys };
};

/**
 * Acquire atomic locks across all services in a multi-service booking batch.
 * If ANY slot fails, all previously acquired locks in the entire batch are instantly rolled back.
 * 
 * @param {Array} servicesArray - Array of service lock requests
 * @param {string} userId - Booking customer ID
 * @param {number} [ttlSeconds]
 * @returns {Promise<{ success: boolean, allLockKeys: string[], reason?: string }>}
 */
const acquireMultiServiceLocks = async (servicesArray, userId, ttlSeconds = DEFAULT_LOCK_TTL_SECONDS) => {
  if (!isRedisReady() || !servicesArray || servicesArray.length === 0) {
    return { success: true, allLockKeys: [], fallback: true };
  }

  const allAcquiredKeys = [];

  for (let i = 0; i < servicesArray.length; i++) {
    const item = servicesArray[i];
    const result = await acquireSlotLock({
      ...item,
      userId,
      ttlSeconds,
    });

    if (!result.success) {
      // Rollback EVERYTHING acquired in this batch
      await releaseSlotLocks(allAcquiredKeys, userId);
      return {
        success: false,
        reason: result.reason || 'SLOT_UNAVAILABLE',
        serviceIndex: i,
      };
    }

    allAcquiredKeys.push(...result.lockKeys);
  }

  return { success: true, allLockKeys: allAcquiredKeys };
};

/**
 * Release slot locks safely using Lua script (only if held by the given userId)
 * 
 * @param {string[]} lockKeys
 * @param {string} userId
 */
const releaseSlotLocks = async (lockKeys = [], userId) => {
  if (!isRedisReady() || !lockKeys || lockKeys.length === 0 || !userId) {
    return;
  }

  const redis = getRedisClient();
  const userIdStr = userId.toString();

  for (const key of lockKeys) {
    try {
      await redis.eval(RELEASE_LOCK_LUA, 1, key, userIdStr);
    } catch (err) {
      console.warn(`Error releasing Redis lock for key ${key}: ${err.message}`);
    }
  }
};

/**
 * Fetch all actively locked time slots for a staff member on a specific date.
 * Uses non-blocking SCAN to avoid freezing Redis during high concurrent load.
 * 
 * @param {string} salonId
 * @param {string} staffId
 * @param {string} date - "YYYY-MM-DD"
 * @returns {Promise<Array<{ startTime: string, endTime: string, isTemporaryHold: boolean }>>}
 */
const getLockedSlotsForStaff = async (salonId, staffId, date) => {
  if (!isRedisReady()) return [];

  const redis = getRedisClient();
  const dateStr = normalizeDateStr(date);
  const pattern = `lock:slot:${salonId}:${staffId}:${dateStr}:*`;

  try {
    const keys = await scanMatchingKeys(redis, pattern);
    if (!keys || keys.length === 0) return [];

    return keys.map((key) => {
      const parts = key.split(':');
      const startTime = parts[parts.length - 1]; // "HH:MM"
      const startMin = timeToMinutes(startTime);
      const endTime = minutesToTime(startMin + SLOT_BUCKET_MINUTES);
      return { startTime, endTime, isTemporaryHold: true };
    });
  } catch (err) {
    console.warn(`Failed to inspect locked slots for staff ${staffId}: ${err.message}`);
    return [];
  }
};

/**
 * Fetch all actively locked time slots for a resource (e.g., Jacuzzi) on a specific date.
 * Uses non-blocking SCAN to avoid freezing Redis during high concurrent load.
 * 
 * @param {string} salonId
 * @param {string} resourceId
 * @param {string} date - "YYYY-MM-DD"
 * @returns {Promise<Array<{ startTime: string, endTime: string, isTemporaryHold: boolean }>>}
 */
const getLockedSlotsForResource = async (salonId, resourceId, date) => {
  if (!isRedisReady()) return [];

  const redis = getRedisClient();
  const dateStr = normalizeDateStr(date);
  const pattern = `lock:res:${salonId}:${resourceId}:${dateStr}:*`;

  try {
    const keys = await scanMatchingKeys(redis, pattern);
    if (!keys || keys.length === 0) return [];

    return keys.map((key) => {
      const parts = key.split(':');
      const startTime = parts[parts.length - 1]; // "HH:MM"
      const startMin = timeToMinutes(startTime);
      const endTime = minutesToTime(startMin + SLOT_BUCKET_MINUTES);
      return { startTime, endTime, isTemporaryHold: true };
    });
  } catch (err) {
    console.warn(`Failed to inspect locked slots for resource ${resourceId}: ${err.message}`);
    return [];
  }
};

module.exports = {
  acquireSlotLock,
  acquireMultiServiceLocks,
  releaseSlotLocks,
  getLockedSlotsForStaff,
  getLockedSlotsForResource,
  normalizeDateStr,
  DEFAULT_LOCK_TTL_SECONDS,
};
