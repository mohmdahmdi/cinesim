import * as fs from 'fs';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { TmdbClient } from '../src/services/tmdb/tmdb.client';
import { MovieCacheService } from '../src/services/tmdb/movie-cache.service';
import { Movie } from '../src/services/movies/entities/movie.entity';
import { Similarity } from '../src/services/similarities/entities/similarity.entity';
import { TmdbMovieSummary } from '../src/services/tmdb/tmdb.types';

/**
 * Imports the curated cold-start similarity dataset (scripts/data/seed-*.json,
 * produced by build-seed-similarities.js) into the real database.
 *
 * For every curated movie this resolves a real TMDB id (checking the local
 * cache first, then falling back to a TMDB title+year search) and imports it
 * through the existing MovieCacheService — the same path a normal user
 * request uses, so no movie is ever duplicated or bypasses the app's own
 * caching/genre/credit logic.
 *
 * Every edge is inserted with suggestedByUserId = NULL and agreeCount /
 * disagreeCount / score / validated left at their schema defaults (0 / 0 / 0
 * / false) — nothing here is attributed to a user or pre-loaded with votes.
 * That NULL is also the permanent, query-able marker that distinguishes a
 * seed edge from a real community suggestion (every community suggestion
 * always has a suggestedByUserId, enforced by SimilaritiesService.suggest()).
 *
 * Idempotent: re-running only fills in gaps. Movies already cached are
 * reused (never re-imported), and edges use ON CONFLICT DO NOTHING against
 * the existing (movieLowId, movieHighId) unique constraint, so it can never
 * overwrite a real vote count that has accrued since the last run.
 *
 * Usage: yarn seed:similarities  (run where TMDB is actually reachable)
 */

interface SeedMovie {
  key: string;
  title: string;
  year: number;
}

interface SeedEdge {
  a: string;
  b: string;
  reason: string;
  source: string;
}

const DATA_DIR = path.join(__dirname, 'data');
const YEAR_TOLERANCE = 1;
const MATCH_SCORE_THRESHOLD = 6;
const INSERT_BATCH_SIZE = 500;

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function scoreCandidate(
  candidateTitle: string,
  candidateYear: string | null,
  wantTitle: string,
  wantYear: number,
): number {
  const a = normalizeTitle(candidateTitle);
  const b = normalizeTitle(wantTitle);
  let score = 0;
  if (a === b) score += 10;
  else if (a.includes(b) || b.includes(a)) score += 4;

  if (candidateYear) {
    const diff = Math.abs(Number(candidateYear) - wantYear);
    if (diff === 0) score += 6;
    else if (diff <= YEAR_TOLERANCE) score += 3;
  }
  return score;
}

async function resolveTmdbId(
  movieRepo: Repository<Movie>,
  tmdb: TmdbClient,
  entry: SeedMovie,
): Promise<number | null> {
  // 1) Already-cached local match by title + year — no network call needed.
  const local = await movieRepo
    .createQueryBuilder('m')
    .where('m.title ILIKE :t OR m.originalTitle ILIKE :t', { t: `%${entry.title}%` })
    .getMany();

  const localBest = local
    .map((m: Movie) => ({
      movie: m,
      score: scoreCandidate(m.title, m.releaseDate?.slice(0, 4) ?? null, entry.title, entry.year),
    }))
    .sort((x, y) => y.score - x.score)[0];

  if (localBest && localBest.score >= MATCH_SCORE_THRESHOLD) {
    return localBest.movie.tmdbId;
  }

  // 2) TMDB search, ranked client-side by normalized title + year proximity.
  try {
    const remote = await tmdb.searchMovies(entry.title);
    const remoteBest = remote.results
      .map((r: TmdbMovieSummary) => ({
        result: r,
        score: scoreCandidate(r.title, r.release_date?.slice(0, 4) ?? null, entry.title, entry.year),
      }))
      .sort((x, y) => y.score - x.score)[0];

    if (remoteBest && remoteBest.score >= MATCH_SCORE_THRESHOLD) {
      return remoteBest.result.id;
    }
  } catch (err) {
    console.warn(`  [warn] TMDB search failed for "${entry.title}" (${entry.year}):`, (err as Error).message);
  }

  return null;
}

