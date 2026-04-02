import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import * as moment from 'moment';

import config from 'src/shared/config';
import { NotificationEventType } from 'src/shared/domain/enums';
import { UserService } from 'src/user/services/user.service';

import { EmailTemplateID } from '../types';

import { InAppNotificationService } from './in-app-notification.service';
import { NotificationService } from './notification.service';
import { PushSubscriptionService } from './push-subscription.service';

@Injectable()
export class NotificationOrchestratorService {
  constructor(
    private readonly inApp: InAppNotificationService,
    private readonly notificationService: NotificationService,
    private readonly pushSubs: PushSubscriptionService,
    private readonly userService: UserService,
  ) {}

  private async fanOut(
    userId: string,
    type: NotificationEventType,
    title: string,
    body: string,
    data: Record<string, unknown>,
    email?: {
      subject: string;
      templateId: EmailTemplateID;
      templateData: Record<string, unknown>;
    },
  ) {
    await this.inApp.create(userId, type, title, body, data);

    const fcmTokens = await this.pushSubs.getFcmTokensForUser(userId);
    if (fcmTokens.length) {
      await this.notificationService.sendPushNotification({
        title,
        body,
        deviceTokens: fcmTokens,
        data: Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v)]),
        ),
      });
    }

    const webSubs = await this.pushSubs.getWebSubscriptionsForUser(userId);
    if (webSubs.length) {
      await this.notificationService.sendWebPush({
        title,
        body,
        data: Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v)]),
        ),
        subscriptions: webSubs,
      });
    }

    if (email) {
      const user = await this.userService.findById(userId);
      if (user?.email) {
        await this.notificationService.sendEmail({
          subject: email.subject,
          to: [
            { email: user.email, name: `${user.firstname} ${user.lastname}` },
          ],
          templateId: email.templateId,
          templateData: email.templateData,
        });
      }
    }
  }

  @OnEvent('booking.created')
  async onBookingCreated(payload: {
    bookingId: string;
    requesterId: string;
    donorUserId: string;
  }) {
    const appUrl = config().client.baseUrl || 'https://blivap.com';
    await this.fanOut(
      payload.donorUserId,
      NotificationEventType.BookingRequestSent,
      'New booking request',
      'Someone requested a donation appointment with you.',
      { bookingId: payload.bookingId },
      {
        subject: 'New booking request',
        templateId: EmailTemplateID.BOOKING_CONFIRMATION,
        templateData: {
          name: 'Donor',
          appointmentDateTime: moment().format('LLL'),
          locationName: 'Hospital',
          counterpartyName: 'Requester',
          calendarUrl: appUrl,
        },
      },
    );
  }

  @OnEvent('booking.accepted')
  async onBookingAccepted(payload: {
    bookingId: string;
    requesterId: string;
    donorUserId: string;
  }) {
    const appUrl = config().client.baseUrl || 'https://blivap.com';
    await this.fanOut(
      payload.requesterId,
      NotificationEventType.BookingAccepted,
      'Booking accepted',
      'A donor accepted your booking request.',
      { bookingId: payload.bookingId },
      {
        subject: 'Booking confirmed',
        templateId: EmailTemplateID.BOOKING_CONFIRMATION,
        templateData: {
          name: 'Requester',
          appointmentDateTime: moment().format('LLL'),
          locationName: 'Hospital',
          counterpartyName: 'Donor',
          calendarUrl: appUrl,
        },
      },
    );
  }

  @OnEvent('booking.rejected')
  async onBookingRejected(payload: {
    bookingId: string;
    requesterId: string;
    donorUserId: string;
  }) {
    await this.fanOut(
      payload.requesterId,
      NotificationEventType.BookingRejected,
      'Booking declined',
      'A donor declined your booking request.',
      { bookingId: payload.bookingId },
      {
        subject: 'Booking update',
        templateId: EmailTemplateID.REQUEST_DECLINED_BY_DONOR,
        templateData: { name: 'Requester' },
      },
    );
  }

  @OnEvent('matching.completed')
  async onMatchingCompleted(payload: {
    requesterId: string;
    bloodRequestId: string;
    topDonorUserId?: string;
  }) {
    if (!payload.topDonorUserId) {
      return;
    }
    const appUrl = config().client.baseUrl || 'https://blivap.com';
    await this.fanOut(
      payload.requesterId,
      NotificationEventType.DonorMatched,
      'Donors matched',
      'We found compatible donors for your request.',
      {
        bloodRequestId: payload.bloodRequestId,
        donorUserId: payload.topDonorUserId,
      },
      {
        subject: 'Match found',
        templateId: EmailTemplateID.DONOR_MATCHED_REQUESTER,
        templateData: {
          name: 'Requester',
          requestId: payload.bloodRequestId,
          chatUrl: appUrl,
        },
      },
    );
  }

  @OnEvent('verification.approved')
  async onVerificationApproved(payload: { userId: string }) {
    await this.fanOut(
      payload.userId,
      NotificationEventType.VerificationApproved,
      'Identity verified',
      'Your government ID verification succeeded.',
      {},
      {
        subject: 'Verification successful',
        templateId: EmailTemplateID.NIN_VERIFICATION_SUCCESSFUL,
        templateData: { name: 'User' },
      },
    );
  }

  @OnEvent('verification.rejected')
  async onVerificationRejected(payload: { userId: string; reason?: string }) {
    await this.fanOut(
      payload.userId,
      NotificationEventType.VerificationRejected,
      'Verification issue',
      payload.reason ?? 'Could not verify your document.',
      {},
      {
        subject: 'Verification',
        templateId: EmailTemplateID.NIN_VERIFICATION_FAILED,
        templateData: { name: 'User' },
      },
    );
  }
}
