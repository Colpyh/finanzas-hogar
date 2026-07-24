import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

type Schema = typeof schema;
type DbClient = NodePgDatabase<Schema>;

/**
 * Lazy database client.
 *
 * We deliberately DO NOT create the `pg.Pool` at module load time. Instead, the
 * real drizzle instance is created on first access and memoized. This has two
 * benefits:
 *
 * 1. Static pages and any route that does not actually hit the database
 *    never pay the cost of opening a pool — critical on serverless (Vercel),
 *    where modules are shared across many cold invocations.
 * 2. If `DATABASE_URL` is missing or malformed in the deployment environment,
 *    the error is raised lazily from the code path that needs the DB instead
 *    of crashing every route at module initialization time. A module-level
 *    throw turns a single misconfigured query into a global 500 for every
 *    route in the app, including fully static pages that have no DB usage.
 *
 * The export stays a named `db` so every existing call site
 * (`import { db } from "@/shared/lib/db"` → `db.select()…`) keeps working
 * unchanged.
 */
let cached: DbClient | null = null;

function getDb(): DbClient {
  if (cached) return cached;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Configure it in your environment (Vercel project settings or .env.local)."
    );
  }

  // Serverless-tuned pool. On Vercel each warm instance keeps its own pool, so
  // we cap connections low and recycle aggressively to avoid exhausting the
  // Supabase pooler. Pair this with the transaction-mode pooler (port 6543) in
  // DATABASE_URL for best results — confirmado en uso (jul 2026). max:1
  // serializaba los Promise.all de las páginas a nivel DB (una sola conexión
  // por instance): con el pooler transaction-mode multiplexando, max:4 deja
  // que esas queries corran en paralelo sin arriesgar agotar el pool de
  // Supabase (cada warm instance de Vercel abre su propio pool).
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 4,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  });
  cached = drizzle(pool, { schema });
  return cached;
}

export const db = new Proxy({} as DbClient, {
  get(_target, prop, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance as object, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
}) as DbClient;
