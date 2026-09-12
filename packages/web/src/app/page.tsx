"use client";

import { useQuery } from "@tanstack/react-query";
import { getDiscoverMovies } from "@/services/movies";
import MovieCard from "@/components/MovieCard";

export default function Home() {
  const { data: movies = [], isLoading } = useQuery({
    queryKey: ["discover"],
    queryFn: getDiscoverMovies,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <section className="mb-10">
        <h1 className="font-display text-3xl font-semibold text-foreground sm:text-4xl">
          Movies, mapped by the people who watch them.
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Every &quot;similar movie&quot; here was suggested and voted on by real people — not an
          algorithm.
          Pick a film below and start exploring the map.
        </p>
      </section>

      <section>
        <h2 className="mb-4 font-display text-lg text-foreground">Explore the map of cinema</h2>
        {isLoading ? (
          <p className="text-muted">Loading movies…</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {movies.map((movie) => (
              <MovieCard key={movie.tmdbId} movie={movie} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
