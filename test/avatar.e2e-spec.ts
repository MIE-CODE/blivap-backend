import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

import { bootstrap } from 'src/bootstrap';

import { AppModule } from '../src/app.module';
import { AvatarService } from '../src/avatar/services/avatar.service';

describe('AvatarController (e2e)', () => {
  let app: INestApplication;

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

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AvatarService)
      .useValue({
        getAvatars: jest.fn().mockResolvedValue(mockAvatars),
        getAvatarUrl: jest.fn((publicId: string) =>
          Promise.resolve(
            publicId && publicId !== 'nonexistent-id'
              ? `https://res.cloudinary.com/test/image/upload/${publicId}`
              : null,
          ),
        ),
      })
      .compile();

    app = moduleFixture.createNestApplication<INestApplication>();

    await bootstrap(app, 0);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /avatar', () => {
    it('should return list of avatars with hosted Cloudinary URLs', async () => {
      const response = await request(app.getHttpServer()).get('/avatar');

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

  describe('GET /avatar/:publicId', () => {
    it('should return avatar URL for valid public id', async () => {
      const response = await request(app.getHttpServer()).get(
        '/avatar/avatar1',
      );

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('avatar');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.publicId).toBe('avatar1');
      expect(response.body.data.url).toContain('https://res.cloudinary.com');
    });

    it('should return 404 when avatar is not found', async () => {
      const response = await request(app.getHttpServer()).get(
        '/avatar/nonexistent-id',
      );

      expect(response.status).toBe(404);
    });
  });
});
