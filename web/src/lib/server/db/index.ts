import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

/** Any Postgres-backed Drizzle database with our schema (Neon in production, PGlite in tests). */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

let db: Db | null | undefined;

/** The app database, or null when `DATABASE_URL` isn't set (accounts are then switched off). */
export function getDb(): Db | null {
  if (db === undefined) {
    const url = process.env.DATABASE_URL;
    db = url ? (drizzle(neon(url), { schema }) as unknown as Db) : null;
  }
  return db;
}

export { schema };
