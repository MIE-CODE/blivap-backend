import { Test } from '@nestjs/testing';

import { NotificationEventType } from 'src/shared/domain/enums';
import { UserService } from 'src/user/services/user.service';

import { InAppNotificationService } from '../services/in-app-notification.service';
import { NotificationOrchestratorService } from '../services/notification-orchestrator.service';
import { NotificationService } from '../services/notification.service';
import { PushSubscriptionService } from '../services/push-subscription.service';

describe('NotificationOrchestratorService', () => {
  it('onBookingCreated triggers fan-out for donor', async () => {
    const inApp = { create: jest.fn().mockResolvedValue({}) };
    const notificationService = {
      sendPushNotification: jest.fn(),
      sendWebPush: jest.fn(),
      sendEmail: jest.fn(),
    };
    const pushSubs = {
      getFcmTokensForUser: jest.fn().mockResolvedValue(['t1']),
      getWebSubscriptionsForUser: jest.fn().mockResolvedValue([]),
    };
    const userService = {
      findById: jest.fn().mockResolvedValue({
        email: 'd@example.com',
        firstname: 'D',
        lastname: 'X',
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationOrchestratorService,
        { provide: InAppNotificationService, useValue: inApp },
        { provide: NotificationService, useValue: notificationService },
        { provide: PushSubscriptionService, useValue: pushSubs },
        { provide: UserService, useValue: userService },
      ],
    }).compile();

    const orchestrator = moduleRef.get(NotificationOrchestratorService);
    await orchestrator.onBookingCreated({
      bookingId: 'b1',
      requesterId: 'r1',
      donorUserId: 'd1',
    });

    expect(inApp.create).toHaveBeenCalledWith(
      'd1',
      NotificationEventType.BookingRequestSent,
      expect.any(String),
      expect.any(String),
      expect.any(Object),
    );
    expect(notificationService.sendPushNotification).toHaveBeenCalled();
    expect(notificationService.sendEmail).toHaveBeenCalled();
  });
});
