import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuditModule } from 'src/audit/audit.module';
import { DB_TABLE_NAMES } from 'src/shared/constants';
import { UserModule } from 'src/user/user.module';

import { DonorController } from './controllers/donor.controller';
import { DonorProfileSchema } from './schemas/donor-profile.schema';
import { DonorService } from './services/donor.service';
import { EligibilityService } from './services/eligibility.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DB_TABLE_NAMES.donorProfiles, schema: DonorProfileSchema },
    ]),
    UserModule,
    AuditModule,
  ],
  controllers: [DonorController],
  providers: [DonorService, EligibilityService],
  exports: [DonorService, EligibilityService],
})
export class DonorModule {}
