import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { JwtGuard } from 'src/authentication/guards/jwt.guard';
import {
  QuestionnaireKeys,
  type IQuestionnaireAnswers,
} from 'src/donor/constants/questionnaire';
import { CurrentUser } from 'src/shared/current-user.decorator';
import { Response } from 'src/shared/response';
import { User } from 'src/user/schemas/user.schema';

import {
  GeoPointDto,
  RegisterDonorDto,
  SubmitQuestionnaireDto,
} from '../dtos/donor.dto';
import { DonorService } from '../services/donor.service';

import type { Request } from 'express';

@ApiTags('Donors')
@Controller('donors')
export class DonorController {
  constructor(private readonly donorService: DonorService) {}

  @Post('register')
  @UseGuards(JwtGuard)
  async register(@CurrentUser() user: User, @Body() body: RegisterDonorDto) {
    const profile = await this.donorService.createOrUpdateRegistration(user, {
      bloodType: body.bloodType,
      location: body.location,
    });
    return Response.json('Donor registration saved', profile);
  }

  @Post('questionnaire')
  @UseGuards(JwtGuard)
  async questionnaire(
    @CurrentUser() user: User,
    @Body() body: SubmitQuestionnaireDto,
  ) {
    const answers: IQuestionnaireAnswers = {
      gender: body.gender,
      age18to64: body.age18to64,
      weightUnder50kg: body.weightUnder50kg,
      organOrTissueTransplant: body.organOrTissueTransplant,
      injectedDrugsOrDoping: body.injectedDrugsOrDoping,
      diabetes: body.diabetes,
      bloodProductsOrTransfusion: body.bloodProductsOrTransfusion,
      chronicOrSeriousCondition: body.chronicOrSeriousCondition,
      hepatitisBVaccineLast2Weeks: body.hepatitisBVaccineLast2Weeks,
    };
    const profile = await this.donorService.submitQuestionnaire(user, answers);
    return Response.json('Questionnaire submitted', {
      eligibilityStatus: profile.eligibilityStatus,
      ineligibilityReasons: profile.ineligibilityReasons,
      questionnaireVersion: profile.questionnaire?.version,
      keysAnswered: Object.values(QuestionnaireKeys),
    });
  }

  @Patch('location')
  @UseGuards(JwtGuard)
  @Throttle({ default: { limit: 30, ttl: 3600000 } })
  async updateLocation(
    @CurrentUser() user: User,
    @Body() body: GeoPointDto,
    @Req() req: Request,
  ) {
    const profile = await this.donorService.updateLocation(
      user,
      body as GeoPointDto,
      req.ip,
    );
    return Response.json('Location updated', profile);
  }

  @Get('me')
  @UseGuards(JwtGuard)
  async me(@CurrentUser() user: User) {
    const profile = await this.donorService.getProfileByUserId(user.id);
    if (!profile) {
      throw new NotFoundException('No donor profile');
    }
    return Response.json('OK', profile);
  }

  @Get('public/:userId')
  @UseGuards(JwtGuard)
  async publicProfile(@Param('userId') userId: string) {
    const profile = await this.donorService.getProfileByUserId(userId);
    if (!profile) {
      throw new NotFoundException('Donor not found');
    }
    return Response.json('OK', this.donorService.getPublicProfileView(profile));
  }
}
