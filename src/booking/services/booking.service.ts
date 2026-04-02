import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'src/database/schemas';
import { HospitalService } from 'src/hospital/services/hospital.service';
import { DB_TABLE_NAMES, DEFAULT_BOOKING_SLOT_MS } from 'src/shared/constants';
import { BookingStatus } from 'src/shared/domain/enums';

import { Booking, BookingDocument } from '../schemas/booking.schema';

const ACTIVE = [BookingStatus.Pending, BookingStatus.Accepted];

@Injectable()
export class BookingService {
  constructor(
    @InjectModel(DB_TABLE_NAMES.bookings)
    private readonly bookings: Model<BookingDocument>,
    private readonly events: EventEmitter2,
    private readonly hospitalService: HospitalService,
  ) {}

  async create(input: {
    requesterId: string;
    donorUserId: string;
    hospitalId: string;
    scheduledAt: Date;
    bloodRequestId?: string | null;
    slotDurationMs?: number;
  }): Promise<BookingDocument> {
    const hospital = await this.hospitalService.findById(input.hospitalId);
    if (!hospital) {
      throw new NotFoundException('Hospital not found');
    }

    const duration = input.slotDurationMs ?? DEFAULT_BOOKING_SLOT_MS;
    const slotEndAt = new Date(input.scheduledAt.getTime() + duration);

    const conflict = await this.bookings.findOne({
      donorUserId: input.donorUserId,
      status: { $in: ACTIVE },
      $and: [
        { scheduledAt: { $lt: slotEndAt } },
        { slotEndAt: { $gt: input.scheduledAt } },
      ],
      isDeleted: { $ne: true },
    });

    if (conflict) {
      throw new ConflictException(
        'Donor already has a booking in this time window',
      );
    }

    const doc = await this.bookings.create({
      requesterId: input.requesterId,
      donorUserId: input.donorUserId,
      hospitalId: input.hospitalId,
      scheduledAt: input.scheduledAt,
      slotEndAt,
      bloodRequestId: input.bloodRequestId ?? null,
      status: BookingStatus.Pending,
    });

    this.events.emit('booking.created', {
      bookingId: doc.id,
      requesterId: input.requesterId,
      donorUserId: input.donorUserId,
    });

    return doc;
  }

  async respondAsDonor(
    donorUserId: string,
    bookingId: string,
    accept: boolean,
  ): Promise<BookingDocument> {
    const booking = await this.getById(bookingId);
    if (booking.donorUserId !== donorUserId) {
      throw new ForbiddenException();
    }
    if (booking.status !== BookingStatus.Pending) {
      throw new BadRequestException('Booking is not pending');
    }

    booking.status = accept ? BookingStatus.Accepted : BookingStatus.Rejected;
    booking.respondedAt = new Date();
    await booking.save();

    this.events.emit(accept ? 'booking.accepted' : 'booking.rejected', {
      bookingId: booking.id,
      requesterId: booking.requesterId,
      donorUserId: booking.donorUserId,
    });

    return booking;
  }

  async cancelAsRequester(
    requesterId: string,
    bookingId: string,
  ): Promise<BookingDocument> {
    const booking = await this.getById(bookingId);
    if (booking.requesterId !== requesterId) {
      throw new ForbiddenException();
    }
    if (
      booking.status !== BookingStatus.Pending &&
      booking.status !== BookingStatus.Accepted
    ) {
      throw new BadRequestException('Cannot cancel this booking');
    }
    booking.status = BookingStatus.Cancelled;
    await booking.save();

    this.events.emit('booking.cancelled', {
      bookingId: booking.id,
      requesterId: booking.requesterId,
      donorUserId: booking.donorUserId,
    });

    return booking;
  }

  async listForUser(userId: string): Promise<Booking[]> {
    return this.bookings
      .find({
        isDeleted: { $ne: true },
        $or: [{ requesterId: userId }, { donorUserId: userId }],
      })
      .sort({ scheduledAt: -1 });
  }

  async getById(id: string): Promise<BookingDocument> {
    const doc = await this.bookings.findOne({
      _id: id,
      isDeleted: { $ne: true },
    });
    if (!doc) {
      throw new NotFoundException('Booking not found');
    }
    return doc;
  }
}
