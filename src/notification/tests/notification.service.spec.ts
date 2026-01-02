import { readFileSync } from 'fs';

import { Test, TestingModule } from '@nestjs/testing';
import * as nunjucks from 'nunjucks';

import config from 'src/shared/config';

import { NotificationService } from '../services/notification.service';
import {
  EmailPayload,
  EmailTemplateID,
  PushNotificationPayload,
} from '../types';

jest.mock('fs');
jest.mock('nunjucks');
jest.mock('src/shared/config');

const mockEmailQueue = {
  add: jest.fn(),
};

const mockPushNotificationQueue = {
  add: jest.fn(),
};

const mockFirebaseAdmin = {
  messaging: jest.fn(() => ({
    send: jest.fn().mockResolvedValue({ success: true }),
  })),
};

describe('NotificationService', () => {
  const payload: EmailPayload = {
    from: { email: 'from@example.com' },
    to: [{ email: 'to@example.com' }],
    subject: 'Test Subject',
    templateId: 'test-template' as EmailTemplateID,
    templateData: { name: 'Test' },
  };
  let service: NotificationService;

  beforeEach(async () => {
    // Mock config properly
    (config as jest.Mock).mockReturnValue({
      sendgrid: { fromEmail: 'default@example.com', apiKey: 'test-api-key' },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: 'BullQueue_emailQueue',
          useValue: mockEmailQueue,
        },
        {
          provide: 'BullQueue_pushNotificationQueue',
          useValue: mockPushNotificationQueue,
        },
        {
          provide: 'app',
          useValue: mockFirebaseAdmin,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);

    // Use jest.spyOn to mock the sendWithSendgrid method
    jest
      .spyOn(
        service as unknown as { sendWithSendgrid: jest.Mock },
        'sendWithSendgrid',
      )
      .mockResolvedValue({});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendEmail', () => {
    it('should add email job to queue', async () => {
      await service.sendEmail(payload);

      expect(mockEmailQueue.add).toHaveBeenCalledWith('send-email', payload);
    });
  });

  describe('processEmail', () => {
    it('should process email job', async () => {
      const templateContent = '<html>{{ name }}</html>';
      const renderedHtml = '<html>Test</html>';

      // Mock dependencies
      (readFileSync as jest.Mock).mockReturnValue(templateContent);
      (nunjucks.renderString as jest.Mock).mockReturnValue(renderedHtml);

      // Call function
      await service.processEmail(payload);

      // Assertions
      expect(readFileSync).toHaveBeenCalledWith(
        expect.stringContaining('test-template'),
        'utf-8',
      );
      expect(nunjucks.renderString).toHaveBeenCalledWith(
        templateContent,
        payload.templateData,
      );
      expect(service['sendWithSendgrid']).toHaveBeenCalledWith({
        from: { email: 'from@example.com' },
        to: [{ email: 'to@example.com' }],
        subject: 'Test Subject',
        html: renderedHtml,
      });
    });

    it('should use default from email if not provided', async () => {
      const templateContent = '<html>{{ name }}</html>';
      const renderedHtml = '<html>Test</html>';

      // Mock dependencies
      (readFileSync as jest.Mock).mockReturnValue(templateContent);
      (nunjucks.renderString as jest.Mock).mockReturnValue(renderedHtml);

      await service.processEmail({ ...payload, from: undefined });

      expect(service['sendWithSendgrid']).toHaveBeenCalledWith({
        from: { email: 'default@example.com' },
        to: [{ email: 'to@example.com' }],
        subject: 'Test Subject',
        html: renderedHtml,
      });
    });
  });

  describe('sendPushNotification', () => {
    const pushPayload: PushNotificationPayload = {
      title: 'Test Push',
      body: 'Test push notification body',
      deviceTokens: ['token1', 'token2'],
      data: { action: 'test' },
    };

    it('should add push notification job to queue', async () => {
      await service.sendPushNotification(pushPayload);

      expect(mockPushNotificationQueue.add).toHaveBeenCalledWith(
        'send-push-notification',
        pushPayload,
      );
    });
  });

  describe('processPushNotification', () => {
    const pushPayload: PushNotificationPayload = {
      title: 'Test Push',
      body: 'Test push notification body',
      deviceTokens: ['token1', 'token2'],
      data: { action: 'test' },
    };

    it('should process push notification job', async () => {
      const results = await service.processPushNotification(pushPayload);

      expect(mockFirebaseAdmin.messaging).toHaveBeenCalled();
      expect(results).toBeDefined();
    });
  });
});
