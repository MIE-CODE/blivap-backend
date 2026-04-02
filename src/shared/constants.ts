export const QUEUE_NAMES = {
  email: 'emailQueue',
  pushNotification: 'pushNotificationQueue',
  webPush: 'webPushQueue',
} as const;

export const DB_TABLE_NAMES = {
  users: 'users',
  passwordResetTokens: 'passwordResetTokens',
  donorProfiles: 'donorProfiles',
  hospitals: 'hospitals',
  bloodRequests: 'bloodRequests',
  bookings: 'bookings',
  notifications: 'notifications',
  pushSubscriptions: 'pushSubscriptions',
  auditLogs: 'auditLogs',
} as const;

/** Donation cooldown between whole blood donations (days). */
export const DONATION_COOLDOWN_DAYS = 56;

/** Default booking slot length for conflict detection (ms). */
export const DEFAULT_BOOKING_SLOT_MS = 2 * 60 * 60 * 1000;
