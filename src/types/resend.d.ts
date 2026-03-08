declare module 'resend' {
  export interface IResendEmailSendPayload {
    from: string;
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
  }

  export interface IResendEmailSendResult {
    data: unknown;
    error: Error | null;
  }

  export class Resend {
    constructor(apiKey: string);

    emails: {
      send(payload: IResendEmailSendPayload): Promise<IResendEmailSendResult>;
    };
  }
}
