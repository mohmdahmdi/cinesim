import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Movie } from './entities/movie.entity';
import { MovieCacheService } from '../tmdb/movie-cache.service';
import { SimilaritiesService } from '../similarities/similarities.service';

const DISCOVER_LANGUAGES = ['en', 'fr', 'ja', 'ko', 'hi', 'es', 'it', 'de', 'zh', 'fa', 'ru', 'pt'];

@Injectable()
export class MoviesService {
  constructor(
    @InjectRepository(Movie) private readonly movieRepo: Repository<Movie>,
    private readonly movieCache: MovieCacheService,
    private readonly similaritiesService: SimilaritiesService,
  ) {}

  search(query: string) {
    return this.movieCache.search(query);
  }

  async getDetail(tmdbId: number) {
    const movie = await this.movieCache.getOrImport(tmdbId);
    const similar = await this.similaritiesService.listForMovie(tmdbId);
    return { movie, similar };
  }

  getSimilar(tmdbId: number, currentUserId?: string) {
    return this.similaritiesService.listForMovie(tmdbId, currentUserId);
  }

  suggestSimilar(tmdbId: number, similarToTmdbId: number, userId: string) {
    return this.similaritiesService.suggest(tmdbId, similarToTmdbId, userId);
  }

  /**
   * Homepage "map of cinema" grid: a popularity-led sample that always mixes
   * in movies from several original languages, so the front page never
   * reads as Hollywood-only even before the community has voted much.
   */
  async discover(perLanguage = 4): Promise<Movie[]> {
    const buckets = await Promise.all(
      DISCOVER_LANGUAGES.map((lang) =>
        this.movieRepo.find({
          where: { originalLanguage: lang },
          order: { tmdbPopularity: 'DESC' },
          take: perLanguage,
        }),
      ),
    );

    const movies = buckets.flat();
    for (let i = movies.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [movies[i], movies[j]] = [movies[j], movies[i]];
    }
    return movies;
  }
}
