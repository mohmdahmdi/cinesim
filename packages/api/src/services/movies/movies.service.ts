import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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

  async getDetail(tmdbId: number, currentUserId?: string) {
    const movie = await this.movieCache.getOrImport(tmdbId);
    const [similar, suggestionCandidates] = await Promise.all([
      this.similaritiesService.listForMovie(tmdbId, currentUserId),
      this.getSuggestionCandidates(tmdbId),
    ]);
    return { movie, similar, suggestionCandidates };
  }

  /** Movies to surface under "suggest a similar movie", drawn from the
   * community graph itself (friend-of-a-friend) rather than typed search. */
  private async getSuggestionCandidates(tmdbId: number, limit = 8): Promise<Movie[]> {
    const ids = await this.similaritiesService.suggestionCandidateIds(tmdbId, limit);
    if (ids.length === 0) return [];

    const movies = await this.movieRepo.find({ where: { tmdbId: In(ids) } });
    const byId = new Map(movies.map((m) => [m.tmdbId, m]));
    return ids.map((id) => byId.get(id)).filter((m): m is Movie => !!m);
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
