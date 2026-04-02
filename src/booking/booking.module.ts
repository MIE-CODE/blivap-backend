import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { HospitalModule } from 'src/hospital/hospital.module';
import { DB_TABLE_NAMES } from 'src/shared/constants';

import { BookingController } from './controllers/booking.controller';
import { BookingSchema } from './schemas/booking.schema';
import { BookingService } from './services/booking.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DB_TABLE_NAMES.bookings, schema: BookingSchema },
    ]),
    HospitalModule,
  ],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
