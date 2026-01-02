import { QueueOptions } from 'bullmq';

import { QUEUE_NAMES } from './constants';

export const defaultQueueConfig: Omit<QueueOptions, 'connection'> = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000, // Start with 1 second delay
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000, // Keep last 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
      count: 5000, // Keep last 5000 failed jobs
    },
  },
};

export const emailQueueConfig = {
  ...defaultQueueConfig,
  name: QUEUE_NAMES.email,
  defaultJobOptions: {
    ...defaultQueueConfig.defaultJobOptions,
    attempts: 5, // More attempts for email jobs
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 second delay for emails
    },
  },
};

export const pushNotificationQueueConfig = {
  ...defaultQueueConfig,
  name: QUEUE_NAMES.pushNotification,
  defaultJobOptions: {
    ...defaultQueueConfig.defaultJobOptions,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
};
