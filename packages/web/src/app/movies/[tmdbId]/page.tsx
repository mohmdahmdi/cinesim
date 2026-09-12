"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMovieDetail, Movie, SimilarityListItem } from "@/services/movies";
import { voteSimilarity } from "@/services/similarities";
import { useAuth } from "@/providers/AuthProvider";
import { backdropUrl, posterUrl } from "@/utils/tmdbImage";
import { errorMessage } from "@/utils/toasts";
import SimilarityCard from "@/components/SimilarityCard";
import SuggestSimilarForm from "@/components/SuggestSimilarForm";

type MovieDetailData = { movie: Movie; similar: SimilarityListItem[] };

export default function MoviePage({ params }: { params: Promise<{ tmdbId: string }> }) {
  const { tmdbId: tmdbIdParam } = use(params);
  const tmdbId = Number(tmdbIdParam);
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["movie", tmdbId];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => getMovieDetail(tmdbId),
  });

  const voteMutation = useMutation({
    mutationFn: ({ similarityId, vote }: { similarityId: string; vote: "agree" | "disagree" }) =>
      voteSimilarity(similarityId, vote),
    onMutate: async ({ similarityId, vote }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<MovieDetailData>(queryKey);

      if (previous) {
        queryClient.setQueryData<MovieDetailData>(queryKey, {
          ...previous,
          similar: previous.similar.map((item) => {
            if (item.similarityId !== similarityId) return item;
            let agreeCount = item.agreeCount - (item.myVote === "agree" ? 1 : 0);
            let disagreeCount = item.disagreeCount - (item.myVote === "disagree" ? 1 : 0);
            if (vote === "agree") agreeCount += 1;
            else disagreeCount += 1;
            return { ...item, agreeCount, disagreeCount, myVote: vote };
          }),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      errorMessage("Vote failed. Please try again.");
    },
    onSuccess: (result) => {
      queryClient.setQueryData<MovieDetailData>(queryKey, (old) =>
        old
          ? {
              ...old,
              similar: old.similar.map((item) =>
                item.similarityId === result.similarityId
                  ? { ...item, ...result }
                  : item,
              ),
            }
          : old,
      );
    },
  });

  const handleVote = (similarityId: string, vote: "agree" | "disagree") => {
    if (!user) {
      errorMessage("Log in to vote on similarities.");
      router.push("/login");
      return;
    }
    voteMutation.mutate({ similarityId, vote });
  };

  if (isLoading || !data) {
    return <div className="p-10 text-center text-muted">Loading…</div>;
  }

  const { movie, similar } = data;
  const directors = movie.credits.filter((c) => c.role === "director");
  const cast = movie.credits.filter((c) => c.role === "cast").slice(0, 8);
  const backdrop = backdropUrl(movie.backdropPath);
  const poster = posterUrl(movie.posterPath, "w500");

  return (
    <div>
      <div className="relative">
        {backdrop && (
          <div
            className="h-64 w-full bg-cover bg-center sm:h-80"
            style={{ backgroundImage: `url(${backdrop})` }}
          >
            <div className="h-full w-full bg-gradient-to-t from-background via-background/60 to-background/10" />
          </div>
        )}

        <div className="mx-auto -mt-24 max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col gap-6 sm:flex-row">
            <div className="w-40 shrink-0 sm:w-56">
              {poster ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={poster} alt={movie.title} className="w-full rounded-lg shadow-xl" />
              ) : (
                <div className="aspect-[2/3] w-full rounded-lg bg-surface" />
              )}
            </div>

            <div className="flex-1 pb-4 pt-4 sm:pt-24">
              <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
                {movie.title}
              </h1>
              <p className="mt-1 text-sm text-muted">
                {movie.releaseDate?.slice(0, 4)}
                {movie.runtime ? ` · ${movie.runtime} min` : ""}
                {movie.originalLanguage ? ` · ${movie.originalLanguage.toUpperCase()}` : ""}
              </p>

              {movie.genres.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {movie.genres.map((g) => (
                    <span
                      key={g.tmdbId}
                      className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted"
                    >
                      {g.name}
                    </span>
                  ))}
                </div>
              )}

              {movie.overview && <p className="mt-4 max-w-2xl text-sm text-foreground/90">{movie.overview}</p>}

              {directors.length > 0 && (
                <p className="mt-4 text-sm text-muted">
                  <span className="text-foreground">Director:</span>{" "}
                  {directors.map((d) => d.person.name).join(", ")}
                </p>
              )}
              {cast.length > 0 && (
                <p className="mt-1 text-sm text-muted">
                  <span className="text-foreground">Cast:</span>{" "}
                  {cast.map((c) => c.person.name).join(", ")}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h2 className="font-display text-xl text-foreground">Movies similar to {movie.title}</h2>
        <p className="mt-1 text-sm text-muted">
          Ranked by community agreement — not by an algorithm.
        </p>

        <div className="mt-6 grid gap-3">
          {similar.length === 0 && (
            <p className="text-sm text-muted">
              No suggestions yet. Be the first to say what&apos;s similar to this movie.
            </p>
          )}
          {similar.map((item) => (
            <SimilarityCard
              key={item.similarityId}
              item={item}
              disabled={voteMutation.isPending}
              onVote={(vote) => handleVote(item.similarityId, vote)}
            />
          ))}
        </div>

        <div className="mt-8">
          <h3 className="mb-3 font-display text-base text-foreground">Suggest a similar movie</h3>
          <SuggestSimilarForm tmdbId={tmdbId} />
        </div>
      </div>
    </div>
  );
}
