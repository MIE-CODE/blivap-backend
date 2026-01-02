export type EmailAddress = {
  email: string;
  name?: string;
};

export enum EmailTemplateID {
  VERIFY_EMAIL_ADDRESS = 'verify-email-address.njk',
  RESET_PASSWORD = 'reset-password.njk',
}

export type EmailPayload = {
  subject: string;
  from?: EmailAddress;
  to: EmailAddress[];
  templateId: EmailTemplateID;
  templateData: Record<string, unknown>;
};

export type PushNotificationPayload = {
  title: string;
  body: string;
  deviceTokens: string[];
  data?: { [key: string]: string };
};
