import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MoviesService } from './movies.service';
import { SuggestSimilarityDto } from '../similarities/dto/suggest-similarity.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../shared/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { JwtPayload } from '../../shared/types/types';

@ApiTags('Movies')
@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Get('search')
  search(@Query('q') query = '') {
    return this.moviesService.search(query);
  }

  @Get('discover')
  discover() {
    return this.moviesService.discover();
  }

  @Get(':tmdbId')
  getDetail(@Param('tmdbId', ParseIntPipe) tmdbId: number) {
    return this.moviesService.getDetail(tmdbId);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':tmdbId/similar')
  getSimilar(@Param('tmdbId', ParseIntPipe) tmdbId: number, @CurrentUser() user?: JwtPayload) {
    return this.moviesService.getSimilar(tmdbId, user?.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':tmdbId/similar')
  suggestSimilar(
    @Param('tmdbId', ParseIntPipe) tmdbId: number,
    @Body() dto: SuggestSimilarityDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.moviesService.suggestSimilar(tmdbId, dto.similarToTmdbId, user.sub);
  }
}
