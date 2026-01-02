import { readFileSync } from 'fs';
import { join } from 'path';

import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import * as sendGridMail from '@sendgrid/mail';
import { Queue } from 'bullmq';
import * as admin from 'firebase-admin';
import * as nunjucks from 'nunjucks';

import config from 'src/shared/config';
import { QUEUE_NAMES } from 'src/shared/constants';

import { EmailPayload, PushNotificationPayload } from '../types';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.email) private readonly emailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.pushNotification)
    private readonly pushNotificationQueue: Queue,
    @Inject(admin.app.name)
    private readonly firebaseAdmin: admin.app.App,
  ) {}

  async sendEmail(payload: EmailPayload) {
    try {
      // Add job to queue
      await this.emailQueue.add('send-email', payload);

      this.logger.log('Email job added to queue', { payload });
    } catch (error) {
      this.logger.error('Failed to add email job to queue', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async processEmail(payload: EmailPayload) {
    const templatePath = join(process.cwd(), 'templates', payload.templateId);
    const template = readFileSync(templatePath, 'utf-8');
    const html = nunjucks.renderString(template, payload.templateData);

    return this.sendWithSendgrid({
      from: payload.from ?? { email: config().sendgrid.fromEmail },
      to: payload.to,
      subject: payload.subject,
      html,
    });
  }

  async sendPushNotification(payload: PushNotificationPayload) {
    try {
      // Add job to queue
      await this.pushNotificationQueue.add('send-push-notification', payload);

      this.logger.log('Push notification job added to queue', { payload });
    } catch (error) {
      this.logger.error('Failed to add push notification job to queue', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async processPushNotification(payload: PushNotificationPayload) {
    const messages = payload.deviceTokens.map((token) => ({
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
      token: token,
    }));

    try {
      const responses = await Promise.allSettled(
        messages.map((message) => this.firebaseAdmin.messaging().send(message)),
      );

      const results = responses.map((response, index) => ({
        token: payload.deviceTokens[index],
        success: response.status === 'fulfilled',
        error: response.status === 'rejected' ? response.reason : null,
      }));

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      this.logger.log('Push notifications sent', {
        successCount,
        failureCount,
        totalTokens: payload.deviceTokens.length,
      });

      // Log failed tokens for cleanup
      if (failureCount > 0) {
        const failedTokens = results
          .filter((r) => !r.success)
          .map((r) => ({ token: r.token, error: r.error?.message }));

        this.logger.warn('Some push notifications failed', {
          failedTokens,
        });
      }

      return results;
    } catch (error) {
      this.logger.error('Failed to send push notifications', {
        error: error.message,
        stack: error.stack,
        payload,
      });
      throw error;
    }
  }

  private async sendWithSendgrid(payload: {
    to: { email: string; name?: string }[];
    from?: { name?: string; email: string };
    subject: string;
    html: string;
  }) {
    try {
      sendGridMail.setApiKey(config().sendgrid.apiKey);

      const msg = {
        to: payload.to,
        from: payload.from,
        subject: payload.subject,
        html: payload.html,
      };

      const response = await sendGridMail.send(msg);

      this.logger.log('Email sent with Sendgrid', { response });

      return response;
    } catch (error) {
      this.logger.error(
        `Failed to send email with Sendgrid - ${error.message}`,
        {
          data: error.response?.body,
          stack: error.stack,
        },
      );

      throw error;
    }
  }
}
