import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import { Movie } from '../movies/entities/movie.entity';
import { Genre } from '../movies/entities/genre.entity';
import { Person } from '../movies/entities/person.entity';
import { CreditRole, MovieCredit } from '../movies/entities/movie-credit.entity';
import { TmdbClient } from './tmdb.client';
import { TmdbMovieDetails, TmdbMovieSummary } from './tmdb.types';

const MAX_CAST_MEMBERS = 10;

export interface MovieSearchResult {
  tmdbId: number;
  title: string;
  originalTitle: string;
  year: string | null;
  posterPath: string | null;
  originalLanguage: string;
  cached: boolean;
}

/**
 * Owns Movie/Genre/Person/MovieCredit persistence and is the single place
 * that talks to TMDB to populate them. Movies and Similarities both sit on
 * top of this instead of duplicating "have we imported this yet?" logic.
 */
@Injectable()
export class MovieCacheService {
  constructor(
    @InjectRepository(Movie) private readonly movieRepo: Repository<Movie>,
    @InjectRepository(Genre) private readonly genreRepo: Repository<Genre>,
    @InjectRepository(Person) private readonly personRepo: Repository<Person>,
    @InjectRepository(MovieCredit) private readonly creditRepo: Repository<MovieCredit>,
    private readonly tmdb: TmdbClient,
  ) {}

  /** Returns the cached movie, importing it from TMDB on first request. */
  async getOrImport(tmdbId: number): Promise<Movie> {
    const existing = await this.movieRepo.findOne({
      where: { tmdbId },
      relations: { genres: true, credits: { person: true } },
    });
    if (existing) return existing;

    const details = await this.tmdb.getMovieDetails(tmdbId);
    await this.upsertFromTmdb(details);

    const imported = await this.movieRepo.findOneOrFail({
      where: { tmdbId },
      relations: { genres: true, credits: { person: true } },
    });
    return imported;
  }

  async upsertFromTmdb(details: TmdbMovieDetails): Promise<void> {
    const genres = await this.upsertGenres(details.genres);

    await this.movieRepo.save({
      tmdbId: details.id,
      imdbId: details.imdb_id,
      title: details.title,
      originalTitle: details.original_title,
      releaseDate: details.release_date || null,
      posterPath: details.poster_path,
      backdropPath: details.backdrop_path,
      overview: details.overview,
      runtime: details.runtime,
      originalLanguage: details.original_language,
      countries: details.production_countries?.map((c) => c.iso_3166_1) ?? [],
      tmdbPopularity: details.popularity,
      tmdbVoteAverage: details.vote_average,
      tmdbVoteCount: details.vote_count,
      genres,
    });

    if (details.credits) {
      await this.upsertCredits(details.id, details.credits);
    }
  }

  /** Local ILIKE search; TMDB is only consulted when local results run thin. */
  async search(query: string, limit = 20): Promise<MovieSearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const local = await this.movieRepo.find({
      where: [{ title: ILike(`%${trimmed}%`) }, { originalTitle: ILike(`%${trimmed}%`) }],
      order: { tmdbPopularity: 'DESC' },
      take: limit,
    });

    const localResults = local.map((m) => this.toSearchResult(m));
    if (localResults.length >= 5) return localResults;

    try {
      const remote = await this.tmdb.searchMovies(trimmed);
      const knownIds = new Set(localResults.map((r) => r.tmdbId));
      const remoteResults = remote.results
        .filter((r) => !knownIds.has(r.id))
        .slice(0, limit - localResults.length)
        .map((r) => this.summaryToSearchResult(r));

      return [...localResults, ...remoteResults];
    } catch {
      // TMDB unreachable/slow — degrade to whatever we already have locally
      // rather than failing the whole search.
      return localResults;
    }
  }

  private toSearchResult(movie: Movie): MovieSearchResult {
    return {
      tmdbId: movie.tmdbId,
      title: movie.title,
      originalTitle: movie.originalTitle,
      year: movie.releaseDate ? movie.releaseDate.slice(0, 4) : null,
      posterPath: movie.posterPath,
      originalLanguage: movie.originalLanguage,
      cached: true,
    };
  }

  private summaryToSearchResult(summary: TmdbMovieSummary): MovieSearchResult {
    return {
      tmdbId: summary.id,
      title: summary.title,
      originalTitle: summary.original_title,
      year: summary.release_date ? summary.release_date.slice(0, 4) : null,
      posterPath: summary.poster_path,
      originalLanguage: summary.original_language,
      cached: false,
    };
  }

  private async upsertGenres(genres: { id: number; name: string }[]): Promise<Genre[]> {
    if (genres.length === 0) return [];

    const existing = await this.genreRepo.find({ where: { tmdbId: In(genres.map((g) => g.id)) } });
    const existingIds = new Set(existing.map((g) => g.tmdbId));
    const missing = genres.filter((g) => !existingIds.has(g.id));

    if (missing.length > 0) {
      await this.genreRepo.save(missing.map((g) => ({ tmdbId: g.id, name: g.name })));
    }

    return genres.map((g) => ({ tmdbId: g.id, name: g.name }) as Genre);
  }

  private async upsertCredits(
    movieId: number,
    credits: NonNullable<TmdbMovieDetails['credits']>,
  ): Promise<void> {
    const directors = credits.crew.filter((c) => c.job === 'Director');
    const cast = credits.cast.slice(0, MAX_CAST_MEMBERS);

    const people = [
      ...directors.map((d) => ({ tmdbId: d.id, name: d.name, profilePath: d.profile_path })),
      ...cast.map((c) => ({ tmdbId: c.id, name: c.name, profilePath: c.profile_path })),
    ];
    if (people.length > 0) {
      await this.personRepo.upsert(people, ['tmdbId']);
    }

    await this.creditRepo.delete({ movieId });
    const rows = [
      ...directors.map((d) => ({
        movieId,
        personId: d.id,
        role: CreditRole.DIRECTOR,
        character: null,
        order: null,
      })),
      ...cast.map((c) => ({
        movieId,
        personId: c.id,
        role: CreditRole.CAST,
        character: c.character,
        order: c.order,
      })),
    ];
    if (rows.length > 0) {
      await this.creditRepo.save(rows);
    }
  }
}
