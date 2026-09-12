import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SimilaritiesService } from './similarities.service';
import { VoteDto } from './dto/vote.dto';
import { SetReasonsDto } from './dto/set-reasons.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../shared/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { JwtPayload } from '../../shared/types/types';

@ApiTags('Similarities')
@Controller()
export class SimilaritiesController {
  constructor(private readonly similaritiesService: SimilaritiesService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get('similarities/compare')
  compare(
    @Query('a', ParseIntPipe) a: number,
    @Query('b', ParseIntPipe) b: number,
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.similaritiesService.compare(a, b, user?.sub);
  }

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

  @UseGuards(OptionalJwtAuthGuard)
  @Get('similarities/:id/reasons')
  getReasons(@Param('id') id: string, @CurrentUser() user?: JwtPayload) {
    return this.similaritiesService.getReasonsBreakdown([id], user?.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Put('similarities/:id/reasons')
  setReasons(@Param('id') id: string, @Body() dto: SetReasonsDto, @CurrentUser() user: JwtPayload) {
    return this.similaritiesService.setReasons(id, user.sub, dto.reasons);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('similarities/:id/comments')
  listComments(@Param('id') id: string, @CurrentUser() user?: JwtPayload) {
    return this.similaritiesService.listComments(id, user?.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('similarities/:id/comments')
  addComment(
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.similaritiesService.addComment(id, user.sub, dto.body, dto.parentCommentId ?? null);
  }

  @UseGuards(JwtAuthGuard)
  @Post('comments/:id/vote')
  voteComment(@Param('id') id: string, @Body() dto: VoteDto, @CurrentUser() user: JwtPayload) {
    return this.similaritiesService.voteComment(id, user.sub, dto.vote);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('comments/:id/vote')
  retractCommentVote(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.similaritiesService.retractCommentVote(id, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('comments/:id')
  removeComment(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.similaritiesService.removeComment(id, user.sub);
  }

  @Get('similarities/by-user/:username')
  byUser(@Param('username') username: string) {
    return this.similaritiesService.listByUsername(username);
  }
}
