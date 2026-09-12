import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { TmdbMovieDetails, TmdbMovieSummary, TmdbPaginatedResponse } from './tmdb.types';

const BASE_URL = 'https://api.themoviedb.org/3';

@Injectable()
export class TmdbClient {
  private readonly authHeader: string;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.authHeader = `Bearer ${config.get<string>('TMDB_READ_ACCESS_TOKEN')}`;
  }

  private async get<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
    const { data } = await firstValueFrom(
      this.http.get<T>(`${BASE_URL}${path}`, {
        headers: { Authorization: this.authHeader },
        params: { language: 'en-US', include_adult: 'false', ...params },
      }),
    );
    return data;
  }

  searchMovies(query: string, page = 1) {
    return this.get<TmdbPaginatedResponse<TmdbMovieSummary>>('/search/movie', { query, page });
  }

  getMovieDetails(tmdbId: number) {
    return this.get<TmdbMovieDetails>(`/movie/${tmdbId}`, { append_to_response: 'credits' });
  }

  getPopular(page = 1) {
    return this.get<TmdbPaginatedResponse<TmdbMovieSummary>>('/movie/popular', { page });
  }

  getTopRated(page = 1) {
    return this.get<TmdbPaginatedResponse<TmdbMovieSummary>>('/movie/top_rated', { page });
  }

  discoverByLanguage(originalLanguage: string, page = 1) {
    return this.get<TmdbPaginatedResponse<TmdbMovieSummary>>('/discover/movie', {
      with_original_language: originalLanguage,
      sort_by: 'popularity.desc',
      page,
    });
  }
}
