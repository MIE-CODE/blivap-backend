import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'src/database/schemas';
import { GeoPoint } from 'src/database/schemas/geo.schema';
import { DB_TABLE_NAMES } from 'src/shared/constants';
import { BloodRequestStatus, BloodType } from 'src/shared/domain/enums';

import {
  BloodRequest,
  BloodRequestDocument,
} from '../schemas/blood-request.schema';

@Injectable()
export class BloodRequestService {
  constructor(
    @InjectModel(DB_TABLE_NAMES.bloodRequests)
    private readonly bloodRequests: Model<BloodRequestDocument>,
    private readonly events: EventEmitter2,
  ) {}

  async create(
    requesterId: string,
    input: {
      neededBloodType: BloodType;
      location: GeoPoint;
      urgent?: boolean;
      notes?: string;
    },
  ): Promise<BloodRequestDocument> {
    const doc = await this.bloodRequests.create({
      requesterId,
      neededBloodType: input.neededBloodType,
      location: input.location,
      urgent: input.urgent ?? false,
      notes: input.notes,
      status: BloodRequestStatus.Open,
    });

    this.events.emit('bloodRequest.created', {
      bloodRequestId: doc.id,
      requesterId,
    });

    return doc;
  }

  async getById(id: string): Promise<BloodRequestDocument> {
    const doc = await this.bloodRequests.findOne({
      _id: id,
      isDeleted: { $ne: true },
    });
    if (!doc) {
      throw new NotFoundException('Blood request not found');
    }
    return doc;
  }

  async listForRequester(requesterId: string): Promise<BloodRequest[]> {
    return this.bloodRequests
      .find({ requesterId, isDeleted: { $ne: true } })
      .sort({ createdAt: -1 });
  }
}
