import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { QUEUE_NAMES } from 'src/shared/constants';

import { NotificationService } from '../services/notification.service';
import { WebPushJobPayload } from '../types';

@Processor(QUEUE_NAMES.webPush)
export class WebPushProcessor extends WorkerHost {
  private readonly logger = new Logger(WebPushProcessor.name);

  constructor(private readonly notificationService: NotificationService) {
    super();
  }

  async process(job: Job<WebPushJobPayload>): Promise<void> {
    try {
      await this.notificationService.processWebPush(job.data);
    } catch (error) {
      this.logger.error('Web push job failed', {
        jobId: job.id,
        error: error.message,
      });
      throw error;
    }
  }
}
