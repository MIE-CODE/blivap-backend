import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { hashSync } from 'bcryptjs';
import * as moment from 'moment';
import * as request from 'supertest';

import { bootstrap } from 'src/bootstrap';
import { Model } from 'src/database/schemas';
import { DB_TABLE_NAMES } from 'src/shared/constants';
import { UserDocument } from 'src/user/schemas/user.schema';

import { AppModule } from './../src/app.module';

describe('AuthenticationController (e2e)', () => {
  let moduleFixture: TestingModule;
  let app: INestApplication;
  let userModel: Model<UserDocument>;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<INestApplication>();

    userModel = moduleFixture.get<typeof userModel>(
      `${DB_TABLE_NAMES.users}Model`,
    );

    await bootstrap(app, 2);
  });

  describe('POST /authentication/login', () => {
    const testEmail = 'login-test@example.com';

    beforeAll(async () => {
      await userModel.create({
        firstname: 'John',
        lastname: 'Doe',
        email: testEmail,
        password: hashSync('password', 10),
      });
    });

    afterAll(async () => {
      await userModel.deleteMany({ email: testEmail });
    });

    it('should login a user', async () => {
      const response = await request(app.getHttpServer())
        .post('/authentication/login')
        .send({ email: testEmail, password: 'password' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('login successful');
      expect(response.body.data.user.email).toBe(testEmail);
      expect(response.body.data.accessToken).toBeDefined();
      expect(
        moment(response.body.data.accessTokenExpires).isAfter(
          moment().add(1, 'day').subtract(1, 'hour'),
        ),
      ).toBe(true);
    });

    it('should not login a user with an incorrect password', async () => {
      const response = await request(app.getHttpServer())
        .post('/authentication/login')
        .send({ email: testEmail, password: 'incorrect' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('invalid credentials');
    });

    it('should not login a user with an incorrect email', async () => {
      const response = await request(app.getHttpServer())
        .post('/authentication/login')
        .send({ email: 'incorrect@example.com', password: 'password' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('invalid credentials');
    });
  });

  describe('POST /authentication/signup', () => {
    const testEmail = 'signup-test@example.com';

    afterAll(async () => {
      await userModel.deleteMany({ email: testEmail });
    });

    it('should sign up a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/authentication/signup')
        .send({
          email: testEmail,
          password: 'Password123!',
          firstname: 'John',
          lastname: 'Doe',
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('signup successful');
      expect(response.body.data.user.email).toBe(testEmail);
      expect(response.body.data.accessToken).toBeDefined();
      expect(
        moment(response.body.data.accessTokenExpires).isAfter(
          moment().add(1, 'day').subtract(1, 'hour'),
        ),
      ).toBe(true);
    });

    it('should not sign up a user with an existing email', async () => {
      const response = await request(app.getHttpServer())
        .post('/authentication/signup')
        .send({
          email: testEmail,
          password: 'Password123!',
          firstname: 'John',
          lastname: 'Doe',
        });

      expect(response.status).toBe(409);
    });

    it('should not sign up a user with invalid payload', async () => {
      const response = await request(app.getHttpServer())
        .post('/authentication/signup')
        .send({
          email: 'invalid-email',
          password: 'password',
        });

      expect(response.status).toBe(422);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors).toEqual({
        email: 'email must be an email',
        firstname:
          'firstname should not be empty and firstname must be a string',
        lastname: 'lastname should not be empty and lastname must be a string',
        password:
          'Password must be at least 8 characters long, include at least one uppercase letter, one lowercase letter, one number, and one special character.',
      });
    });
  });

  describe('POST /authentication/verify-email', () => {
    const testEmail = 'verify-email-test@example.com';

    beforeAll(async () => {
      await userModel.create({
        email: testEmail,
        password: hashSync('password', 10),
        firstname: 'John',
        lastname: 'Doe',
        emailValidationToken: '123456',
      });
    });

    afterAll(async () => {
      await userModel.deleteMany({ email: testEmail });
    });

    it('should verify an email', async () => {
      const response = await request(app.getHttpServer())
        .post('/authentication/verify-email')
        .send({ email: testEmail, emailValidationToken: '123456' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('verification successful');
    });

    it('should not verify an email with an invalid email validation token', async () => {
      const response = await request(app.getHttpServer())
        .post('/authentication/verify-email')
        .send({ email: testEmail, emailValidationToken: 'invalid-token' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('invalid email validation token');
    });

    it('should not verify an invalid payload', async () => {
      const response = await request(app.getHttpServer())
        .post('/authentication/verify-email')
        .send({ email: 'invalid-email' });

      expect(response.status).toBe(422);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors).toEqual({
        email: 'email must be an email',
        emailValidationToken:
          'emailValidationToken should not be empty and emailValidationToken must be a string',
      });
    });
  });

  describe('POST /authentication/resend-email-verification-link', () => {
    const testEmail = 'resend-email-verification-link-test@example.com';

    it('should resend an email verification link', async () => {
      const response = await request(app.getHttpServer())
        .post('/authentication/resend-email-verification-link')
        .query({ email: testEmail });

      expect(response.status).toBe(200);
    });
  });

  describe('POST /authentication/forgot-password', () => {
    const testEmail = 'forgot-password-test@example.com';

    beforeAll(async () => {
      await userModel.create({
        email: testEmail,
        password: hashSync('password', 10),
        firstname: 'John',
        lastname: 'Doe',
      });
    });

    afterAll(async () => {
      await userModel.deleteMany({ email: testEmail });
    });

    it('should send password reset email for existing user', async () => {
      const response = await request(app.getHttpServer())
        .post('/authentication/forgot-password')
        .send({ email: testEmail });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('success');

      // Give it a second to update the user
      await new Promise((resolve) => {
        setTimeout(resolve, 1000);
      });

      const user = await userModel.findOne({ email: testEmail });
      expect(user.passwordResetCode).toBeDefined();
      expect(user.passwordResetCodeExpiresAt).toBeDefined();
      expect(moment(user.passwordResetCodeExpiresAt).isAfter(moment())).toBe(
        true,
      );
    });

    it('should not send email for non-existent user', async () => {
      const response = await request(app.getHttpServer())
        .post('/authentication/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('success');
    });

    it('should not accept invalid email', async () => {
      const response = await request(app.getHttpServer())
        .post('/authentication/forgot-password')
        .send({ email: 'invalid-email' });

      expect(response.status).toBe(422);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors).toEqual({
        email: 'email must be an email',
      });
    });
  });

  describe('POST /authentication/reset-password', () => {
    const testEmail = 'reset-password-test@example.com';
    let resetToken: string;

    beforeAll(async () => {
      await userModel.deleteMany({ email: testEmail });
      const user = await userModel.create({
        email: testEmail,
        password: hashSync('oldPassword', 10),
        firstname: 'John',
        lastname: 'Doe',
        passwordResetCode: 'RESET123',
        passwordResetCodeExpiresAt: moment().add(1, 'hour').toDate(),
      });
      resetToken = user.passwordResetCode;
    });

    afterAll(async () => {
      await userModel.deleteMany({ email: testEmail });
    });

    it('should reset password with valid token', async () => {
      const response = await request(app.getHttpServer())
        .post('/authentication/reset-password')
        .send({
          resetToken,
          password: 'NewPassword123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('password reset successful');
      expect(response.body.data.user.email).toBe(testEmail);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.accessTokenExpires).toBeDefined();

      const user = await userModel.findOne({ email: testEmail });
      expect(user.passwordResetCode).toBeNull();
      expect(user.passwordResetCodeExpiresAt).toBeNull();
    });

    it('should not reset password with invalid token', async () => {
      const response = await request(app.getHttpServer())
        .post('/authentication/reset-password')
        .send({
          resetToken: 'INVALID_TOKEN',
          password: 'NewPassword123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid reset token');
    });

    it('should not accept invalid password', async () => {
      const response = await request(app.getHttpServer())
        .post('/authentication/reset-password')
        .send({
          resetToken,
          password: 'weak',
        });

      expect(response.status).toBe(422);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors).toEqual({
        password:
          'Password must be at least 8 characters long, include at least one uppercase letter, one lowercase letter, one number, and one special character.',
      });
    });
  });

  describe('GET /authentication/me', () => {
    const testEmail = 'me-test@example.com';
    let accessToken: string;

    beforeAll(async () => {
      await userModel.create({
        email: testEmail,
        password: hashSync('password', 10),
        firstname: 'John',
        lastname: 'Doe',
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/authentication/login')
        .send({ email: testEmail, password: 'password' });

      accessToken = loginResponse.body.data.accessToken;
    });

    afterAll(async () => {
      await userModel.deleteMany({ email: testEmail });
    });

    it('should get current user profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/authentication/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('me');
      expect(response.body.data.email).toBe(testEmail);
      expect(response.body.data.firstname).toBe('John');
      expect(response.body.data.lastname).toBe('Doe');
    });

    it('should not get profile without token', async () => {
      const response = await request(app.getHttpServer()).get(
        '/authentication/me',
      );

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /authentication/me', () => {
    const testEmail = 'edit-profile-test@example.com';
    let accessToken: string;

    beforeAll(async () => {
      await userModel.create({
        email: testEmail,
        password: hashSync('password', 10),
        firstname: 'John',
        lastname: 'Doe',
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/authentication/login')
        .send({ email: testEmail, password: 'password' });

      accessToken = loginResponse.body.data.accessToken;
    });

    afterAll(async () => {
      await userModel.deleteMany({ email: testEmail });
    });

    it('should update user profile', async () => {
      const response = await request(app.getHttpServer())
        .put('/authentication/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          firstname: 'Updated',
          lastname: 'Name',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('profile update successful');
      expect(response.body.data[0].firstname).toBe('Updated');
      expect(response.body.data[0].lastname).toBe('Name');
    });

    it('should not update profile without token', async () => {
      const response = await request(app.getHttpServer())
        .put('/authentication/me')
        .send({
          firstname: 'Updated',
          lastname: 'Name',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /authentication/change-password', () => {
    const testEmail = 'change-password-test@example.com';
    let accessToken: string;

    beforeAll(async () => {
      await userModel.create({
        email: testEmail,
        password: hashSync('OldPassword123!', 10),
        firstname: 'John',
        lastname: 'Doe',
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/authentication/login')
        .send({ email: testEmail, password: 'OldPassword123!' });

      accessToken = loginResponse.body.data.accessToken;
    });

    afterAll(async () => {
      await userModel.deleteMany({ email: testEmail });
    });

    it('should change password with valid old password', async () => {
      const response = await request(app.getHttpServer())
        .put('/authentication/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          oldPassword: 'OldPassword123!',
          password: 'NewPassword123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('password changed');
      expect(response.body.data.user.email).toBe(testEmail);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.accessTokenExpires).toBeDefined();

      accessToken = response.body.data.accessToken;

      // Verify new password works
      const loginResponse = await request(app.getHttpServer())
        .post('/authentication/login')
        .send({ email: testEmail, password: 'NewPassword123!' });

      expect(loginResponse.status).toBe(200);
    });

    it('should not change password with invalid old password', async () => {
      const response = await request(app.getHttpServer())
        .put('/authentication/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          oldPassword: 'WrongPassword123!',
          password: 'NewPassword123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid password');
    });

    it('should not change password without token', async () => {
      const response = await request(app.getHttpServer())
        .put('/authentication/change-password')
        .send({
          oldPassword: 'OldPassword123!',
          password: 'NewPassword123!',
        });

      expect(response.status).toBe(401);
    });

    it('should not accept invalid new password', async () => {
      const response = await request(app.getHttpServer())
        .put('/authentication/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          oldPassword: 'OldPassword123!',
          password: 'weak',
        });

      expect(response.status).toBe(422);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors).toEqual({
        password:
          'Password must be at least 8 characters long, include at least one uppercase letter, one lowercase letter, one number, and one special character.',
      });
    });
  });

  describe('POST /authentication/logout', () => {
    const testEmail = 'logout-test@example.com';
    let accessToken: string;

    beforeAll(async () => {
      await userModel.create({
        email: testEmail,
        password: hashSync('password', 10),
        firstname: 'John',
        lastname: 'Doe',
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/authentication/login')
        .send({ email: testEmail, password: 'password' });

      accessToken = loginResponse.body.data.accessToken;
    });

    afterAll(async () => {
      await userModel.deleteMany({ email: testEmail });
    });

    it('should log out a user', async () => {
      const response = await request(app.getHttpServer())
        .post('/authentication/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);

      // verify the token is logged out
      const response2 = await request(app.getHttpServer())
        .post('/authentication/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response2.status).toBe(401);
    });
  });
});
