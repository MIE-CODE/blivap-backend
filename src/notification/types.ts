export type EmailAddress = {
  email: string;
  name?: string;
};

/** All Nunjucks templates under templates/ — use with NotificationService.sendEmail */
export enum EmailTemplateID {
  ACCOUNT_SUSPENDED = 'account-suspended.njk',
  ACTIVITY_SUMMARY = 'activity-summary.njk',
  BIRTHDAY_EMAIL = 'birthday-email.njk',
  BLOOD_REQUEST_APPROVED = 'blood-request-approved.njk',
  BLOOD_REQUEST_CLOSED = 'blood-request-closed.njk',
  BLOOD_REQUEST_CREATED = 'blood-request-created.njk',
  BLOOD_REQUEST_EXPIRING_SOON = 'blood-request-expiring-soon.njk',
  BOOKING_CANCELLED = 'booking-cancelled.njk',
  BOOKING_CONFIRMATION = 'booking-confirmation.njk',
  BOOKING_REMINDER = 'booking-reminder.njk',
  BOOKING_RESCHEDULED = 'booking-rescheduled.njk',
  CRITICAL_BLOOD_SHORTAGE = 'critical-blood-shortage.njk',
  DATA_PRIVACY_NOTIFICATION = 'data-privacy-notification.njk',
  DONATION_COMPLETED_CONFIRMATION = 'donation-completed-confirmation.njk',
  DONOR_MATCHED_REQUESTER = 'donor-matched-requester.njk',
  HIGH_PRIORITY_EMERGENCY_REQUEST = 'high-priority-emergency-request.njk',
  IMPACT_EMAIL = 'impact-email.njk',
  INACTIVE_USER_REMINDER = 'inactive-user-reminder.njk',
  LOCATION_EMERGENCY_BROADCAST = 'location-emergency-broadcast.njk',
  LOGIN_ALERT = 'login-alert.njk',
  MILESTONE_DONATION = 'milestone-donation.njk',
  MISSED_MESSAGE_REMINDER = 'missed-message-reminder.njk',
  NEARBY_URGENT_REQUESTS = 'nearby-urgent-requests.njk',
  NEW_BLOOD_REQUEST_NEAR_YOU = 'new-blood-request-near-you.njk',
  NEW_MESSAGE_NOTIFICATION = 'new-message-notification.njk',
  NIN_VERIFICATION_FAILED = 'nin-verification-failed.njk',
  NIN_VERIFICATION_REQUEST = 'nin-verification-request.njk',
  NIN_VERIFICATION_SUCCESSFUL = 'nin-verification-successful.njk',
  PASSWORD_CHANGED_CONFIRMATION = 'password-changed-confirmation.njk',
  POLICY_UPDATES = 'policy-updates.njk',
  PROFILE_UPDATED = 'profile-updated.njk',
  RATE_YOUR_EXPERIENCE = 'rate-your-experience.njk',
  RE_ENGAGEMENT_CAMPAIGN = 're-engagement-campaign.njk',
  REFERRAL_INVITE = 'referral-invite.njk',
  REMINDER_RESPOND_TO_REQUEST = 'reminder-respond-to-request.njk',
  REQUEST_ACCEPTED_BY_DONOR = 'request-accepted-by-donor.njk',
  REQUEST_DECLINED_BY_DONOR = 'request-declined-by-donor.njk',
  REQUEST_MATCHES_BLOOD_TYPE = 'request-matches-blood-type.njk',
  RESET_PASSWORD = 'reset-password.njk',
  REWARDS_RECOGNITION = 'rewards-recognition.njk',
  SECURITY_ALERT = 'security-alert.njk',
  THANK_YOU_FOR_DONATING = 'thank-you-for-donating.njk',
  URGENT_BLOOD_REQUEST_ALERT = 'urgent-blood-request-alert.njk',
  VERIFY_EMAIL_ADDRESS = 'verify-email-address.njk',
  WELCOME_EMAIL = 'welcome-email.njk',
}

export type EmailPayload = {
  subject: string;
  from?: EmailAddress;
  to: EmailAddress[];
  templateId: EmailTemplateID;
  templateData: Record<string, unknown>;
};

export type PushNotificationPayload = {
  title: string;
  body: string;
  deviceTokens: string[];
  data?: { [key: string]: string };
};
