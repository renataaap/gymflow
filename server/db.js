import pg from "pg";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
pg.types.setTypeParser(1082, (value) => value);
pg.types.setTypeParser(1700, (value) => Number(value));
pg.types.setTypeParser(1184, (value) => new Date(value).toISOString());
export const createPool = (connectionString = process.env.DATABASE_URL) => {
  if (!connectionString)
    throw new Error("Configure DATABASE_URL com a conexão PostgreSQL.");
  return new pg.Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 10000,
    ...(process.env.DATABASE_SSL === "require"
      ? { ssl: { rejectUnauthorized: true } }
      : {}),
  });
};
export async function transaction(pool, user, callback, system = false) {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    await db.query(
      "SELECT set_config('gymflow.user_id',$1,true),set_config('gymflow.role',$2,true),set_config('gymflow.system',$3,true)",
      [String(user?.id || ""), user?.role || "", system ? "on" : "off"],
    );
    const value = await callback(db);
    await db.query("COMMIT");
    return value;
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    db.release();
  }
}
export const rows = async (db, sql, args = []) =>
  (await db.query(sql, args)).rows;
export const one = async (db, sql, args = []) => (await rows(db, sql, args))[0];
export async function migrate(pool) {
  await transaction(
    pool,
    null,
    async (db) => {
      await db.query("SELECT pg_advisory_xact_lock(67492011)");
      await db.query(
        "CREATE TABLE IF NOT EXISTS schema_migrations(name TEXT PRIMARY KEY,checksum TEXT NOT NULL,applied_at TIMESTAMPTZ NOT NULL DEFAULT now())",
      );
      const folder = new URL("../db/migrations/", import.meta.url);
      for (const name of (await fs.readdir(folder))
        .filter((n) => n.endsWith(".sql"))
        .sort()) {
        const sql = await fs.readFile(new URL(name, folder), "utf8"),
          checksum = createHash("sha256").update(sql).digest("hex");
        const existing = await one(
          db,
          "SELECT checksum FROM schema_migrations WHERE name=$1",
          [name],
        );
        if (existing) {
          if (existing.checksum !== checksum)
            throw new Error(`Migração aplicada foi alterada: ${name}`);
          continue;
        }
        await db.query(sql);
        await db.query(
          "INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)",
          [name, checksum],
        );
      }
    },
    true,
  );
}
