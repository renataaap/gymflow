// Disposable PostgreSQL and API, used only for visual QA in this workspace.
import { testDatabase } from "./test-database.js";
import { migrate } from "../server/db.js";
import { seed } from "../server/seed.js";
import { createApp } from "../server/app.js";
const db = await testDatabase();
await migrate(db.pool);
await seed(db.pool);
const server = createApp(db.pool, { demo: true, secure: false }).listen(
  3000,
  "0.0.0.0",
  () => console.log("GymFlow QA: http://127.0.0.1:3000 · PostgreSQL real"),
);
const stop = () =>
  server.close(async () => {
    await db.stop();
    process.exit(0);
  });
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
