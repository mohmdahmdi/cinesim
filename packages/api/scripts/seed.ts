import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TmdbClient } from '../src/services/tmdb/tmdb.client';
import { MovieCacheService } from '../src/services/tmdb/movie-cache.service';
import { TmdbMovieSummary, TmdbPaginatedResponse } from '../src/services/tmdb/tmdb.types';

const DISCOVER_LANGUAGES = ['en', 'fr', 'ja', 'ko', 'hi', 'es', 'it', 'de', 'zh', 'fa', 'ru', 'pt'];
const DISCOVER_PAGES_PER_LANGUAGE = 6;
const POPULAR_PAGES = 10;
const TOP_RATED_PAGES = 10;
// Kept low on purpose — a VPN/proxy hop to TMDB tends to choke on too many
// concurrent streams (timeouts/reset connections), so we trade parallelism
// for reliability here rather than trying to be fast.
const COLLECT_CONCURRENCY = 3;
const IMPORT_CONCURRENCY = 4;

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array<R>(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

async function collectPages(
  label: string,
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
      console.error(`[${label}] failed to fetch page ${page}:`, (err as Error).message);
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

  await mapWithConcurrency(tmdbIds, IMPORT_CONCURRENCY, async (id) => {
    try {
      await movieCache.getOrImport(id);
      imported++;
    } catch {
      failed++;
    }
    if ((imported + failed) % 50 === 0) {
      console.log(`Imported ${imported}/${tmdbIds.length} (${failed} failed so far)`);
    }
  });

  return { imported, failed };
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const tmdb = app.get(TmdbClient);
  const movieCache = app.get(MovieCacheService);

  console.log('Collecting candidate movies from TMDB...');

  type Source = { label: string; run: () => Promise<TmdbMovieSummary[]> };
  const sources: Source[] = [
    { label: 'popular', run: () => collectPages('popular', (page) => tmdb.getPopular(page), POPULAR_PAGES) },
    {
      label: 'top_rated',
      run: () => collectPages('top_rated', (page) => tmdb.getTopRated(page), TOP_RATED_PAGES),
    },
    ...DISCOVER_LANGUAGES.map((lang) => ({
      label: `lang:${lang}`,
      run: () =>
        collectPages(`lang:${lang}`, (page) => tmdb.discoverByLanguage(lang, page), DISCOVER_PAGES_PER_LANGUAGE),
    })),
  ];

  const collected = await mapWithConcurrency(sources, COLLECT_CONCURRENCY, async (source) => {
    const results = await source.run();
    console.log(`[${source.label}] collected ${results.length} movies`);
    return results;
  });

  const all = collected.flat();
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
