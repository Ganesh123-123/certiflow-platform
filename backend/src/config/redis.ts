import { env } from './env';

// Lazy Redis connection — only connects when actually used
// If Redis is unavailable, workers degrade gracefully
let redisInstance: any = null;

export function getRedis() {
  if (!redisInstance) {
    try {
      const Redis = require('ioredis');
      redisInstance = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: null,
        retryStrategy(times: number) {
          if (times > 3) return null; // stop retrying
          return Math.min(times * 100, 1000);
        },
        enableReadyCheck: false,
        lazyConnect: true,
      });
      redisInstance.on('error', (err: Error) => {
        // suppress repeated errors — Redis is optional
        if (process.env.REDIS_WARNED !== '1') {
          console.warn('⚠️  Redis unavailable — background jobs will run inline:', err.message);
          process.env.REDIS_WARNED = '1';
        }
      });
    } catch (e) {
      // ioredis not available
    }
  }
  return redisInstance;
}

export const redis = new Proxy({} as any, {
  get: (_t, prop) => {
    const r = getRedis();
    if (r && typeof r[prop] === 'function') return r[prop].bind(r);
    return async () => null;
  },
});

export const redisConnection = {
  host: (() => { try { return new URL(env.REDIS_URL).hostname; } catch { return 'localhost'; } })(),
  port: (() => { try { return parseInt(new URL(env.REDIS_URL).port || '6379'); } catch { return 6379; } })(),
};
