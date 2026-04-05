import { ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';

import { User } from 'src/user/schemas/user.schema';
import { UserService } from 'src/user/services/user.service';

import { NinVerificationService } from '../services/nin-verification.service';

describe('NinVerificationService', () => {
  let service: NinVerificationService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        NinVerificationService,
        { provide: UserService, useValue: {} },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(NinVerificationService);
  });

  it('rejects upload when NIN is already verified', async () => {
    const user = {
      nationalIdentificationNumberVerified: true,
    } as User;

    await expect(
      service.verifyUploadedPdf(user, '/tmp/does-not-matter.pdf'),
    ).rejects.toThrow(ConflictException);
  });
});
