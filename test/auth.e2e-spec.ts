import { createHash } from 'crypto';

import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { hashSync } from 'bcryptjs';
import * as moment from 'moment';
import { Types } from 'mongoose';
import * as request from 'supertest';

import { PasswordResetTokenDocument } from 'src/authentication/schemas/password-reset-token.schema';
import { bootstrap } from 'src/bootstrap';
import { Model } from 'src/database/schemas';
import { DB_TABLE_NAMES } from 'src/shared/constants';
import { UserDocument } from 'src/user/schemas/user.schema';

import { AppModule } from '../src/app.module';

function hashResetToken(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

describe('AuthController (e2e)', () => {
  let moduleFixture: TestingModule;
  let app: INestApplication;
  let userModel: Model<UserDocument>;
  let passwordResetTokenModel: Model<PasswordResetTokenDocument>;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<INestApplication>();
    userModel = moduleFixture.get(`${DB_TABLE_NAMES.users}Model`);
    passwordResetTokenModel = moduleFixture.get(
      getModelToken(DB_TABLE_NAMES.passwordResetTokens),
    );

    await bootstrap(app, 0);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/request-password-reset', () => {
    const testEmail = 'auth-flow-request-reset@example.com';

    beforeAll(async () => {
      await userModel.create({
        firstname: 'Auth',
        lastname: 'Flow',
        email: testEmail,
        password: hashSync('Password123!', 10),
      });
    });

    afterAll(async () => {
      await userModel.deleteMany({ email: testEmail });
      await passwordResetTokenModel.deleteMany({});
    });

    it('should return 200 with generic message for an existing user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/request-password-reset')
        .send({ email: testEmail });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe(
        'If an account exists for this email, you will receive password reset instructions.',
      );
    });

    it('should return 200 with generic message for an unknown email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/request-password-reset')
        .send({ email: 'unknown-auth-flow@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe(
        'If an account exists for this email, you will receive password reset instructions.',
      );
    });

    it('should reject invalid email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/request-password-reset')
        .send({ email: 'not-an-email' });

      expect(response.status).toBe(422);
    });
  });

  describe('POST /auth/reset-password', () => {
    const testEmail = 'auth-flow-reset@example.com';
    const rawToken = 'a'.repeat(64);

    beforeAll(async () => {
      await userModel.deleteMany({ email: testEmail });
      const user = await userModel.create({
        firstname: 'Auth',
        lastname: 'Reset',
        email: testEmail,
        password: hashSync('OldPassword123!', 10),
      });

      await passwordResetTokenModel.create({
        userId: new Types.ObjectId(user.id),
        tokenHash: hashResetToken(rawToken),
        expiresAt: moment().add(1, 'hour').toDate(),
        used: false,
      });
    });

    afterAll(async () => {
      await userModel.deleteMany({ email: testEmail });
      await passwordResetTokenModel.deleteMany({});
    });

    it('should reject a weak new password before applying the token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: rawToken,
          newPassword: 'weak',
        });

      expect(response.status).toBe(422);
      expect(response.body.errors).toBeDefined();
    });

    it('should reject an unknown token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: 'b'.repeat(64),
          newPassword: 'NewPassword123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid or unknown reset token');
    });

    it('should reset password with a valid token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: rawToken,
          newPassword: 'NewPassword123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('password reset successful');
      expect(response.body.data.user.email).toBe(testEmail);
      expect(response.body.data.accessToken).toBeDefined();
    });
  });
});