async function main() {
  const movies: SeedMovie[] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'seed-movies.json'), 'utf8'));
  const edges: SeedEdge[] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'seed-edges.json'), 'utf8'));

  console.log(`Loaded ${movies.length} curated movies and ${edges.length} curated edges.`);

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  // Looked up via getDataSourceToken() rather than app.get(DataSource) directly —
  // in this workspace, resolving the bare class token intermittently misses
  // (likely a duplicated `typeorm` module instance across the monorepo), while
  // the token @nestjs/typeorm itself registered under always resolves.
  const dataSource = app.get<DataSource>(getDataSourceToken());
  const tmdb = app.get(TmdbClient);
  const movieCache = app.get(MovieCacheService);
  const movieRepo = dataSource.getRepository(Movie);

  const keyToTmdbId = new Map<string, number>();
  const unresolved: SeedMovie[] = [];

  let done = 0;
  for (const entry of movies) {
    const tmdbId = await resolveTmdbId(movieRepo, tmdb, entry);
    if (tmdbId == null) {
      unresolved.push(entry);
    } else {
      try {
        await movieCache.getOrImport(tmdbId);
        keyToTmdbId.set(entry.key, tmdbId);
      } catch (err) {
        console.warn(`  [warn] Could not import "${entry.title}" (tmdbId ${tmdbId}):`, (err as Error).message);
        unresolved.push(entry);
      }
    }
    done++;
    if (done % 25 === 0) console.log(`Resolved ${done}/${movies.length} movies...`);
  }

  console.log(`Movies resolved: ${keyToTmdbId.size}/${movies.length}`);
  if (unresolved.length > 0) {
    console.log(`Unresolved movies (skipped, along with any edges touching them):`);
    unresolved.forEach((m) => console.log(`  - ${m.title} (${m.year})`));
  }

  type Row = { movieLowId: number; movieHighId: number };
  const rows: Row[] = [];
  let skippedUnresolved = 0;
  const seenPairs = new Set<string>();

  for (const edge of edges) {
    const aId = keyToTmdbId.get(edge.a);
    const bId = keyToTmdbId.get(edge.b);
    if (aId == null || bId == null) {
      skippedUnresolved++;
      continue;
    }
    if (aId === bId) continue; // two curated keys resolved to the same real movie

    const movieLowId = Math.min(aId, bId);
    const movieHighId = Math.max(aId, bId);
    const pairKey = `${movieLowId}|${movieHighId}`;
    if (seenPairs.has(pairKey)) continue;
    seenPairs.add(pairKey);

    rows.push({ movieLowId, movieHighId });
  }

  console.log(`Edges ready to insert: ${rows.length} (skipped ${skippedUnresolved} touching an unresolved movie).`);

  let inserted = 0;
  for (let i = 0; i < rows.length; i += INSERT_BATCH_SIZE) {
    const batch = rows.slice(i, i + INSERT_BATCH_SIZE);
    const result = await dataSource
      .createQueryBuilder()
      .insert()
      .into(Similarity)
      .values(batch.map((r) => ({ movieLowId: r.movieLowId, movieHighId: r.movieHighId })))
      .orIgnore()
      .execute();
    // With ON CONFLICT DO NOTHING, Postgres only RETURNINGs the rows that were
    // actually inserted — `raw` reflects the true insert count, unlike
    // `identifiers`, which is padded to match the input batch length.
    inserted += Array.isArray(result.raw) ? result.raw.length : 0;
  }

  console.log(`Done. Inserted ${inserted} new seed relationships (existing/duplicate pairs were left untouched).`);

  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
