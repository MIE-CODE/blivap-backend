import { Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { BaseSchema, Schema } from 'src/database/schemas';
import { GeoPoint, GeoPointSchema } from 'src/database/schemas/geo.schema';
import { BloodType, EligibilityStatus } from 'src/shared/domain/enums';

import {
  IQuestionnaireAnswers,
  QUESTIONNAIRE_VERSION,
} from '../constants/questionnaire';

export type DonorProfileDocument = DonorProfile & Document;

@Schema()
export class QuestionnaireSubmission {
  @Prop({ type: Object, required: true })
  answers: IQuestionnaireAnswers;

  @Prop({ required: true })
  submittedAt: Date;

  @Prop({ default: QUESTIONNAIRE_VERSION })
  version: number;
}

@Schema()
export class ReliabilityMetrics {
  @Prop({ default: 0 })
  completedBookings: number;

  @Prop({ default: 0 })
  noShows: number;

  @Prop({ default: 0 })
  cancelledByDonor: number;

  /** 0–100 derived score */
  @Prop({ default: 50 })
  score: number;
}

export const QuestionnaireSubmissionSchema = SchemaFactory.createForClass(
  QuestionnaireSubmission,
);
export const ReliabilityMetricsSchema =
  SchemaFactory.createForClass(ReliabilityMetrics);

@Schema({
  toJSON: {
    virtuals: true,
    transform(_doc, ret): void {
      delete ret._id;
      delete ret['__v'];
    },
  },
})
export class DonorProfile extends BaseSchema {
  @Prop({ required: true, unique: true, ref: 'users' })
  userId: string;

  @Prop({ enum: BloodType, required: true })
  bloodType: BloodType;

  @Prop({ type: GeoPointSchema, default: null })
  location?: GeoPoint | null;

  @Prop({ default: true })
  isActiveDonor: boolean;

  @Prop({ default: null })
  availabilityNote?: string;

  /** ISO weekdays 0–6 or structured slots — kept simple for v1 */
  @Prop({ type: [Number], default: [] })
  availableWeekdays?: number[];

  @Prop({ default: null })
  lastDonationAt?: Date;

  @Prop({ enum: EligibilityStatus, default: EligibilityStatus.Pending })
  eligibilityStatus: EligibilityStatus;

  @Prop({ type: [String], default: [] })
  ineligibilityReasons: string[];

  @Prop({ type: QuestionnaireSubmissionSchema, default: null })
  questionnaire?: QuestionnaireSubmission | null;

  @Prop({ type: ReliabilityMetricsSchema, default: () => ({}) })
  reliability: ReliabilityMetrics;
}

export const DonorProfileSchema = SchemaFactory.createForClass(DonorProfile);

DonorProfileSchema.index({ location: '2dsphere' });
DonorProfileSchema.index({
  bloodType: 1,
  isActiveDonor: 1,
  eligibilityStatus: 1,
});
DonorProfileSchema.index({ eligibilityStatus: 1, isActiveDonor: 1 });
