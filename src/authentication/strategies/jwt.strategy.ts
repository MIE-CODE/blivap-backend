import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { compare } from 'bcryptjs';
import { ExtractJwt, Strategy } from 'passport-jwt';

import config from 'src/shared/config';
import { UserService } from 'src/user/services/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly userService: UserService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config().jwt.secret,
    });
  }

  async validate({ id, payloadId = '' }) {
    const [user] = await this.userService.find({ _id: id });

    if (user) {
      const isValid = await compare(
        `${user.email}${user?.password}`,
        payloadId,
      );
      if (isValid) {
        return user;
      }
    }

    return null;
  }
}
