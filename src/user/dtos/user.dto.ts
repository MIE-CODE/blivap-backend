import { PartialType } from '@nestjs/swagger';

import { User } from '../schemas/user.schema';

export class VerifyUserDto extends PartialType(User) {}
