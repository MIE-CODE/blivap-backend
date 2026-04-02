import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'src/database/schemas';
import { DB_TABLE_NAMES } from 'src/shared/constants';
import { AuditAction } from 'src/shared/domain/enums';

import { AuditLogDocument } from '../schemas/audit-log.schema';

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(DB_TABLE_NAMES.auditLogs)
    private readonly auditLogs: Model<AuditLogDocument>,
  ) {}

  async log(
    action: AuditAction,
    resourceType: string,
    opts: {
      actorId?: string | null;
      resourceId?: string | null;
      metadata?: Record<string, unknown>;
      ip?: string | null;
    } = {},
  ): Promise<void> {
    await this.auditLogs.create({
      action,
      resourceType,
      actorId: opts.actorId ?? null,
      resourceId: opts.resourceId ?? null,
      metadata: opts.metadata ?? {},
      ip: opts.ip ?? null,
    });
  }
}
