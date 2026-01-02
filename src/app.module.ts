import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import * as redisStore from 'cache-manager-redis-store';
import { RedisClientOptions } from 'redis';

import { AppController } from './app.controller';
import config from './shared/config';
import { HttpCacheInterceptor } from './shared/http-cache.interceptor';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
    }),
    MongooseModule.forRoot(config().db.url),
    CacheModule.registerAsync<RedisClientOptions>({
      isGlobal: true,
      useFactory() {
        const { cache, isTest, redis } = config();
        if (isTest) {
          return { ttl: -1 };
        }

        if (!redis.host || !redis.port) {
          return { ttl: cache.ttl };
        }

        return {
          host: redis.host,
          port: redis.port,
          ttl: cache.ttl,
          password: redis.password,
          store: redisStore,
          isCacheableValue(value) {
            return value !== undefined;
          },
        };
      },
    }),
    ThrottlerModule.forRoot({ throttlers: [config().throttle] }),
    UserModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: HttpCacheInterceptor },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
