import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

import { AvatarService } from 'src/avatar/services/avatar.service';
import { bootstrap } from 'src/bootstrap';
import { Model } from 'src/database/schemas';
import { DB_TABLE_NAMES } from 'src/shared/constants';
import { UserDocument } from 'src/user/schemas/user.schema';

import { AppModule } from '../src/app.module';

/**
 * Multi-step flow: signup → login → profile → avatar → logout.
 */
describe('User journey (e2e)', () => {
  let app: INestApplication;
  let userModel: Model<UserDocument>;

  const journeyEmail = 'user-journey@example.com';
  const password = 'JourneyPass123!';
  const mockAvatars = [
    {
      id: 'journey-avatar1',
      publicId: 'avatars/journey-avatar1',
      url: 'https://res.cloudinary.com/test/image/upload/v1/journey-avatar1.jpg',
    },
  ];
  const updatedProfileImage =
    'https://res.cloudinary.com/test/image/upload/v1/journey-avatar2.jpg';

  const mockAvatarService = {
    getAvatars: jest.fn().mockResolvedValue(mockAvatars),
    updateAvatar: jest
      .fn()
      .mockImplementation((_user, profileImage: string) =>
        Promise.resolve({ profileImage }),
      ),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AvatarService)
      .useValue(mockAvatarService)
      .compile();

    app = moduleFixture.createNestApplication<INestApplication>();
    userModel = moduleFixture.get(`${DB_TABLE_NAMES.users}Model`);

    await bootstrap(app, 0);
  });

  afterAll(async () => {
    await userModel.deleteMany({ email: journeyEmail });
    await app.close();
  });

  it('runs signup through logout as one journey', async () => {
    const signupResponse = await request(app.getHttpServer())
      .post('/authentication/signup')
      .send({
        email: journeyEmail,
        password,
        firstname: 'Journey',
        lastname: 'User',
      });

    expect(signupResponse.status).toBe(201);
    let accessToken = signupResponse.body.data.accessToken;

    const loginResponse = await request(app.getHttpServer())
      .post('/authentication/login')
      .send({ email: journeyEmail, password });

    expect(loginResponse.status).toBe(200);
    accessToken = loginResponse.body.data.accessToken;

    const meResponse = await request(app.getHttpServer())
      .get('/authentication/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.data.email).toBe(journeyEmail);

    const updateResponse = await request(app.getHttpServer())
      .put('/authentication/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ firstname: 'JourneyUpdated', lastname: 'Renamed' });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data[0].firstname).toBe('JourneyUpdated');

    const avatarsResponse = await request(app.getHttpServer())
      .get('/avatar')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(avatarsResponse.status).toBe(200);
    expect(avatarsResponse.body.data).toHaveLength(1);

    const avatarPostResponse = await request(app.getHttpServer())
      .post('/avatar')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ profileImage: updatedProfileImage });

    expect(avatarPostResponse.status).toBe(201);
    expect(avatarPostResponse.body.data.profileImage).toBe(updatedProfileImage);

    const logoutResponse = await request(app.getHttpServer())
      .post('/authentication/logout')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(logoutResponse.status).toBe(200);

    const secondLogout = await request(app.getHttpServer())
      .post('/authentication/logout')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(secondLogout.status).toBe(401);
  });
});
