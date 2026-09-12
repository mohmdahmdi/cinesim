import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

/**
 * One-off: clears similarity/vote data so the directional schema change
 * (movieLowId/movieHighId -> fromMovieId/toMovieId) can apply cleanly via
 * TypeORM's synchronize without a NOT-NULL column conflict on existing rows.
 * Movies, genres, people, and users are untouched.
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
  await client.query('TRUNCATE similarity_votes, similarities RESTART IDENTITY CASCADE');
  console.log('Cleared similarities and similarity_votes.');
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
