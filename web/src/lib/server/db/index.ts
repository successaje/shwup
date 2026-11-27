import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { Pool } from "pg";
import * as schema from "./schema";

/** Any Postgres-backed Drizzle database with our schema (Neon in production, PGlite in tests). */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

let db: Db | null | undefined;

/** Neon's HTTP driver suits serverless functions; any other Postgres (local dev, self-hosting) uses a pool. */
export function isNeonUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith(".neon.tech");
  } catch {
    return false;
  }
}

/** The app database, or null when `DATABASE_URL` isn't set (accounts are then switched off). */
export function getDb(): Db | null {
  if (db === undefined) {
    const url = process.env.DATABASE_URL;
    if (!url) db = null;
    else if (isNeonUrl(url)) db = drizzleNeon(neon(url), { schema }) as unknown as Db;
    else db = drizzlePg(new Pool({ connectionString: url, max: 5 }), { schema }) as unknown as Db;
  }
  return db;
}

/** Whether accounts are switched on for this deployment. */
export const accountsEnabled = () => Boolean(process.env.DATABASE_URL);

export { schema };
