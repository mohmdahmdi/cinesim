"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getProfile } from "@/services/users";
import { getSuggestionsByUsername } from "@/services/similarities";
import { posterUrl } from "@/utils/tmdbImage";

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);

  const { data: profile } = useQuery({
    queryKey: ["profile", username],
    queryFn: () => getProfile(username),
  });

  const { data: suggestions = [] } = useQuery({
    queryKey: ["suggestions", username],
    queryFn: () => getSuggestionsByUsername(username),
  });

  if (!profile) return <div className="p-10 text-center text-muted">Loading…</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-2xl text-foreground">{profile.username}</h1>
      <p className="mt-1 text-sm text-accent">{profile.tier}</p>

      <div className="mt-6 grid grid-cols-3 gap-4 rounded-xl border border-border bg-surface p-4 text-center">
        <div>
          <p className="font-display text-xl text-foreground">{profile.reputationScore}</p>
          <p className="text-xs text-muted">Reputation</p>
        </div>
        <div>
          <p className="font-display text-xl text-foreground">{profile.suggestionsCount}</p>
          <p className="text-xs text-muted">Suggestions</p>
        </div>
        <div>
          <p className="font-display text-xl text-foreground">{profile.votesCount}</p>
          <p className="text-xs text-muted">Votes cast</p>
        </div>
      </div>

      <h2 className="mt-10 mb-4 font-display text-lg text-foreground">Suggestions made</h2>
      {suggestions.length === 0 && <p className="text-sm text-muted">No suggestions yet.</p>}
      <div className="grid gap-3">
        {suggestions.map((s) => (
          <div
            key={s.similarityId}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 text-sm"
          >
            {[s.movieLow, s.movieHigh].map((movie) => {
              const poster = posterUrl(movie.posterPath, "w185");
              return (
                <Link key={movie.tmdbId} href={`/movies/${movie.tmdbId}`} className="flex items-center gap-2">
                  {poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={poster} alt={movie.title} className="h-14 w-10 rounded object-cover" />
                  ) : (
                    <div className="h-14 w-10 rounded bg-surface-hover" />
                  )}
                  <span className="text-foreground hover:text-accent">{movie.title}</span>
                </Link>
              );
            })}
            <span className="ml-auto shrink-0 text-xs text-muted">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
