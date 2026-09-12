"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getLeaderboard } from "@/services/users";

export default function LeaderboardPage() {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: getLeaderboard,
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-2xl text-foreground">Top contributors</h1>
      <p className="mt-1 text-sm text-muted">
        Ranked by reputation earned suggesting and voting on movie similarities.
      </p>

      {isLoading ? (
        <p className="mt-6 text-muted">Loading…</p>
      ) : (
        <ol className="mt-6 grid gap-2">
          {users.map((user, index) => (
            <li key={user.username}>
              <Link
                href={`/u/${user.username}`}
                className="flex items-center gap-4 rounded-xl border border-border bg-surface p-3 hover:border-accent"
              >
                <span className="w-6 text-center font-display text-muted">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-foreground">{user.username}</p>
                  <p className="text-xs text-muted">{user.tier}</p>
                </div>
                <span className="font-display text-foreground">{user.reputationScore}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
