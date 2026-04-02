import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { DB_TABLE_NAMES } from 'src/shared/constants';

import { HospitalController } from './controllers/hospital.controller';
import { HospitalSchema } from './schemas/hospital.schema';
import { HospitalService } from './services/hospital.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DB_TABLE_NAMES.hospitals, schema: HospitalSchema },
    ]),
  ],
  controllers: [HospitalController],
  providers: [HospitalService],
  exports: [HospitalService],
})
export class HospitalModule {}
