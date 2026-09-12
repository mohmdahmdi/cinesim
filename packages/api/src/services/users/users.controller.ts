import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { JwtPayload } from '../../shared/types/types';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: JwtPayload) {
    return this.usersService.getPublicProfile(user.username);
  }

  @Get('leaderboard')
  leaderboard() {
    return this.usersService.leaderboard();
  }

  @Get(':username')
  byUsername(@Param('username') username: string) {
    return this.usersService.getPublicProfile(username);
  }
}
