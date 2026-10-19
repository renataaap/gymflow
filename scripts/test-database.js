import EmbeddedPostgres from "embedded-postgres";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import net from "node:net";
import { createPool } from "../server/db.js";
export async function freePort() {
  const s = net.createServer();
  await new Promise((resolve, reject) =>
    s.once("error", reject).listen(0, "127.0.0.1", resolve),
  );
  const port = s.address().port;
  await new Promise((resolve) => s.close(resolve));
  return port;
}
export async function testDatabase() {
  const directory = await mkdtemp(join(tmpdir(), "gymflow-postgres-")),
    port = await freePort(),
    password = randomBytes(24).toString("hex"),
    appPassword = randomBytes(24).toString("hex");
  const cluster = new EmbeddedPostgres({
    databaseDir: join(directory, "data"),
    port,
    user: "postgres",
    password,
    persistent: true,
    authMethod: "scram-sha-256",
    postgresFlags: ["-h", "127.0.0.1", "-k", directory],
    onLog: () => {},
    onError: () => {},
  });
  try {
    await cluster.initialise();
    await cluster.start();
    const admin = cluster.getPgClient("postgres", "127.0.0.1");
    await admin.connect();
    await admin.query(
      `CREATE ROLE gymflow_app LOGIN PASSWORD '${appPassword}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS`,
    );
    await admin.query("CREATE DATABASE gymflow_test OWNER gymflow_app");
    await admin.end();
    const url = `postgresql://gymflow_app:${appPassword}@127.0.0.1:${port}/gymflow_test`,
      pool = createPool(url);
    return {
      pool,
      url,
      cluster,
      async stop() {
        if (!pool.ending) await pool.end();
        await cluster.stop();
        await rm(directory, { recursive: true, force: true });
      },
    };
  } catch (error) {
    await cluster.stop().catch(() => {});
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}
