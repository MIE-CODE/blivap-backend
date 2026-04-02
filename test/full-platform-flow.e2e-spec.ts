import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { hashSync } from 'bcryptjs';
import { Model } from 'mongoose';
import * as request from 'supertest';

import { bootstrap } from 'src/bootstrap';
import { DB_TABLE_NAMES } from 'src/shared/constants';
import { BloodType, DonorGender } from 'src/shared/domain/enums';
import { UserDocument } from 'src/user/schemas/user.schema';

import { AppModule } from '../src/app.module';

describe('Full platform flow (e2e)', () => {
  let app: INestApplication;
  let userModel: Model<UserDocument>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let hospitalModel: Model<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let donorProfileModel: Model<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let bloodRequestModel: Model<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let bookingModel: Model<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let notificationModel: Model<any>;

  const requesterEmail = 'fullflow-requester@example.com';
  const donorEmail = 'fullflow-donor@example.com';
  const password = 'FlowPass123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<INestApplication>();
    userModel = moduleFixture.get(`${DB_TABLE_NAMES.users}Model`);
    hospitalModel = moduleFixture.get(`${DB_TABLE_NAMES.hospitals}Model`);
    donorProfileModel = moduleFixture.get(
      `${DB_TABLE_NAMES.donorProfiles}Model`,
    );
    bloodRequestModel = moduleFixture.get(
      `${DB_TABLE_NAMES.bloodRequests}Model`,
    );
    bookingModel = moduleFixture.get(`${DB_TABLE_NAMES.bookings}Model`);
    notificationModel = moduleFixture.get(
      `${DB_TABLE_NAMES.notifications}Model`,
    );

    await bootstrap(app, 0);

    await userModel.deleteMany({
      email: { $in: [requesterEmail, donorEmail] },
    });
    await donorProfileModel.deleteMany({});
    await bloodRequestModel.deleteMany({});
    await bookingModel.deleteMany({});
    await hospitalModel.deleteMany({ name: 'E2E Full Flow Hospital' });

    await userModel.create({
      firstname: 'Requester',
      lastname: 'User',
      email: requesterEmail,
      password: hashSync(password, 10),
      dateOfBirth: new Date('1994-05-10'),
    });
    await userModel.create({
      firstname: 'Donor',
      lastname: 'User',
      email: donorEmail,
      password: hashSync(password, 10),
      dateOfBirth: new Date('1992-03-15'),
    });

    await userModel.updateOne(
      { email: requesterEmail },
      { $set: { dateOfBirth: new Date('1994-05-10') } },
    );
    await userModel.updateOne(
      { email: donorEmail },
      { $set: { dateOfBirth: new Date('1992-03-15') } },
    );
  }, 120000);

  afterAll(async () => {
    const donors = await userModel.find({ email: donorEmail });
    const reqs = await userModel.find({ email: requesterEmail });
    const ids = [...donors, ...reqs].map((u) => u.id);
    await bookingModel.deleteMany({});
    await bloodRequestModel.deleteMany({});
    await donorProfileModel.deleteMany({ userId: { $in: ids } });
    await notificationModel.deleteMany({ userId: { $in: ids } });
    await hospitalModel.deleteMany({ name: 'E2E Full Flow Hospital' });
    await userModel.deleteMany({
      email: { $in: [requesterEmail, donorEmail] },
    });
    await app.close();
  }, 120000);

  it('register → donor questionnaire → blood request → match → booking → accept', async () => {
    const donorLogin = await request(app.getHttpServer())
      .post('/authentication/login')
      .send({ email: donorEmail, password });

    expect(donorLogin.status).toBe(200);
    const donorToken = donorLogin.body.data.accessToken;
    const donorUser = await userModel.findOne({ email: donorEmail });
    expect(donorUser).toBeTruthy();

    const loc = {
      type: 'Point' as const,
      coordinates: [3.3792, 6.5244] as [number, number],
    };

    const reg = await request(app.getHttpServer())
      .post('/donors/register')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        bloodType: BloodType.O_POS,
        location: loc,
      });
    expect(reg.status).toBe(201);

    const q = await request(app.getHttpServer())
      .post('/donors/questionnaire')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        gender: DonorGender.Female,
        age18to64: true,
        weightUnder50kg: false,
        organOrTissueTransplant: false,
        injectedDrugsOrDoping: false,
        diabetes: false,
        bloodProductsOrTransfusion: false,
        chronicOrSeriousCondition: false,
        hepatitisBVaccineLast2Weeks: false,
      });
    expect(q.status).toBe(201);
    expect(q.body.data.eligibilityStatus).toBe('eligible');

    const hospital = await hospitalModel.create({
      name: 'E2E Full Flow Hospital',
      addressLine: '1 Test Rd',
      city: 'Lagos',
      state: 'LA',
      location: loc,
    });

    const requesterLogin = await request(app.getHttpServer())
      .post('/authentication/login')
      .send({ email: requesterEmail, password });
    expect(requesterLogin.status).toBe(200);
    const requesterToken = requesterLogin.body.data.accessToken;

    const br = await request(app.getHttpServer())
      .post('/blood-requests')
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({
        neededBloodType: BloodType.A_POS,
        location: loc,
        urgent: false,
      });
    expect(br.status).toBe(201);
    const bloodRequestId = br.body.data.id;

    const match = await request(app.getHttpServer())
      .post(`/matching/blood-requests/${bloodRequestId}`)
      .set('Authorization', `Bearer ${requesterToken}`);
    expect(match.status).toBe(201);
    expect(Array.isArray(match.body.data)).toBe(true);

    const scheduledAt = new Date('2030-06-15T10:00:00.000Z').toISOString();
    const bookingRes = await request(app.getHttpServer())
      .post('/bookings')
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({
        donorUserId: donorUser!.id,
        hospitalId: hospital.id,
        scheduledAt,
        bloodRequestId,
      });
    expect(bookingRes.status).toBe(201);
    const bookingId = bookingRes.body.data.id;

    const accept = await request(app.getHttpServer())
      .patch(`/bookings/${bookingId}/respond`)
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ accept: true });
    expect(accept.status).toBe(200);
    expect(accept.body.data.status).toBe('accepted');

    const notif = await request(app.getHttpServer())
      .get('/notifications')
      .set('Authorization', `Bearer ${donorToken}`);
    expect(notif.status).toBe(200);
    expect(Array.isArray(notif.body.data)).toBe(true);
  }, 120000);
});
