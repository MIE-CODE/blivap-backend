import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { DB_TABLE_NAMES } from 'src/shared/constants';

import { AuditLogSchema } from './schemas/audit-log.schema';
import { AuditService } from './services/audit.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DB_TABLE_NAMES.auditLogs, schema: AuditLogSchema },
    ]),
  ],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
