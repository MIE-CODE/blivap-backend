import { Module } from '@nestjs/common';

import { UserModule } from 'src/user/user.module';

import { AvatarController } from './controllers/avatar.controller';
import { AvatarService } from './services/avatar.service';

@Module({
  imports: [UserModule],
  providers: [AvatarService],
  controllers: [AvatarController],
  exports: [AvatarService],
})
export class AvatarModule {}
