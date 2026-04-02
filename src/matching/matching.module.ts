import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { BloodRequestModule } from 'src/blood-request/blood-request.module';
import { DonorProfileSchema } from 'src/donor/schemas/donor-profile.schema';
import { DB_TABLE_NAMES } from 'src/shared/constants';

import { MatchingController } from './controllers/matching.controller';
import { MatchingService } from './services/matching.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DB_TABLE_NAMES.donorProfiles, schema: DonorProfileSchema },
    ]),
    BloodRequestModule,
  ],
  controllers: [MatchingController],
  providers: [MatchingService],
  exports: [MatchingService],
})
export class MatchingModule {}
