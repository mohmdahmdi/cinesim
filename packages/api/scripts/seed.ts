import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TmdbClient } from '../src/services/tmdb/tmdb.client';
import { MovieCacheService } from '../src/services/tmdb/movie-cache.service';
import { TmdbMovieSummary, TmdbPaginatedResponse } from '../src/services/tmdb/tmdb.types';

const DISCOVER_LANGUAGES = ['en', 'fr', 'ja', 'ko', 'hi', 'es', 'it', 'de', 'zh', 'fa', 'ru', 'pt'];
const DISCOVER_PAGES_PER_LANGUAGE = 6;
const POPULAR_PAGES = 10;
const TOP_RATED_PAGES = 10;
const IMPORT_CONCURRENCY = 8;

async function collectPages(
  fetchPage: (page: number) => Promise<TmdbPaginatedResponse<TmdbMovieSummary>>,
  pages: number,
): Promise<TmdbMovieSummary[]> {
  const results: TmdbMovieSummary[] = [];
  for (let page = 1; page <= pages; page++) {
    try {
      const response = await fetchPage(page);
      results.push(...response.results);
      if (page >= response.total_pages) break;
    } catch (err) {
      console.error(`Failed to fetch page ${page}:`, (err as Error).message);
    }
  }
  return results;
}

async function importInBatches(
  movieCache: MovieCacheService,
  tmdbIds: number[],
): Promise<{ imported: number; failed: number }> {
  let imported = 0;
  let failed = 0;

  for (let i = 0; i < tmdbIds.length; i += IMPORT_CONCURRENCY) {
    const batch = tmdbIds.slice(i, i + IMPORT_CONCURRENCY);
    const outcomes = await Promise.allSettled(batch.map((id) => movieCache.getOrImport(id)));
    for (const outcome of outcomes) {
      if (outcome.status === 'fulfilled') imported++;
      else failed++;
    }
    if ((i / IMPORT_CONCURRENCY) % 20 === 0) {
      console.log(`Imported ${imported}/${tmdbIds.length} (${failed} failed)`);
    }
  }

  return { imported, failed };
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const tmdb = app.get(TmdbClient);
  const movieCache = app.get(MovieCacheService);

  console.log('Collecting candidate movies from TMDB...');

  const [popular, topRated, ...byLanguage] = await Promise.all([
    collectPages((page) => tmdb.getPopular(page), POPULAR_PAGES),
    collectPages((page) => tmdb.getTopRated(page), TOP_RATED_PAGES),
    ...DISCOVER_LANGUAGES.map((lang) =>
      collectPages((page) => tmdb.discoverByLanguage(lang, page), DISCOVER_PAGES_PER_LANGUAGE),
    ),
  ]);

  const all = [popular, topRated, ...byLanguage].flat();
  const uniqueIds = Array.from(new Set(all.map((m) => m.id)));

  console.log(`Found ${uniqueIds.length} unique candidate movies. Importing full details...`);

  const { imported, failed } = await importInBatches(movieCache, uniqueIds);

  console.log(`Done. Imported/cached ${imported} movies (${failed} failed).`);

  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
