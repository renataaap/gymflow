import { createPool, migrate } from "./db.js";
import { seed } from "./seed.js";
import { bootstrapAdmin } from "./bootstrap.js";
import { createApp } from "./app.js";
const pool = createPool();
try {
  await migrate(pool);
  if (process.env.GYMFLOW_DEMO === "1") await seed(pool);
  else await bootstrapAdmin(pool);
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("PORT inválida.");
  const server = createApp(pool).listen(port, "0.0.0.0", () =>
    console.log(`GymFlow Node.js em http://0.0.0.0:${port}`),
  );
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
} catch (error) {
  console.error(
    "Não foi possível iniciar o GymFlow:",
    error.code || error.message,
  );
  await pool.end();
  process.exitCode = 1;
}
