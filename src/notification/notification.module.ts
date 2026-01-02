import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import * as admin from 'firebase-admin';

import config from 'src/shared/config';
import {
  emailQueueConfig,
  pushNotificationQueueConfig,
} from 'src/shared/queue.config';

import { EmailProcessor } from './processors/email.processor';
import { PushNotificationProcessor } from './processors/push-notification.processor';
import { NotificationService } from './services/notification.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: emailQueueConfig.name,
      defaultJobOptions: emailQueueConfig.defaultJobOptions,
      settings: emailQueueConfig.settings,
    }),
    BullModule.registerQueue({
      name: pushNotificationQueueConfig.name,
      defaultJobOptions: pushNotificationQueueConfig.defaultJobOptions,
      settings: pushNotificationQueueConfig.settings,
    }),
  ],
  providers: [
    NotificationService,
    EmailProcessor,
    PushNotificationProcessor,
    {
      provide: admin.app.name,
      useFactory: () => {
        const { firebase } = config();

        return admin.initializeApp({
          credential: admin.credential.cert({
            projectId: firebase.projectId,
            clientEmail: firebase.clientEmail,
            privateKey: firebase.privateKey,
          }),
        });
      },
    },
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
