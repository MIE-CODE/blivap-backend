import { EventEmitter2 } from '@nestjs/event-emitter';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';

import { HospitalService } from 'src/hospital/services/hospital.service';
import { DB_TABLE_NAMES } from 'src/shared/constants';
import { BookingStatus } from 'src/shared/domain/enums';

import { BookingService } from '../services/booking.service';

describe('BookingService', () => {
  let service: BookingService;

  const mockBookings = {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };
  const mockHospital = { findById: jest.fn().mockResolvedValue({ id: 'h1' }) };
  const events = { emit: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockHospital.findById.mockResolvedValue({ id: 'h1' });
    const moduleRef = await Test.createTestingModule({
      providers: [
        BookingService,
        {
          provide: getModelToken(DB_TABLE_NAMES.bookings),
          useValue: mockBookings,
        },
        { provide: HospitalService, useValue: mockHospital },
        { provide: EventEmitter2, useValue: events },
      ],
    }).compile();
    service = moduleRef.get(BookingService);
  });

  it('throws when donor has overlapping booking', async () => {
    const start = new Date('2030-01-15T10:00:00.000Z');
    mockBookings.findOne.mockResolvedValue({
      id: 'existing',
      scheduledAt: start,
      slotEndAt: new Date(start.getTime() + 3600000),
    });

    await expect(
      service.create({
        requesterId: 'r1',
        donorUserId: 'd1',
        hospitalId: 'h1',
        scheduledAt: start,
      }),
    ).rejects.toThrow('already has a booking');
    expect(mockBookings.create).not.toHaveBeenCalled();
  });

  it('creates pending booking when no conflict', async () => {
    const start = new Date('2030-02-15T10:00:00.000Z');
    mockBookings.findOne.mockResolvedValue(null);
    mockBookings.create.mockResolvedValue({
      id: 'newb',
      status: BookingStatus.Pending,
      scheduledAt: start,
      donorUserId: 'd1',
      requesterId: 'r1',
    });

    const doc = await service.create({
      requesterId: 'r1',
      donorUserId: 'd1',
      hospitalId: 'h1',
      scheduledAt: start,
    });

    expect(doc.status).toBe(BookingStatus.Pending);
    expect(events.emit).toHaveBeenCalledWith(
      'booking.created',
      expect.objectContaining({
        requesterId: 'r1',
        donorUserId: 'd1',
      }),
    );
  });
});
