"use client";

import { useState } from "react";
import Link from "next/link";
import { SimilarityListItem } from "@/services/movies";
import { posterUrl } from "@/utils/tmdbImage";
import ReasonsBreakdown from "./ReasonsBreakdown";
import CommentThread from "./CommentThread";

type Tab = "reasons" | "discussion";

export default function SimilarityCard({
  item,
  fromTmdbId,
  onVote,
  onRetract,
  onDelete,
  disabled,
}: {
  item: SimilarityListItem;
  fromTmdbId: number;
  onVote: (vote: "agree" | "disagree") => void;
  onRetract: () => void;
  onDelete: () => void;
  disabled?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<Tab | null>(null);
  const total = item.agreeCount + item.disagreeCount;
  const agreePct = total > 0 ? Math.round((item.agreeCount / total) * 100) : null;
  const poster = posterUrl(item.movie.posterPath, "w185");
  const year = item.movie.releaseDate?.slice(0, 4);

  const tabButtonClass = (tab: Tab) =>
    `px-3 py-2 text-xs font-medium transition ${
      activeTab === tab
        ? "border-b-2 border-accent text-accent"
        : "border-b-2 border-transparent text-muted hover:text-foreground"
    }`;

  return (
    <div
      className={`overflow-hidden rounded-xl border ${
        item.isMine ? "border-accent/40 bg-accent/5" : "border-border bg-surface"
      }`}
    >
      <div className="flex items-center gap-4 p-3">
        <Link href={`/movies/${item.movie.tmdbId}`} className="shrink-0">
          {poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={poster} alt={item.movie.title} className="h-24 w-16 rounded object-cover" />
          ) : (
            <div className="h-24 w-16 rounded bg-surface-hover" />
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <Link href={`/movies/${item.movie.tmdbId}`} className="hover:text-accent">
            <p className="truncate font-medium text-foreground">{item.movie.title}</p>
          </Link>
          <p className="text-xs text-muted">{year ?? "—"}</p>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            {item.isMine && (
              <span className="rounded-full bg-accent/20 px-2 py-0.5 font-medium text-accent">
                Your suggestion
              </span>
            )}
            <span className="text-muted">{item.label}</span>
            {agreePct !== null && (
              <span className="text-muted">
                · {agreePct}% agree · {total} vote{total === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>

        {item.isMine ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onDelete}
            className="shrink-0 rounded-full border border-border px-3 py-1 text-xs text-muted transition hover:border-disagree hover:text-disagree disabled:opacity-50"
          >
            Delete
          </button>
        ) : (
          <div className="flex shrink-0 flex-col gap-1.5">
            <button
              type="button"
              disabled={disabled}
              onClick={() => (item.myVote === "agree" ? onRetract() : onVote("agree"))}
              className={`rounded-full border px-3 py-1 text-xs transition disabled:opacity-50 ${
                item.myVote === "agree"
                  ? "border-agree bg-agree/20 text-agree"
                  : "border-border text-muted hover:border-agree hover:text-agree"
              }`}
            >
              {item.myVote === "agree" ? "Agreed ✓" : "Agree"}
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => (item.myVote === "disagree" ? onRetract() : onVote("disagree"))}
              className={`rounded-full border px-3 py-1 text-xs transition disabled:opacity-50 ${
                item.myVote === "disagree"
                  ? "border-disagree bg-disagree/20 text-disagree"
                  : "border-border text-muted hover:border-disagree hover:text-disagree"
              }`}
            >
              {item.myVote === "disagree" ? "Disagreed ✓" : "Disagree"}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap border-t border-border/60">
        <button
          type="button"
          className={tabButtonClass("reasons")}
          onClick={() => setActiveTab((t) => (t === "reasons" ? null : "reasons"))}
        >
          Why is this similar?
        </button>
        <button
          type="button"
          className={tabButtonClass("discussion")}
          onClick={() => setActiveTab((t) => (t === "discussion" ? null : "discussion"))}
        >
          Discussion
        </button>
        <Link
          href={`/compare?a=${fromTmdbId}&b=${item.movie.tmdbId}`}
          className="px-3 py-2 text-xs font-medium text-muted transition hover:text-foreground"
        >
          Compare these two
        </Link>
      </div>

      {activeTab && (
        <div className="w-full border-t border-border bg-background/40 p-4">
          {activeTab === "reasons" && <ReasonsBreakdown similarityId={item.similarityId} />}
          {activeTab === "discussion" && <CommentThread similarityId={item.similarityId} />}
        </div>
      )}
    </div>
  );
}
