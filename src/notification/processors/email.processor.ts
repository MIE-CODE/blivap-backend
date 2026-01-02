import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { QUEUE_NAMES } from 'src/shared/constants';

import { NotificationService } from '../services/notification.service';
import { EmailPayload } from '../types';

@Processor(QUEUE_NAMES.email)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly notificationService: NotificationService) {
    super();
  }

  async process(job: Job<EmailPayload>): Promise<void> {
    const startTime = Date.now();
    try {
      this.logger.log('Processing email job', {
        jobId: job.id,
        data: job.data,
      });

      await this.notificationService.processEmail(job.data);

      const duration = (Date.now() - startTime) / 1000;

      this.logger.log('Email job completed successfully', {
        jobId: job.id,
        duration,
      });
    } catch (error) {
      this.logger.error('Failed to process email job', {
        jobId: job.id,
        error: error.message,
        stack: error.stack,
      });

      // Rethrow the error to trigger retry mechanism
      throw error;
    }
  }

  async onFailed(job: Job<EmailPayload>, error: Error): Promise<void> {
    this.logger.error('Email job failed permanently', {
      jobId: job.id,
      error: error.message,
      stack: error.stack,
      attemptsMade: job.attemptsMade,
    });
  }

  async onCompleted(job: Job<EmailPayload>): Promise<void> {
    this.logger.log('Email job completed', {
      jobId: job.id,
      attemptsMade: job.attemptsMade,
    });
  }

  async onStalled(job: Job<EmailPayload>): Promise<void> {
    this.logger.warn('Email job stalled', {
      jobId: job.id,
      attemptsMade: job.attemptsMade,
    });
  }
}
