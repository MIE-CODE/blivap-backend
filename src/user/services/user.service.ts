import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'src/database/schemas';
import { DB_TABLE_NAMES } from 'src/shared/constants';

import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectModel(DB_TABLE_NAMES.users)
    private readonly users: Model<UserDocument>,
  ) {}

  async find(query: Partial<User>, select?: string[]): Promise<User[]> {
    const q = this.users.find(query);

    if (select) {
      q.select(select);
    }

    return q;
  }

  async updateOne(
    query: Partial<User>,
    set?: Partial<User>,
    unset?: { [x in keyof User]?: boolean },
  ): Promise<void> {
    if (set || unset) {
      await this.users.updateOne(query, {
        ...(set && { $set: set }),
        ...(unset && { $unset: unset }),
      });
    }
  }

  async createOne(payload: User): Promise<User> {
    return this.users.create(payload);
  }

  async findUserByResetToken(resetToken: string): Promise<User | null> {
    return this.users.findOne({
      passwordResetCode: resetToken,
      passwordResetCodeExpiresAt: { $gt: new Date() },
    });
  }
}
