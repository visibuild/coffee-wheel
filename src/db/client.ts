import { resolve } from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

/** Works with both drivers, and with `tx` inside `db.transaction(...)`. */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export const migrationsFolder = resolve(process.cwd(), "src/db/migrations");

// Shared via globalThis so HMR / per-route bundle copies reuse one connection.
declare global {
  var __coffeeDb: Promise<Db> | undefined;
}

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  if (url.startsWith("pglite:")) {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    const db = drizzle(new PGlite(url.slice("pglite:".length)), { schema });
    await migrate(db, { migrationsFolder });
    return db;
  }
  // Pool (not neon-http) so interactive transactions work.
  const { Pool, neonConfig } = await import("@neondatabase/serverless");
  const { drizzle } = await import("drizzle-orm/neon-serverless");
  if (typeof WebSocket === "undefined") {
    neonConfig.webSocketConstructor = (await import("ws")).default;
  }
  return drizzle(new Pool({ connectionString: url }), { schema });
}

/** Lazy: nothing connects until first call. */
export async function getDb(): Promise<Db> {
  globalThis.__coffeeDb ??= connect().catch((e) => {
    globalThis.__coffeeDb = undefined;
    throw e;
  });
  return globalThis.__coffeeDb;
}
