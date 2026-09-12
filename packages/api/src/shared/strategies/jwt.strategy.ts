import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../types/types';
import { UsersService } from '../../services/users/users.service';
import { UserStatus } from '../../services/users/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'supersecretkey',
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // The token itself can outlive the account it names (deleted/banned
    // users, or — during development — a DB reset). Re-check against the
    // DB rather than trusting the token's claims blindly.
    const user = await this.usersService.findById(payload.sub);
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Session is no longer valid. Please log in again.');
    }
    return { sub: user.id, username: user.username, role: user.role };
  }
}
