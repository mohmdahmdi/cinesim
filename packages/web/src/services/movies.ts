import instance from "@/lib/AxiosConfig";

export type MovieSearchResult = {
  tmdbId: number;
  title: string;
  originalTitle: string;
  year: string | null;
  posterPath: string | null;
  originalLanguage: string;
  cached: boolean;
};

export type Genre = { tmdbId: number; name: string };

export type Movie = {
  tmdbId: number;
  imdbId: string | null;
  title: string;
  originalTitle: string;
  releaseDate: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  overview: string | null;
  runtime: number | null;
  originalLanguage: string;
  countries: string[];
  tmdbVoteAverage: number | null;
  genres: Genre[];
  credits: {
    person: { tmdbId: number; name: string; profilePath: string | null };
    role: "director" | "cast";
    character: string | null;
    order: number | null;
  }[];
};

export type SimilarityListItem = {
  similarityId: string;
  movie: Movie;
  agreeCount: number;
  disagreeCount: number;
  score: number;
  label: string;
  myVote: "agree" | "disagree" | null;
  isMine: boolean;
};

export async function searchMovies(query: string): Promise<MovieSearchResult[]> {
  const { data } = await instance.get("/movies/search", { params: { q: query } });
  return data;
}

export async function getDiscoverMovies(): Promise<Movie[]> {
  const { data } = await instance.get("/movies/discover");
  return data;
}

export async function getMovieDetail(
  tmdbId: number
): Promise<{ movie: Movie; similar: SimilarityListItem[]; suggestionCandidates: Movie[] }> {
  const { data } = await instance.get(`/movies/${tmdbId}`);
  return data;
}

export async function getSimilarMovies(tmdbId: number): Promise<SimilarityListItem[]> {
  const { data } = await instance.get(`/movies/${tmdbId}/similar`);
  return data;
}

export async function suggestSimilar(
  tmdbId: number,
  similarToTmdbId: number,
  reasons?: import("./similarities").SimilarityReason[]
) {
  const { data } = await instance.post(`/movies/${tmdbId}/similar`, { similarToTmdbId, reasons });
  return data;
}

export type BulkSuggestResult = {
  similarToTmdbId: number;
  ok: boolean;
  error?: string;
};

export async function suggestSimilarBulk(
  tmdbId: number,
  items: { similarToTmdbId: number; reasons?: import("./similarities").SimilarityReason[] }[]
): Promise<BulkSuggestResult[]> {
  const { data } = await instance.post(`/movies/${tmdbId}/similar/bulk`, { items });
  return data;
}
