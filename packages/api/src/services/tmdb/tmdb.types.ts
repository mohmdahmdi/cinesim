export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbCastMember {
  id: number;
  name: string;
  character: string;
  order: number;
  profile_path: string | null;
  known_for_department: string;
}

export interface TmdbCrewMember {
  id: number;
  name: string;
  job: string;
  profile_path: string | null;
}

export interface TmdbMovieSummary {
  id: number;
  title: string;
  original_title: string;
  release_date: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string | null;
  original_language: string;
  popularity: number;
  vote_average: number;
  vote_count: number;
}

export interface TmdbMovieDetails extends TmdbMovieSummary {
  imdb_id: string | null;
  runtime: number | null;
  genres: TmdbGenre[];
  production_countries: { iso_3166_1: string; name: string }[];
  credits?: {
    cast: TmdbCastMember[];
    crew: TmdbCrewMember[];
  };
}

export interface TmdbPaginatedResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}
