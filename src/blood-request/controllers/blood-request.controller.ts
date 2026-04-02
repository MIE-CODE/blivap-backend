import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { JwtGuard } from 'src/authentication/guards/jwt.guard';
import { CurrentUser } from 'src/shared/current-user.decorator';
import { Response } from 'src/shared/response';
import { User } from 'src/user/schemas/user.schema';

import { CreateBloodRequestDto } from '../dtos/blood-request.dto';
import { BloodRequestService } from '../services/blood-request.service';

@ApiTags('Blood requests')
@Controller('blood-requests')
export class BloodRequestController {
  constructor(private readonly bloodRequestService: BloodRequestService) {}

  @Post()
  @UseGuards(JwtGuard)
  @Throttle({ default: { limit: 30, ttl: 86400000 } })
  async create(@CurrentUser() user: User, @Body() body: CreateBloodRequestDto) {
    const doc = await this.bloodRequestService.create(user.id, {
      neededBloodType: body.neededBloodType,
      location: body.location,
      urgent: body.urgent,
      notes: body.notes,
    });
    return Response.json('Created', doc);
  }

  @Get('mine')
  @UseGuards(JwtGuard)
  async mine(@CurrentUser() user: User) {
    const rows = await this.bloodRequestService.listForRequester(user.id);
    return Response.json('OK', rows);
  }
}
