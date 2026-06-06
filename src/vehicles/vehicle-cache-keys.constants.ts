/**
 * Single source of truth for all Vehicle-related Redis cache keys.
 * Colon-separated namespacing follows the Redis key naming convention
 * and makes it easy to pattern-match keys during debugging (KEYS vehicles:*).
 */
export const CACHE_KEY_VEHICLES_ALL = 'vehicles:all';

export const vehicleCacheKey = (id: string): string => `vehicle:${id}`;

/**
 * cache-manager v5 uses milliseconds for all TTL values.
 * This constant is evaluated once at startup — after ConfigModule has loaded
 * .env into process.env — and falls back to 60 seconds if unset.
 */
export const CACHE_TTL_MS =
  parseInt(process.env.CACHE_TTL_SECONDS ?? '60', 10) * 1000;
