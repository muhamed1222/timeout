import { createClient, RedisClientType } from 'redis';
import type { CacheAdapter } from './CacheAdapter.js';
import { logger } from '../logger.js';

/**
 * Redis Cache Implementation
 * Used in production for distributed caching
 */
export class RedisCache implements CacheAdapter {
  private client: RedisClientType;
  private isConnected = false;

  constructor(url: string) {
    this.client = createClient({
      url,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis max reconnection attempts reached');
            return new Error('Max reconnection attempts reached');
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    this.client.on('error', (err) => {
      logger.error('Redis client error', err);
    });

    this.client.on('connect', () => {
      logger.info('Redis client connected');
      this.isConnected = true;
    });

    this.client.on('disconnect', () => {
      logger.warn('Redis client disconnected');
      this.isConnected = false;
    });

    // Connect asynchronously
    this.connect();
  }

  private async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis', error);
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.client.get(key);
      if (typeof value !== 'string') {
        return undefined;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Redis get error', error, { key });
      return undefined;
    }
  }

  async set<T>(key: string, value: T, ttl = 300): Promise<void> {
    try {
      await this.client.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
      logger.error('Redis set error', error, { key });
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error('Redis delete error', error, { key });
    }
  }

  async clear(): Promise<void> {
    try {
      await this.client.flushDb();
    } catch (error) {
      logger.error('Redis clear error', error);
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error('Redis has error', error, { key });
      return false;
    }
  }

  async mget<T>(keys: string[]): Promise<(T | undefined)[]> {
    try {
      if (keys.length === 0) return [];
      
      const values = (await this.client.mGet(keys)) as Array<string | null>;
      return values.map((value) => {
        if (value == null) return undefined;
        try {
          return JSON.parse(value) as T;
        } catch {
          return undefined;
        }
      });
    } catch (error) {
      logger.error('Redis mget error', error, { keys });
      return keys.map(() => undefined);
    }
  }

  async mset(entries: Array<[string, any, number?]>): Promise<void> {
    try {
      // Redis mSet doesn't support TTL, so we need to set individually
      await Promise.all(
        entries.map(([key, value, ttl]) => this.set(key, value, ttl))
      );
    } catch (error) {
      logger.error('Redis mset error', error);
    }
  }

  /**
   * Get Redis connection status
   */
  isReady(): boolean {
    return this.isConnected;
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    try {
      await this.client.quit();
    } catch (error) {
      logger.error('Redis disconnect error', error);
    }
  }

  /**
   * Get Redis info
   */
  async info(): Promise<string> {
    try {
      return await this.client.info();
    } catch (error) {
      logger.error('Redis info error', error);
      return '';
    }
  }
}





