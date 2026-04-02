import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { JwtGuard } from 'src/authentication/guards/jwt.guard';
import { CurrentUser } from 'src/shared/current-user.decorator';
import { UserRole } from 'src/shared/domain/enums';
import { Roles } from 'src/shared/guards/roles.decorator';
import { RolesGuard } from 'src/shared/guards/roles.guard';
import { Response } from 'src/shared/response';
import { User } from 'src/user/schemas/user.schema';

import { CreateBookingDto, RespondBookingDto } from '../dtos/booking.dto';
import { BookingService } from '../services/booking.service';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @UseGuards(JwtGuard)
  @Throttle({ default: { limit: 40, ttl: 86400000 } })
  async create(@CurrentUser() user: User, @Body() body: CreateBookingDto) {
    const scheduledAt = new Date(body.scheduledAt);
    const doc = await this.bookingService.create({
      requesterId: user.id,
      donorUserId: body.donorUserId,
      hospitalId: body.hospitalId,
      scheduledAt,
      bloodRequestId: body.bloodRequestId ?? null,
    });
    return Response.json('Created', doc);
  }

  @Patch(':id/respond')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.Donor)
  async respond(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: RespondBookingDto,
  ) {
    const doc = await this.bookingService.respondAsDonor(
      user.id,
      id,
      body.accept,
    );
    return Response.json('Updated', doc);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtGuard)
  async cancel(@CurrentUser() user: User, @Param('id') id: string) {
    const doc = await this.bookingService.cancelAsRequester(user.id, id);
    return Response.json('Cancelled', doc);
  }

  @Get('mine')
  @UseGuards(JwtGuard)
  async mine(@CurrentUser() user: User) {
    const rows = await this.bookingService.listForUser(user.id);
    return Response.json('OK', rows);
  }
}
