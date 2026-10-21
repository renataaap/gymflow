import { createPool, migrate } from "../server/db.js";
const pool = createPool();
try {
  await migrate(pool);
  console.log("Migrações PostgreSQL aplicadas.");
} finally {
  await pool.end();
}
