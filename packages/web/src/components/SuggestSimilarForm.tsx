"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { Movie, MovieSearchResult, suggestSimilar, suggestSimilarBulk } from "@/services/movies";
import { SimilarityReason } from "@/services/similarities";
import { successMessage, errorMessage, warningMessage } from "@/utils/toasts";
import { posterUrl } from "@/utils/tmdbImage";
import MovieSearchAutocomplete from "./MovieSearchAutocomplete";
import ReasonPicker from "./ReasonPicker";

export default function SuggestSimilarForm({
  tmdbId,
  candidates,
}: {
  tmdbId: number;
  candidates: Movie[];
}) {
  const { user, isReady } = useAuth();
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [showReasons, setShowReasons] = useState(false);
  const [reasons, setReasonsState] = useState<SimilarityReason[]>([]);

  const invalidateMovie = () => queryClient.invalidateQueries({ queryKey: ["movie", tmdbId] });

  const quickMutation = useMutation({
    mutationFn: (similarToTmdbId: number) =>
      suggestSimilar(tmdbId, similarToTmdbId, reasons.length > 0 ? reasons : undefined),
    onSuccess: () => {
      successMessage("Thanks! Your suggestion was added.");
      setReasonsState([]);
      invalidateMovie();
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Couldn't add that suggestion.";
      errorMessage(message);
    },
    onSettled: () => setPendingId(null),
  });

  const bulkMutation = useMutation({
    mutationFn: (movies: MovieSearchResult[]) =>
      suggestSimilarBulk(
        tmdbId,
        movies.map((movie) => ({
          similarToTmdbId: movie.tmdbId,
          reasons: reasons.length > 0 ? reasons : undefined,
        }))
      ),
    onSuccess: (results) => {
      const succeeded = results.filter((r) => r.ok).length;
      const failed = results.length - succeeded;
      if (succeeded > 0) {
        successMessage(
          `Added ${succeeded} suggestion${succeeded === 1 ? "" : "s"}${failed > 0 ? ` (${failed} failed)` : ""}.`
        );
      } else {
        warningMessage("Couldn't add those suggestions.");
      }
      setReasonsState([]);
      invalidateMovie();
    },
    onError: () => errorMessage("Couldn't add those suggestions. Please try again."),
  });

  const toggleReason = (reason: SimilarityReason) => {
    setReasonsState((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]
    );
  };

  if (isReady && !user) {
    return (
      <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
        <Link href="/login" className="text-accent hover:underline">
          Log in
        </Link>{" "}
        to suggest a movie that&apos;s similar to this one.
      </p>
    );
  }

  return (
    <div>
      {candidates.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs text-muted">
            Based on what the community has already connected:
          </p>
          <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-1">
            {candidates.map((movie) => {
              const poster = posterUrl(movie.posterPath, "w185");
              const isPending = quickMutation.isPending && pendingId === movie.tmdbId;
              return (
                <button
                  key={movie.tmdbId}
                  type="button"
                  disabled={quickMutation.isPending}
                  onClick={() => {
                    setPendingId(movie.tmdbId);
                    quickMutation.mutate(movie.tmdbId);
                  }}
                  className="group w-20 shrink-0 text-left disabled:opacity-50"
                >
                  <div className="aspect-[2/3] overflow-hidden rounded-lg bg-surface ring-1 ring-transparent transition group-hover:ring-accent">
                    {poster ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={poster}
                        alt={movie.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-1 text-center text-[10px] text-muted">
                        {movie.title}
                      </div>
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs text-muted group-hover:text-accent">
                    {isPending ? "Adding…" : movie.title}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <MovieSearchAutocomplete
        placeholder="Which movie is similar to this one?"
        onSelect={(movie) => {
          setPendingId(movie.tmdbId);
          quickMutation.mutate(movie.tmdbId);
        }}
        onConfirmMultiple={(movies) => bulkMutation.mutate(movies)}
      />
      <p className="mt-1 text-[11px] text-muted">
        Tip: check &quot;Select multiple&quot; in the dropdown to suggest several movies at once.
      </p>

      <button
        type="button"
        onClick={() => setShowReasons((v) => !v)}
        className="mt-2 text-xs text-muted underline decoration-dotted hover:text-accent"
      >
        {showReasons ? "Hide reasons" : "+ Say why (optional)"}
      </button>
      {showReasons && (
        <div className="mt-2">
          <ReasonPicker value={reasons} onToggle={toggleReason} />
        </div>
      )}

      {(quickMutation.isPending || bulkMutation.isPending) && (
        <p className="mt-2 text-xs text-muted">Adding suggestion…</p>
      )}
    </div>
  );
}
