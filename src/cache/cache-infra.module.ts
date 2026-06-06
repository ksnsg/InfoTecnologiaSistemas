import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { redisStore } from 'cache-manager-redis-yet';

/**
 * isGlobal: true registers the CacheModule (and its CACHE_MANAGER provider)
 * across the entire application so feature modules do not need to re-import it.
 *
 * The useFactory is async because redisStore() returns a Promise that resolves
 * once the underlying ioredis client has connected to the Redis server.
 *
 * IMPORTANT: This module must be imported in AppModule AFTER ConfigModule so
 * that process.env is fully populated when the factory executes.
 */
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        const store = await redisStore({
          socket: {
            host: process.env.REDIS_HOST ?? 'localhost',
            port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
          },
          password: process.env.REDIS_PASSWORD,
        });
        return {
          store,
          ttl: parseInt(process.env.CACHE_TTL_SECONDS ?? '60', 10) * 1000,
        };
      },
    }),
  ],
})
export class CacheInfraModule {}
