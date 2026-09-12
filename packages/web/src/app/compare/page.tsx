"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getMovieDetail, Movie, MovieSearchResult } from "@/services/movies";
import { compareMovies, REASON_LABELS } from "@/services/similarities";
import { posterUrl } from "@/utils/tmdbImage";
import MovieSearchAutocomplete from "@/components/MovieSearchAutocomplete";

function MovieSlot({
  label,
  movie,
  onSelect,
  onClear,
}: {
  label: string;
  movie: MovieSearchResult | null;
  onSelect: (movie: MovieSearchResult) => void;
  onClear: () => void;
}) {
  if (!movie) {
    return (
      <div>
        <p className="mb-1 text-xs text-muted">{label}</p>
        <MovieSearchAutocomplete placeholder={`Search for ${label.toLowerCase()}…`} onSelect={onSelect} />
      </div>
    );
  }

  const poster = posterUrl(movie.posterPath, "w185");
  return (
    <div>
      <p className="mb-1 text-xs text-muted">{label}</p>
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-2">
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt={movie.title} className="h-16 w-11 rounded object-cover" />
        ) : (
          <div className="h-16 w-11 rounded bg-surface-hover" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-foreground">{movie.title}</p>
          <p className="text-xs text-muted">{movie.year ?? "—"}</p>
        </div>
        <button type="button" onClick={onClear} className="px-2 text-muted hover:text-foreground">
          ×
        </button>
      </div>
    </div>
  );
}

function RelationshipSummary({
  labelA,
  labelB,
  edge,
}: {
  labelA: string;
  labelB: string;
  edge: { label: string; agreeCount: number; disagreeCount: number } | null;
}) {
  const total = edge ? edge.agreeCount + edge.disagreeCount : 0;
  const agreePct = edge && total > 0 ? Math.round((edge.agreeCount / total) * 100) : null;

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-sm text-foreground">
        {labelA} <span className="text-muted">~</span> {labelB}
      </p>
      {edge ? (
        <p className="mt-1 text-xs text-muted">
          {edge.label}
          {agreePct !== null && ` · ${agreePct}% agree · ${total} vote${total === 1 ? "" : "s"}`}
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted">
          No one has suggested this pairing yet — visit either movie&apos;s page to be the first.
        </p>
      )}
    </div>
  );
}

function toSearchResult(movie: Movie): MovieSearchResult {
  return {
    tmdbId: movie.tmdbId,
    title: movie.title,
    originalTitle: movie.originalTitle,
    year: movie.releaseDate?.slice(0, 4) ?? null,
    posterPath: movie.posterPath,
    originalLanguage: movie.originalLanguage,
    cached: true,
  };
}

function ComparePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const aId = searchParams.get("a");
  const bId = searchParams.get("b");

  // User picks via search override the URL-hydrated movie for this render.
  const [pickedA, setPickedA] = useState<MovieSearchResult | null | undefined>(undefined);
  const [pickedB, setPickedB] = useState<MovieSearchResult | null | undefined>(undefined);

  const { data: hydratedA } = useQuery({
    queryKey: ["movie-summary", aId],
    queryFn: () => getMovieDetail(Number(aId)),
    enabled: !!aId && pickedA === undefined,
  });
  const { data: hydratedB } = useQuery({
    queryKey: ["movie-summary", bId],
    queryFn: () => getMovieDetail(Number(bId)),
    enabled: !!bId && pickedB === undefined,
  });

  const movieA = pickedA !== undefined ? pickedA : hydratedA ? toSearchResult(hydratedA.movie) : null;
  const movieB = pickedB !== undefined ? pickedB : hydratedB ? toSearchResult(hydratedB.movie) : null;

  const updateQuery = (a: number | null, b: number | null) => {
    const params = new URLSearchParams();
    if (a) params.set("a", String(a));
    if (b) params.set("b", String(b));
    router.push(`/compare${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const { data: comparison, isLoading } = useQuery({
    queryKey: ["compare", movieA?.tmdbId, movieB?.tmdbId],
    queryFn: () => compareMovies(movieA!.tmdbId, movieB!.tmdbId),
    enabled: !!movieA && !!movieB,
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-2xl text-foreground">Compare two movies</h1>
      <p className="mt-1 text-sm text-muted">
        See what the community says about the relationship between any two films.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <MovieSlot
          label="Movie A"
          movie={movieA}
          onSelect={(m) => {
            setPickedA(m);
            updateQuery(m.tmdbId, movieB?.tmdbId ?? null);
          }}
          onClear={() => {
            setPickedA(null);
            updateQuery(null, movieB?.tmdbId ?? null);
          }}
        />
        <MovieSlot
          label="Movie B"
          movie={movieB}
          onSelect={(m) => {
            setPickedB(m);
            updateQuery(movieA?.tmdbId ?? null, m.tmdbId);
          }}
          onClear={() => {
            setPickedB(null);
            updateQuery(movieA?.tmdbId ?? null, null);
          }}
        />
      </div>

      {movieA && movieB && (
        <div className="mt-8">
          {isLoading && <p className="text-sm text-muted">Loading comparison…</p>}

          {comparison && (
            <>
              <RelationshipSummary labelA={movieA.title} labelB={movieB.title} edge={comparison.edge} />

              <div className="mt-6">
                <h2 className="mb-2 font-display text-base text-foreground">
                  Why the community connects these two
                </h2>
                {comparison.reasons.breakdown.length === 0 ? (
                  <p className="text-sm text-muted">No one has shared their reasons yet.</p>
                ) : (
                  <>
                    <p className="mb-2 text-xs text-muted">
                      Based on {comparison.reasons.respondents}{" "}
                      {comparison.reasons.respondents === 1 ? "person" : "people"} who shared their
                      reasons
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {comparison.reasons.breakdown.map((item) => (
                        <div key={item.reason} className="flex items-center gap-2 text-xs">
                          <span className="w-36 shrink-0 text-foreground">
                            {REASON_LABELS[item.reason]}
                          </span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-hover">
                            <div
                              className="h-full rounded-full bg-accent"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                          <span className="w-9 shrink-0 text-right text-muted">
                            {item.percentage}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <p className="mt-6 text-xs text-muted">
                Want to vote or discuss? Head to{" "}
                <Link href={`/movies/${movieA.tmdbId}`} className="text-accent hover:underline">
                  {movieA.title}
                </Link>{" "}
                or{" "}
                <Link href={`/movies/${movieB.tmdbId}`} className="text-accent hover:underline">
                  {movieB.title}
                </Link>
                &apos;s page — voting happens there, not on this comparison view.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-muted">Loading…</div>}>
      <ComparePageInner />
    </Suspense>
  );
}
