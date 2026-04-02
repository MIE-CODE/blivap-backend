import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import * as admin from 'firebase-admin';

import config from 'src/shared/config';
import { DB_TABLE_NAMES } from 'src/shared/constants';
import {
  emailQueueConfig,
  pushNotificationQueueConfig,
  webPushQueueConfig,
} from 'src/shared/queue.config';
import { UserModule } from 'src/user/user.module';

import { NotificationsController } from './controllers/notifications.controller';
import { EmailProcessor } from './processors/email.processor';
import { PushNotificationProcessor } from './processors/push-notification.processor';
import { WebPushProcessor } from './processors/web-push.processor';
import { InAppNotificationSchema } from './schemas/in-app-notification.schema';
import { PushSubscriptionSchema } from './schemas/push-subscription.schema';
import { InAppNotificationService } from './services/in-app-notification.service';
import { NotificationOrchestratorService } from './services/notification-orchestrator.service';
import { NotificationService } from './services/notification.service';
import { PushSubscriptionService } from './services/push-subscription.service';

@Module({
  imports: [
    UserModule,
    MongooseModule.forFeature([
      { name: DB_TABLE_NAMES.notifications, schema: InAppNotificationSchema },
      {
        name: DB_TABLE_NAMES.pushSubscriptions,
        schema: PushSubscriptionSchema,
      },
    ]),
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
    BullModule.registerQueue({
      name: webPushQueueConfig.name,
      defaultJobOptions: webPushQueueConfig.defaultJobOptions,
      settings: webPushQueueConfig.settings,
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationService,
    InAppNotificationService,
    PushSubscriptionService,
    NotificationOrchestratorService,
    EmailProcessor,
    PushNotificationProcessor,
    WebPushProcessor,
    {
      provide: admin.app.name,
      useFactory: () => {
        const { firebase } = config();
        if (
          !firebase?.projectId ||
          !firebase?.clientEmail ||
          !firebase?.privateKey
        ) {
          return null;
        }
        const privateKey = firebase.privateKey.replace(/\\n/g, '\n');
        try {
          return admin.initializeApp({
            credential: admin.credential.cert({
              projectId: firebase.projectId,
              clientEmail: firebase.clientEmail,
              privateKey,
            }),
          });
        } catch (e: unknown) {
          const err = e as { code?: string };
          if (err?.code === 'app/duplicate-app') {
            return admin.app();
          }
          throw e;
        }
      },
    },
  ],
  exports: [
    NotificationService,
    InAppNotificationService,
    PushSubscriptionService,
  ],
})
export class NotificationModule {}
