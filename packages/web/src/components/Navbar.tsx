"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import MovieSearchAutocomplete from "./MovieSearchAutocomplete";

const Navbar = () => {
  const router = useRouter();
  const { user, isReady, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:gap-4 sm:px-6">
        <Link href="/" className="font-display text-xl font-semibold tracking-wide text-foreground">
          Cine<span className="text-accent">Sim</span>
        </Link>

        <div className="order-3 w-full sm:order-none sm:max-w-sm sm:flex-1">
          <MovieSearchAutocomplete
            placeholder="Search movies…"
            onSelect={(movie) => router.push(`/movies/${movie.tmdbId}`)}
          />
        </div>

        <nav className="ml-auto flex items-center gap-4 text-sm">
          <Link href="/compare" className="hidden text-muted hover:text-foreground sm:inline">
            Compare
          </Link>
          <Link href="/leaderboard" className="hidden text-muted hover:text-foreground sm:inline">
            Leaderboard
          </Link>

          {isReady && user ? (
            <>
              <Link href={`/u/${user.username}`} className="text-foreground hover:text-accent">
                {user.username}
              </Link>
              <button onClick={logout} className="text-muted hover:text-foreground">
                Log out
              </button>
            </>
          ) : (
            isReady && (
              <>
                <Link href="/login" className="text-muted hover:text-foreground">
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-accent px-4 py-1.5 text-white hover:bg-accent-hover"
                >
                  Join
                </Link>
              </>
            )
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
