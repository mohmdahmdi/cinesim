import Link from "next/link";
import { Movie } from "@/services/movies";
import { posterUrl } from "@/utils/tmdbImage";

export default function MovieCard({ movie }: { movie: Movie }) {
  const year = movie.releaseDate?.slice(0, 4);
  const poster = posterUrl(movie.posterPath);

  return (
    <Link href={`/movies/${movie.tmdbId}`} className="group block">
      <div className="aspect-[2/3] overflow-hidden rounded-lg bg-surface">
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster}
            alt={movie.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-2 text-center text-xs text-muted">
            {movie.title}
          </div>
        )}
      </div>
      <p className="mt-2 truncate text-sm text-foreground group-hover:text-accent">{movie.title}</p>
      <p className="text-xs text-muted">{year ?? "—"}</p>
    </Link>
  );
}
