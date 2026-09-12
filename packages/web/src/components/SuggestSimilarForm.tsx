"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { Movie, suggestSimilar } from "@/services/movies";
import { successMessage, errorMessage } from "@/utils/toasts";
import { posterUrl } from "@/utils/tmdbImage";
import MovieSearchAutocomplete from "./MovieSearchAutocomplete";

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

  const mutation = useMutation({
    mutationFn: (similarToTmdbId: number) => suggestSimilar(tmdbId, similarToTmdbId),
    onSuccess: () => {
      successMessage("Thanks! Your suggestion was added.");
      queryClient.invalidateQueries({ queryKey: ["movie", tmdbId] });
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Couldn't add that suggestion.";
      errorMessage(message);
    },
    onSettled: () => setPendingId(null),
  });

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
              const isPending = mutation.isPending && pendingId === movie.tmdbId;
              return (
                <button
                  key={movie.tmdbId}
                  type="button"
                  disabled={mutation.isPending}
                  onClick={() => {
                    setPendingId(movie.tmdbId);
                    mutation.mutate(movie.tmdbId);
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
          mutation.mutate(movie.tmdbId);
        }}
      />
      {mutation.isPending && !candidates.some((c) => c.tmdbId === pendingId) && (
        <p className="mt-2 text-xs text-muted">Adding suggestion…</p>
      )}
    </div>
  );
}
