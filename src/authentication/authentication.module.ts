import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { NotificationModule } from 'src/notification/notification.module';
import config from 'src/shared/config';
import { UserModule } from 'src/user/user.module';

import { AuthenticationController } from './controllers/authentication.controller';
import { AuthenticationService } from './services/authentication.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      useFactory() {
        return {
          secret: config().jwt.secret,
          signOptions: { expiresIn: config().jwt.expiresIn as '1 week' },
        };
      },
    }),
    UserModule,
    NotificationModule,
  ],
  providers: [
    AuthenticationService,
    {
      provide: Cache,
      inject: [CACHE_MANAGER],
      useFactory(cacheManager: Cache) {
        return cacheManager;
      },
    },
    JwtStrategy,
    LocalStrategy,
  ],
  exports: [AuthenticationService],
  controllers: [AuthenticationController],
})
export class AuthenticationModule {}
