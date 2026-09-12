import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

/**
 * One-off: converts the similarities table from directional
 * (fromMovieId/toMovieId) back to symmetric (movieLowId/movieHighId),
 * preserving existing rows instead of truncating — used when there's real
 * user data to keep (unlike the earlier symmetric -> directional migration,
 * which had none).
 */
async function main() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  await client.connect();

  const cols = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'similarities'`,
  );
  const columnNames = cols.rows.map((r: { column_name: string }) => r.column_name);

  if (columnNames.includes('fromMovieId') && !columnNames.includes('movieLowId')) {
    await client.query('ALTER TABLE similarities RENAME COLUMN "fromMovieId" TO "movieLowId"');
    await client.query('ALTER TABLE similarities RENAME COLUMN "toMovieId" TO "movieHighId"');
    console.log('Renamed columns to movieLowId/movieHighId.');
  } else {
    console.log('Columns already in symmetric shape; skipping rename.');
  }

  const swapped = await client.query(
    'UPDATE similarities SET "movieLowId" = "movieHighId", "movieHighId" = "movieLowId" WHERE "movieLowId" > "movieHighId"',
  );
  console.log(`Normalized ${swapped.rowCount} row(s) so movieLowId < movieHighId.`);

  const dupes = await client.query(
    `SELECT "movieLowId", "movieHighId", COUNT(*) FROM similarities GROUP BY "movieLowId", "movieHighId" HAVING COUNT(*) > 1`,
  );
  if (dupes.rows.length > 0) {
    console.warn('Found duplicate pairs after normalization — resolve manually:', dupes.rows);
  } else {
    console.log('No duplicate pairs — safe for the unique constraint.');
  }

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
