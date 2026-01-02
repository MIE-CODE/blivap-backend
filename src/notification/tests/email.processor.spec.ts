import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';

import { EmailProcessor } from '../processors/email.processor';
import { NotificationService } from '../services/notification.service';
import { EmailPayload, EmailTemplateID } from '../types';

describe('EmailProcessor', () => {
  let processor: EmailProcessor;
  let mockNotificationService: jest.Mocked<NotificationService>;

  const mockJob = {
    id: 'test-job-id',
    data: {
      from: { email: 'from@example.com' },
      to: [{ email: 'to@example.com' }],
      subject: 'Test Subject',
      templateId: EmailTemplateID.VERIFY_EMAIL_ADDRESS,
      templateData: { name: 'Test' },
    } as EmailPayload,
    attemptsMade: 1,
  } as Job<EmailPayload>;

  beforeEach(async () => {
    mockNotificationService = {
      processEmail: jest.fn(),
      sendEmail: jest.fn(),
    } as unknown as jest.Mocked<NotificationService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailProcessor,
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    processor = module.get<EmailProcessor>(EmailProcessor);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('process', () => {
    it('should process email job successfully', async () => {
      await processor.process(mockJob);

      expect(mockNotificationService.processEmail).toHaveBeenCalledWith(
        mockJob.data,
      );
    });

    it('should handle errors and trigger retry mechanism', async () => {
      const error = new Error('Test error');
      mockNotificationService.processEmail.mockRejectedValueOnce(error);

      await expect(processor.process(mockJob)).rejects.toThrow('Test error');
    });
  });
});
