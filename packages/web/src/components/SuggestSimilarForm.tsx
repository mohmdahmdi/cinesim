"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { suggestSimilar } from "@/services/movies";
import { successMessage, errorMessage } from "@/utils/toasts";
import MovieSearchAutocomplete from "./MovieSearchAutocomplete";

export default function SuggestSimilarForm({ tmdbId }: { tmdbId: number }) {
  const { user, isReady } = useAuth();
  const queryClient = useQueryClient();

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
      <MovieSearchAutocomplete
        placeholder="Which movie is similar to this one?"
        onSelect={(movie) => mutation.mutate(movie.tmdbId)}
      />
      {mutation.isPending && <p className="mt-2 text-xs text-muted">Adding suggestion…</p>}
    </div>
  );
}
