import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Movie } from './entities/movie.entity';
import { MoviesService } from './movies.service';
import { MoviesController } from './movies.controller';
import { TmdbModule } from '../tmdb/tmdb.module';
import { SimilaritiesModule } from '../similarities/similarities.module';

@Module({
  imports: [TypeOrmModule.forFeature([Movie]), TmdbModule, SimilaritiesModule],
  controllers: [MoviesController],
  providers: [MoviesService],
})
export class MoviesModule {}
