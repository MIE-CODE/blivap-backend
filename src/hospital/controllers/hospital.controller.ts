import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { JwtGuard } from 'src/authentication/guards/jwt.guard';
import { UserRole } from 'src/shared/domain/enums';
import { Roles } from 'src/shared/guards/roles.decorator';
import { RolesGuard } from 'src/shared/guards/roles.guard';
import { Response } from 'src/shared/response';

import { CreateHospitalDto } from '../dtos/hospital.dto';
import { HospitalService } from '../services/hospital.service';

@ApiTags('Hospitals')
@Controller('hospitals')
export class HospitalController {
  constructor(private readonly hospitalService: HospitalService) {}

  @Get()
  @UseGuards(JwtGuard)
  async list() {
    const rows = await this.hospitalService.list();
    return Response.json('OK', rows);
  }

  @Post()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.Admin)
  async create(@Body() body: CreateHospitalDto) {
    const h = await this.hospitalService.create(body);
    return Response.json('Created', h);
  }
}
