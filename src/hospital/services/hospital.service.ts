import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'src/database/schemas';
import { GeoPoint } from 'src/database/schemas/geo.schema';
import { DB_TABLE_NAMES } from 'src/shared/constants';

import { Hospital, HospitalDocument } from '../schemas/hospital.schema';

@Injectable()
export class HospitalService {
  constructor(
    @InjectModel(DB_TABLE_NAMES.hospitals)
    private readonly hospitals: Model<HospitalDocument>,
  ) {}

  async create(input: {
    name: string;
    addressLine?: string;
    city?: string;
    state?: string;
    location: GeoPoint;
  }): Promise<Hospital> {
    return this.hospitals.create(input);
  }

  async findById(id: string): Promise<HospitalDocument | null> {
    return this.hospitals.findOne({ _id: id, isDeleted: { $ne: true } });
  }

  async list(): Promise<Hospital[]> {
    return this.hospitals.find({ isDeleted: { $ne: true } }).sort({ name: 1 });
  }
}
