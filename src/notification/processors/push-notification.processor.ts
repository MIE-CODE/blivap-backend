import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { QUEUE_NAMES } from 'src/shared/constants';

import { NotificationService } from '../services/notification.service';
import { PushNotificationPayload } from '../types';

@Processor(QUEUE_NAMES.pushNotification)
export class PushNotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(PushNotificationProcessor.name);

  constructor(private readonly notificationService: NotificationService) {
    super();
  }

  async process(job: Job<PushNotificationPayload>): Promise<void> {
    const startTime = Date.now();
    try {
      this.logger.log('Processing push notification job', {
        jobId: job.id,
        data: {
          ...job.data,
          deviceTokens: `${job.data.deviceTokens.length} tokens`,
        },
      });

      await this.notificationService.processPushNotification(job.data);

      const duration = (Date.now() - startTime) / 1000;

      this.logger.log('Push notification job completed successfully', {
        jobId: job.id,
        duration,
      });
    } catch (error) {
      this.logger.error('Failed to process push notification job', {
        jobId: job.id,
        error: error.message,
        stack: error.stack,
      });

      // Rethrow the error to trigger retry mechanism
      throw error;
    }
  }

  async onFailed(
    job: Job<PushNotificationPayload>,
    error: Error,
  ): Promise<void> {
    this.logger.error('Push notification job failed permanently', {
      jobId: job.id,
      error: error.message,
      stack: error.stack,
      attemptsMade: job.attemptsMade,
    });
  }

  async onCompleted(job: Job<PushNotificationPayload>): Promise<void> {
    this.logger.log('Push notification job completed', {
      jobId: job.id,
      attemptsMade: job.attemptsMade,
    });
  }

  async onStalled(job: Job<PushNotificationPayload>): Promise<void> {
    this.logger.warn('Push notification job stalled', {
      jobId: job.id,
      attemptsMade: job.attemptsMade,
    });
  }
}
