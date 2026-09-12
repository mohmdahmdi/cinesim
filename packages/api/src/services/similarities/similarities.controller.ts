import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SimilaritiesService } from './similarities.service';
import { VoteDto } from './dto/vote.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { JwtPayload } from '../../shared/types/types';

@ApiTags('Similarities')
@Controller()
export class SimilaritiesController {
  constructor(private readonly similaritiesService: SimilaritiesService) {}

  @UseGuards(JwtAuthGuard)
  @Post('similarities/:id/vote')
  vote(@Param('id') id: string, @Body() dto: VoteDto, @CurrentUser() user: JwtPayload) {
    return this.similaritiesService.vote(id, user.sub, dto.vote);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('similarities/:id/vote')
  retractVote(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.similaritiesService.retractVote(id, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('similarities/:id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.similaritiesService.remove(id, user.sub);
  }

  @Get('similarities/by-user/:username')
  byUser(@Param('username') username: string) {
    return this.similaritiesService.listByUsername(username);
  }
}
