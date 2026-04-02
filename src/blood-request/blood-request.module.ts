import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { DB_TABLE_NAMES } from 'src/shared/constants';

import { BloodRequestController } from './controllers/blood-request.controller';
import { BloodRequestSchema } from './schemas/blood-request.schema';
import { BloodRequestService } from './services/blood-request.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DB_TABLE_NAMES.bloodRequests, schema: BloodRequestSchema },
    ]),
  ],
  controllers: [BloodRequestController],
  providers: [BloodRequestService],
  exports: [BloodRequestService],
})
export class BloodRequestModule {}
