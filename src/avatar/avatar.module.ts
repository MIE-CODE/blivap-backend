import { Module } from '@nestjs/common';

import { AvatarController } from './controllers/avatar.controller';
import { AvatarService } from './services/avatar.service';

@Module({
  providers: [AvatarService],
  controllers: [AvatarController],
  exports: [AvatarService],
})
export class AvatarModule {}
