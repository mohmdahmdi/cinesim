const BASE = process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE ?? "https://image.tmdb.org/t/p";

export function posterUrl(path: string | null | undefined, size: "w185" | "w342" | "w500" = "w342") {
  if (!path) return null;
  return `${BASE}/${size}${path}`;
}

export function backdropUrl(path: string | null | undefined, size: "w780" | "w1280" = "w1280") {
  if (!path) return null;
  return `${BASE}/${size}${path}`;
}

export function profileUrl(path: string | null | undefined, size: "w185" = "w185") {
  if (!path) return null;
  return `${BASE}/${size}${path}`;
}
