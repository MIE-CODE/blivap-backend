import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { hashSync } from 'bcryptjs';
import * as request from 'supertest';

import { bootstrap } from 'src/bootstrap';
import { Model } from 'src/database/schemas';
import { NinVerificationService } from 'src/nin-verification/services/nin-verification.service';
import { DB_TABLE_NAMES } from 'src/shared/constants';
import { Response } from 'src/shared/response';
import { UserDocument } from 'src/user/schemas/user.schema';

import { AppModule } from '../src/app.module';

describe('NinVerificationController (e2e)', () => {
  let app: INestApplication;
  let userModel: Model<UserDocument>;
  let accessToken: string;

  const testEmail = 'nin-e2e@example.com';

  const mockNinVerificationService = {
    verifyUploadedPdf: jest.fn().mockImplementation(() =>
      Promise.resolve(
        Response.json('NIN verified successfully', {
          nationalIdentificationNumber: '12345678901',
          nationalIdentificationNumberVerified: true,
        }),
      ),
    ),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(NinVerificationService)
      .useValue(mockNinVerificationService)
      .compile();

    app = moduleFixture.createNestApplication<INestApplication>();
    userModel = moduleFixture.get(`${DB_TABLE_NAMES.users}Model`);

    await bootstrap(app, 0);

    await userModel.create({
      firstname: 'NIN',
      lastname: 'Tester',
      email: testEmail,
      password: hashSync('Password123!', 10),
      dateOfBirth: new Date('1990-01-01'),
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/authentication/login')
      .send({ email: testEmail, password: 'Password123!' });

    accessToken = loginResponse.body.data.accessToken;
  });

  afterAll(async () => {
    await userModel.deleteMany({ email: testEmail });
    await app.close();
  });

  describe('POST /nin-verification', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/nin-verification')
        .attach('file', Buffer.from('%PDF-1.4 minimal'), 'nin.pdf');

      expect(response.status).toBe(401);
    });

    it('should return 400 when file is missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/nin-verification')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('PDF file is required');
    });

    it('should return success when PDF is uploaded', async () => {
      const response = await request(app.getHttpServer())
        .post('/nin-verification')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', Buffer.from('%PDF-1.4 minimal'), 'nin.pdf');

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('NIN verified successfully');
      expect(response.body.data).toEqual({
        nationalIdentificationNumber: '12345678901',
        nationalIdentificationNumberVerified: true,
      });
      expect(mockNinVerificationService.verifyUploadedPdf).toHaveBeenCalled();
    });
  });
});
