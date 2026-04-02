import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { hashSync } from 'bcryptjs';
import * as request from 'supertest';

import { bootstrap } from 'src/bootstrap';
import { Model } from 'src/database/schemas';
import { DB_TABLE_NAMES } from 'src/shared/constants';
import { UserDocument } from 'src/user/schemas/user.schema';

import { AppModule } from '../src/app.module';
import { AvatarService } from '../src/avatar/services/avatar.service';

describe('AvatarController (e2e)', () => {
  let app: INestApplication;
  let userModel: Model<UserDocument>;
  let accessToken: string;

  const testEmail = 'avatar-test@example.com';

  const mockAvatars = [
    {
      id: 'avatar1',
      publicId: 'avatars/avatar1',
      url: 'https://res.cloudinary.com/test/image/upload/v1/avatars/avatar1.jpg',
    },
    {
      id: 'avatar2',
      publicId: 'avatars/avatar2',
      url: 'https://res.cloudinary.com/test/image/upload/v1/avatars/avatar2.png',
    },
  ];
  const updatedProfileImage =
    'https://res.cloudinary.com/test/image/upload/v1/avatars/avatar3.jpg';
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
    userModel = moduleFixture.get<typeof userModel>(
      `${DB_TABLE_NAMES.users}Model`,
    );

    await bootstrap(app, 0);

    await userModel.create({
      firstname: 'Avatar',
      lastname: 'Tester',
      email: testEmail,
      password: hashSync('password', 10),
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/authentication/login')
      .send({ email: testEmail, password: 'password' });

    accessToken = loginResponse.body.data.accessToken;
  });

  afterAll(async () => {
    await userModel.deleteMany({ email: testEmail });
    await app.close();
  });

  describe('GET /avatar', () => {
    it('should not return avatars without authentication', async () => {
      const response = await request(app.getHttpServer()).get('/avatar');

      expect(response.status).toBe(401);
    });

    it('should return list of avatars with hosted Cloudinary URLs', async () => {
      const response = await request(app.getHttpServer())
        .get('/avatar')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('avatars');
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toMatchObject({
        id: 'avatar1',
        publicId: 'avatars/avatar1',
        url: expect.stringContaining('https://res.cloudinary.com'),
      });
      expect(response.body.data[1]).toMatchObject({
        id: 'avatar2',
        publicId: 'avatars/avatar2',
        url: expect.stringContaining('https://res.cloudinary.com'),
      });
    });
  });

  describe('POST /avatar', () => {
    it('should not update avatar without authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/avatar')
        .send({ profileImage: updatedProfileImage });

      expect(response.status).toBe(401);
    });

    it('should validate the avatar payload', async () => {
      const response = await request(app.getHttpServer())
        .post('/avatar')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(422);
      expect(response.body.errors).toEqual({
        profileImage:
          'profileImage must be a URL address, profileImage should not be empty and profileImage must be a string',
      });
    });

    it('should update the user profile image', async () => {
      const response = await request(app.getHttpServer())
        .post('/avatar')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ profileImage: updatedProfileImage });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('avatar updated');
      expect(response.body.data).toEqual({
        profileImage: updatedProfileImage,
      });
    });
  });
});
