"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchMovies, MovieSearchResult } from "@/services/movies";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { posterUrl } from "@/utils/tmdbImage";

export default function MovieSearchAutocomplete({
  placeholder = "Search for a movie...",
  onSelect,
  onConfirmMultiple,
  clearOnSelect = true,
  autoFocus = false,
}: {
  placeholder?: string;
  onSelect: (movie: MovieSearchResult) => void;
  /** When provided, a "Select multiple" toggle appears at the top of the dropdown. */
  onConfirmMultiple?: (movies: MovieSearchResult[]) => void;
  clearOnSelect?: boolean;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [multiMode, setMultiMode] = useState(false);
  const [selected, setSelected] = useState<MovieSearchResult[]>([]);
  const debouncedQuery = useDebouncedValue(query, 300);

  const { data: results = [], isFetching } = useQuery({
    queryKey: ["movie-search", debouncedQuery],
    queryFn: () => searchMovies(debouncedQuery),
    enabled: debouncedQuery.trim().length > 1,
  });

  const showDropdown = isOpen && debouncedQuery.trim().length > 1;

  const closeAndReset = () => {
    setIsOpen(false);
    setMultiMode(false);
    setSelected([]);
    if (clearOnSelect) setQuery("");
  };

  const toggleSelected = (movie: MovieSearchResult) => {
    setSelected((prev) =>
      prev.some((m) => m.tmdbId === movie.tmdbId)
        ? prev.filter((m) => m.tmdbId !== movie.tmdbId)
        : [...prev, movie]
    );
  };

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={query}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          if (multiMode) return; // stay open until the batch is confirmed
          setTimeout(() => setIsOpen(false), 150);
        }}
        className="w-full rounded-full border border-border bg-surface px-4 py-2 text-sm text-foreground placeholder:text-muted outline-none focus:border-accent"
      />

      {showDropdown && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
          {onConfirmMultiple && (
            <label
              onMouseDown={(e) => e.preventDefault()}
              className="flex cursor-pointer items-center gap-2 border-b border-border px-3 py-2 text-xs text-muted hover:text-foreground"
            >
              <input
                type="checkbox"
                checked={multiMode}
                onChange={() => {
                  setMultiMode((v) => !v);
                  setSelected([]);
                }}
                className="accent-accent"
              />
              Select multiple
              {multiMode && selected.length > 0 && (
                <span className="text-accent">· {selected.length} selected</span>
              )}
            </label>
          )}

          {isFetching && <div className="px-4 py-3 text-sm text-muted">Searching…</div>}

          {!isFetching && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-muted">No movies found.</div>
          )}

          {!isFetching &&
            results.map((movie) => {
              const isChecked = selected.some((m) => m.tmdbId === movie.tmdbId);
              return (
                <button
                  key={movie.tmdbId}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (multiMode) {
                      toggleSelected(movie);
                    } else {
                      onSelect(movie);
                      closeAndReset();
                    }
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-surface-hover"
                >
                  {multiMode && (
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                        isChecked
                          ? "border-accent bg-accent text-white"
                          : "border-border text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                  )}
                  {posterUrl(movie.posterPath, "w185") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={posterUrl(movie.posterPath, "w185")!}
                      alt=""
                      className="h-12 w-8 rounded object-cover"
                    />
                  ) : (
                    <div className="h-12 w-8 rounded bg-surface-hover" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{movie.title}</p>
                    <p className="text-xs text-muted">{movie.year ?? "—"}</p>
                  </div>
                </button>
              );
            })}

          {multiMode && (
            <button
              type="button"
              disabled={selected.length === 0}
              onMouseDown={(e) => {
                e.preventDefault();
                onConfirmMultiple?.(selected);
                closeAndReset();
              }}
              className="block w-full border-t border-border px-3 py-2 text-center text-sm font-medium text-accent hover:bg-surface-hover disabled:cursor-not-allowed disabled:text-muted"
            >
              {selected.length > 0 ? `Add ${selected.length} selected` : "Select movies above"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
