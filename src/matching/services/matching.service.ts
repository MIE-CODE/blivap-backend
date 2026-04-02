import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as moment from 'moment';

import { BloodRequestDocument } from 'src/blood-request/schemas/blood-request.schema';
import { Model } from 'src/database/schemas';
import { DonorProfileDocument } from 'src/donor/schemas/donor-profile.schema';
import { donorCanSupply } from 'src/shared/blood-compatibility';
import config from 'src/shared/config';
import { DB_TABLE_NAMES, DONATION_COOLDOWN_DAYS } from 'src/shared/constants';
import { BloodType, EligibilityStatus } from 'src/shared/domain/enums';

export type MatchedDonor = {
  donorProfile: DonorProfileDocument;
  distanceMeters: number;
};

@Injectable()
export class MatchingService {
  constructor(
    @InjectModel(DB_TABLE_NAMES.donorProfiles)
    private readonly donorProfiles: Model<DonorProfileDocument>,
  ) {}

  async matchForBloodRequest(
    request: BloodRequestDocument,
    limit = 50,
  ): Promise<MatchedDonor[]> {
    const needed = request.neededBloodType as BloodType;
    const [lng, lat] = request.location.coordinates;
    const maxM = config().matching.defaultMaxDistanceMeters;

    const compatibleTypes = (Object.values(BloodType) as BloodType[]).filter(
      (bt) => donorCanSupply(needed, bt),
    );

    const cooldownCutoff = moment()
      .subtract(DONATION_COOLDOWN_DAYS, 'days')
      .toDate();

    const raw = await this.donorProfiles
      .find({
        isDeleted: { $ne: true },
        isActiveDonor: true,
        eligibilityStatus: {
          $in: [EligibilityStatus.Eligible, EligibilityStatus.PendingReview],
        },
        bloodType: { $in: compatibleTypes },
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat],
            },
            $maxDistance: maxM,
          },
        },
        $or: [
          { lastDonationAt: null },
          { lastDonationAt: { $lte: cooldownCutoff } },
        ],
      })
      .limit(limit * 2)
      .exec();

    const withDistance: MatchedDonor[] = raw
      .filter((dp) => !request.requesterId || dp.userId !== request.requesterId)
      .map((dp) => ({
        donorProfile: dp,
        distanceMeters: this.haversineMeters(
          lat,
          lng,
          dp.location!.coordinates[1],
          dp.location!.coordinates[0],
        ),
      }))
      .filter((m) => m.donorProfile.location)
      .sort((a, b) => {
        if (a.distanceMeters !== b.distanceMeters) {
          return a.distanceMeters - b.distanceMeters;
        }
        const aw = a.donorProfile.availableWeekdays?.length ?? 0;
        const bw = b.donorProfile.availableWeekdays?.length ?? 0;
        if (aw !== bw) {
          return bw - aw;
        }
        return (
          (b.donorProfile.reliability?.score ?? 0) -
          (a.donorProfile.reliability?.score ?? 0)
        );
      })
      .slice(0, limit);

    return withDistance;
  }

  async searchDonors(params: {
    neededBloodType: BloodType;
    lng: number;
    lat: number;
    limit?: number;
  }): Promise<MatchedDonor[]> {
    const fakeRequest = {
      id: '',
      neededBloodType: params.neededBloodType,
      location: {
        type: 'Point' as const,
        coordinates: [params.lng, params.lat] as [number, number],
      },
      requesterId: '',
    } as unknown as BloodRequestDocument;

    return this.matchForBloodRequest(fakeRequest, params.limit ?? 20);
  }

  private haversineMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
