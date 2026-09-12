import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtPayload } from '../types/types';

/**
 * Same as JwtAuthGuard but never rejects the request — an absent or
 * invalid token just means `req.user` stays undefined. Used on public
 * read endpoints that personalize their response when the caller happens
 * to be logged in (e.g. showing the viewer's own vote on a similarity).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = JwtPayload>(_err: unknown, user: TUser): TUser {
    return user;
  }
}
