import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { JwtGuard } from 'src/authentication/guards/jwt.guard';
import { BloodRequestService } from 'src/blood-request/services/blood-request.service';
import { CurrentUser } from 'src/shared/current-user.decorator';
import { Response } from 'src/shared/response';
import { User } from 'src/user/schemas/user.schema';

import { DonorSearchQueryDto } from '../dtos/matching.dto';
import { MatchingService } from '../services/matching.service';

@ApiTags('Matching')
@Controller('matching')
export class MatchingController {
  constructor(
    private readonly matchingService: MatchingService,
    private readonly bloodRequestService: BloodRequestService,
    private readonly events: EventEmitter2,
  ) {}

  @Post('blood-requests/:id')
  @UseGuards(JwtGuard)
  @Throttle({ default: { limit: 60, ttl: 86400000 } })
  async matchForRequest(
    @CurrentUser() user: User,
    @Param('id') bloodRequestId: string,
  ) {
    const br = await this.bloodRequestService.getById(bloodRequestId);
    if (br.requesterId !== user.id) {
      throw new ForbiddenException();
    }
    const matches = await this.matchingService.matchForBloodRequest(br);
    const top = matches[0];
    this.events.emit('matching.completed', {
      requesterId: user.id,
      bloodRequestId: br.id,
      topDonorUserId: top?.donorProfile.userId,
    });
    return Response.json('OK', matches);
  }

  @Get('search')
  @UseGuards(JwtGuard)
  async search(@Query() query: DonorSearchQueryDto) {
    const matches = await this.matchingService.searchDonors({
      neededBloodType: query.neededBloodType,
      lng: query.lng,
      lat: query.lat,
      limit: query.limit,
    });
    return Response.json('OK', matches);
  }
}
