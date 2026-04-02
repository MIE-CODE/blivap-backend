import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';

import { AuditService } from 'src/audit/services/audit.service';
import { Model } from 'src/database/schemas';
import { GeoPoint } from 'src/database/schemas/geo.schema';
import { DB_TABLE_NAMES } from 'src/shared/constants';
import {
  EligibilityStatus,
  UserRole,
  AuditAction,
} from 'src/shared/domain/enums';
import { User } from 'src/user/schemas/user.schema';
import { UserService } from 'src/user/services/user.service';

import {
  IQuestionnaireAnswers,
  QUESTIONNAIRE_VERSION,
} from '../constants/questionnaire';
import {
  DonorProfile,
  DonorProfileDocument,
} from '../schemas/donor-profile.schema';

import { EligibilityService } from './eligibility.service';

@Injectable()
export class DonorService {
  constructor(
    @InjectModel(DB_TABLE_NAMES.donorProfiles)
    private readonly donorProfiles: Model<DonorProfileDocument>,
    private readonly userService: UserService,
    private readonly eligibilityService: EligibilityService,
    private readonly auditService: AuditService,
    private readonly events: EventEmitter2,
  ) {}

  async getProfileByUserId(
    userId: string,
  ): Promise<DonorProfileDocument | null> {
    return this.donorProfiles.findOne({ userId, isDeleted: { $ne: true } });
  }

  async createOrUpdateRegistration(
    user: User,
    input: { bloodType: DonorProfile['bloodType']; location?: GeoPoint },
  ): Promise<DonorProfileDocument> {
    let doc = await this.getProfileByUserId(user.id);
    if (!doc) {
      doc = await this.donorProfiles.create({
        userId: user.id,
        bloodType: input.bloodType,
        location: input.location ?? null,
      });
    } else {
      doc.bloodType = input.bloodType;
      if (input.location !== undefined) {
        doc.location = input.location;
      }
      await doc.save();
    }
    return doc;
  }

  async submitQuestionnaire(
    user: User,
    answers: IQuestionnaireAnswers,
  ): Promise<DonorProfileDocument> {
    const profile = await this.getProfileByUserId(user.id);
    if (!profile) {
      throw new NotFoundException(
        'Donor profile not found; register blood type first',
      );
    }
    if (profile.questionnaire?.submittedAt) {
      throw new ConflictException(
        'Questionnaire already submitted; answers are immutable',
      );
    }

    const { status, reasons } = this.eligibilityService.evaluate(
      answers,
      user.dateOfBirth,
    );

    profile.questionnaire = {
      answers,
      submittedAt: new Date(),
      version: QUESTIONNAIRE_VERSION,
    };
    profile.eligibilityStatus = status;
    profile.ineligibilityReasons = reasons.map((r) => String(r));

    const roles = new Set(user.roles ?? [UserRole.User]);
    if (
      status === EligibilityStatus.Eligible ||
      status === EligibilityStatus.PendingReview
    ) {
      roles.add(UserRole.Donor);
    }
    await this.userService.updateOne({ _id: user.id }, { roles: [...roles] });

    await profile.save();

    await this.auditService.log(
      AuditAction.QuestionnaireSubmitted,
      'donor_profile',
      {
        actorId: user.id,
        resourceId: profile.id,
        metadata: { eligibilityStatus: status, reasons },
      },
    );

    this.events.emit('donor.questionnaire.submitted', {
      userId: user.id,
      eligibilityStatus: status,
    });

    return profile;
  }

  async updateLocation(
    user: User,
    location: GeoPoint,
    ip?: string,
  ): Promise<DonorProfileDocument> {
    const profile = await this.getProfileByUserId(user.id);
    if (!profile) {
      throw new NotFoundException('Donor profile not found');
    }
    profile.location = location;
    await profile.save();

    await this.auditService.log(AuditAction.LocationUpdated, 'donor_profile', {
      actorId: user.id,
      resourceId: profile.id,
      ip: ip ?? null,
      metadata: {},
    });

    return profile;
  }

  getPublicProfileView(profile: DonorProfileDocument, distanceMeters?: number) {
    return {
      userId: profile.userId,
      bloodType: profile.bloodType,
      reliabilityScore: profile.reliability?.score ?? 50,
      completedBookings: profile.reliability?.completedBookings ?? 0,
      isActiveDonor: profile.isActiveDonor,
      distanceMeters,
    };
  }
}
