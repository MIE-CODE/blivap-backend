import { BullModule } from '@nestjs/bullmq';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import * as redisStore from 'cache-manager-redis-store';
import { RedisClientOptions } from 'redis';

import { AppController } from './app.controller';
import { AuditModule } from './audit/audit.module';
import { AuthenticationModule } from './authentication/authentication.module';
import { AvatarModule } from './avatar/avatar.module';
import { BloodRequestModule } from './blood-request/blood-request.module';
import { BookingModule } from './booking/booking.module';
import { DonorModule } from './donor/donor.module';
import { HospitalModule } from './hospital/hospital.module';
import { MatchingModule } from './matching/matching.module';
import { NinVerificationModule } from './nin-verification/nin-verification.module';
import config from './shared/config';
import { HttpCacheInterceptor } from './shared/http-cache.interceptor';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
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
    BullModule.forRootAsync({
      useFactory() {
        const { redis, env } = config();
        return {
          connection: {
            host: redis.host,
            port: redis.port,
            password: redis.password,
            tls: redis.useTLS ? {} : undefined,
          },
          prefix: `{${env}}`,
        };
      },
    }),
    UserModule,
    AuditModule,
    DonorModule,
    HospitalModule,
    BloodRequestModule,
    BookingModule,
    MatchingModule,
    AuthenticationModule,
    AvatarModule,
    NinVerificationModule,
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
