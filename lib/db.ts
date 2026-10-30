import { Pool } from "pg";

const globalStore = globalThis as unknown as { pgPool?: Pool };

export const pool =
  globalStore.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
    max: 8
  });

if (process.env.NODE_ENV !== "production") globalStore.pgPool = pool;

export async function query<T = any>(text: string, params: unknown[] = []): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}
