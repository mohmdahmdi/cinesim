"use client";

import { useQuery } from "@tanstack/react-query";
import { getDiscoverMovies } from "@/services/movies";
import MovieCard from "@/components/MovieCard";
import MovieGraphHero from "@/components/MovieGraphHero";

export default function Home() {
  const { data: movies = [], isLoading } = useQuery({
    queryKey: ["discover"],
    queryFn: getDiscoverMovies,
  });

  return (
    <div>
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(139,92,246,0.16),transparent_55%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-4 px-4 py-8 sm:px-6 md:grid-cols-[1.1fr_1fr] md:gap-8 md:py-10">
          <div>
            <h1 className="font-display text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
              Movies, mapped by the people who watch them.
            </h1>
            <p className="mt-3 max-w-md text-sm text-muted sm:text-base">
              Every &quot;similar movie&quot; here was suggested and voted on by real people —
              not an algorithm. Pick a film below and start exploring the map.
            </p>
          </div>
          <div className="h-36 sm:h-44 md:h-52">
            <MovieGraphHero movies={movies} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
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
