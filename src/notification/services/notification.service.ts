import { readFileSync } from 'fs';
import { join } from 'path';

import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { Queue } from 'bullmq';
import * as admin from 'firebase-admin';
import * as nunjucks from 'nunjucks';
import { Resend } from 'resend';
import * as webpush from 'web-push';

import config from 'src/shared/config';
import { QUEUE_NAMES } from 'src/shared/constants';

import {
  EmailPayload,
  PushNotificationPayload,
  WebPushJobPayload,
} from '../types';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.email) private readonly emailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.pushNotification)
    private readonly pushNotificationQueue: Queue,
    @InjectQueue(QUEUE_NAMES.webPush) private readonly webPushQueue: Queue,
    @Optional()
    @Inject(admin.app.name)
    private readonly firebaseAdmin: admin.app.App | null,
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

    return this.sendWithResend({
      from: payload.from ?? { email: config().resend.fromEmail },
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

  async sendWebPush(payload: WebPushJobPayload) {
    try {
      await this.webPushQueue.add('send-web-push', payload);
      this.logger.log('Web push job added to queue');
    } catch (error) {
      this.logger.error('Failed to add web push job', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async processWebPush(payload: WebPushJobPayload) {
    const wp = config().webPush;
    if (!wp.publicKey || !wp.privateKey) {
      this.logger.warn('Web push skipped: VAPID keys not configured');
      return;
    }
    webpush.setVapidDetails(wp.subject, wp.publicKey, wp.privateKey);

    const body = JSON.stringify({
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
    });

    for (const sub of payload.subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          body,
        );
      } catch (e) {
        this.logger.warn('Web push send failed', {
          endpoint: sub.endpoint?.slice(0, 48),
          message: e.message,
        });
      }
    }
  }

  async processPushNotification(payload: PushNotificationPayload) {
    if (!this.firebaseAdmin) {
      this.logger.warn('FCM skipped: Firebase not configured');
      return [];
    }

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

  private async sendWithResend(payload: {
    to: { email: string; name?: string }[];
    from?: { name?: string; email: string };
    subject: string;
    html: string;
  }) {
    try {
      const resend = new Resend(config().resend.apiKey);

      const fromAddress = payload.from
        ? payload.from.name
          ? `${payload.from.name} <${payload.from.email}>`
          : payload.from.email
        : config().resend.fromEmail;

      const toAddresses = payload.to.map((recipient) =>
        recipient.name
          ? `${recipient.name} <${recipient.email}>`
          : recipient.email,
      );

      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: toAddresses,
        subject: payload.subject,
        html: payload.html,
      });

      if (error) {
        this.logger.error(
          `Failed to send email with Resend - ${error.message}`,
          {
            name: error.name,
          },
        );
        throw error;
      }

      this.logger.log('Email sent with Resend', { data });

      return data;
    } catch (error) {
      this.logger.error(`Failed to send email with Resend - ${error.message}`);
      throw error;
    }
  }
}
