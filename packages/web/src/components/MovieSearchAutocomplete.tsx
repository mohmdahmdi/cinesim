"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchMovies, MovieSearchResult } from "@/services/movies";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { posterUrl } from "@/utils/tmdbImage";

export default function MovieSearchAutocomplete({
  placeholder = "Search for a movie...",
  onSelect,
  clearOnSelect = true,
  autoFocus = false,
}: {
  placeholder?: string;
  onSelect: (movie: MovieSearchResult) => void;
  clearOnSelect?: boolean;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 300);

  const { data: results = [], isFetching } = useQuery({
    queryKey: ["movie-search", debouncedQuery],
    queryFn: () => searchMovies(debouncedQuery),
    enabled: debouncedQuery.trim().length > 1,
  });

  const showDropdown = isOpen && debouncedQuery.trim().length > 1;

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
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        className="w-full rounded-full border border-border bg-surface px-4 py-2 text-sm text-foreground placeholder:text-muted outline-none focus:border-accent"
      />

      {showDropdown && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
          {isFetching && <div className="px-4 py-3 text-sm text-muted">Searching…</div>}

          {!isFetching && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-muted">No movies found.</div>
          )}

          {!isFetching &&
            results.map((movie) => (
              <button
                key={movie.tmdbId}
                type="button"
                onMouseDown={() => {
                  onSelect(movie);
                  if (clearOnSelect) setQuery("");
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-surface-hover"
              >
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
            ))}
        </div>
      )}
    </div>
  );
}
