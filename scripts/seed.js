import { createPool, migrate } from "../server/db.js";
import { seed } from "../server/seed.js";
if (process.env.GYMFLOW_DEMO !== "1")
  throw new Error("O seed exige GYMFLOW_DEMO=1. Use somente dados fictícios.");
const pool = createPool();
try {
  await migrate(pool);
  console.log(
    (await seed(pool)) ? "Demonstração criada." : "Base existente preservada.",
  );
} finally {
  await pool.end();
}
