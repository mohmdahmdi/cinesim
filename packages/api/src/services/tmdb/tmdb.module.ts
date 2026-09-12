import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Movie } from '../movies/entities/movie.entity';
import { Genre } from '../movies/entities/genre.entity';
import { Person } from '../movies/entities/person.entity';
import { MovieCredit } from '../movies/entities/movie-credit.entity';
import { TmdbClient } from './tmdb.client';
import { MovieCacheService } from './movie-cache.service';

@Module({
  imports: [
    HttpModule.register({ timeout: 30000 }),
    TypeOrmModule.forFeature([Movie, Genre, Person, MovieCredit]),
  ],
  providers: [TmdbClient, MovieCacheService],
  exports: [TmdbClient, MovieCacheService],
})
export class TmdbModule {}
