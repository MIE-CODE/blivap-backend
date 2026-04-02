/* eslint-disable @typescript-eslint/naming-convention -- string-valued enums use PascalCase members */
export enum UserRole {
  User = 'user',
  Donor = 'donor',
  Admin = 'admin',
}

export enum BloodType {
  O_NEG = 'O-',
  O_POS = 'O+',
  A_NEG = 'A-',
  A_POS = 'A+',
  B_NEG = 'B-',
  B_POS = 'B+',
  AB_NEG = 'AB-',
  AB_POS = 'AB+',
}

export enum DonorGender {
  Female = 'female',
  Male = 'male',
  Other = 'other',
  PreferNotToSay = 'prefer_not_to_say',
}

export enum EligibilityStatus {
  Pending = 'pending',
  Eligible = 'eligible',
  Ineligible = 'ineligible',
  PendingReview = 'pending_review',
}

export enum BloodRequestStatus {
  Open = 'open',
  Matched = 'matched',
  Closed = 'closed',
  Cancelled = 'cancelled',
}

export enum BookingStatus {
  Pending = 'pending',
  Accepted = 'accepted',
  Rejected = 'rejected',
  Cancelled = 'cancelled',
  Completed = 'completed',
  NoShow = 'no_show',
}

export enum IneligibilityReasonCode {
  AGE_RANGE = 'AGE_RANGE',
  WEIGHT_UNDER_50KG = 'WEIGHT_UNDER_50KG',
  ORGAN_TRANSPLANT = 'ORGAN_TRANSPLANT',
  INJECTED_DRUGS = 'INJECTED_DRUGS',
  DIABETES = 'DIABETES',
  BLOOD_PRODUCTS_RECENT = 'BLOOD_PRODUCTS_RECENT',
  CHRONIC_CONDITION = 'CHRONIC_CONDITION',
  HEP_B_VACCINE_RECENT = 'HEP_B_VACCINE_RECENT',
  AGE_MISMATCH_PROFILE = 'AGE_MISMATCH_PROFILE',
}

export enum NotificationChannel {
  InApp = 'in_app',
  Email = 'email',
  Push = 'push',
  WebPush = 'web_push',
}

export enum NotificationEventType {
  DonorMatched = 'donor_matched',
  BookingRequestSent = 'booking_request_sent',
  BookingAccepted = 'booking_accepted',
  BookingRejected = 'booking_rejected',
  VerificationApproved = 'verification_approved',
  VerificationRejected = 'verification_rejected',
}

export enum AuditAction {
  QuestionnaireSubmitted = 'questionnaire_submitted',
  BookingCreated = 'booking_created',
  BookingStateChanged = 'booking_state_changed',
  IdentityVerified = 'identity_verified',
  LocationUpdated = 'location_updated',
  NinDuplicateRejected = 'nin_duplicate_rejected',
}

export enum PushSubscriptionKind {
  Fcm = 'fcm',
  Web = 'web',
}
