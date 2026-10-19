import { transaction, one } from "./db.js";
import { passwordHash, text, fail } from "./security.js";
export async function bootstrapAdmin(pool) {
  return transaction(
    pool,
    null,
    async (db) => {
      await db.query("SELECT pg_advisory_xact_lock(67492012)");
      if (await one(db, "SELECT id FROM users LIMIT 1")) return false;
      const values = {
        name: process.env.INITIAL_ADMIN_NAME || "Administrador",
        email: process.env.INITIAL_ADMIN_EMAIL,
        password: process.env.INITIAL_ADMIN_PASSWORD,
      };
      const email = text(values, "email", 3, 200).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        fail(400, "Configure INITIAL_ADMIN_EMAIL válido.");
      await db.query(
        "INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,'admin')",
        [
          text(values, "name", 2, 100),
          email,
          await passwordHash(text(values, "password", 12, 200)),
        ],
      );
      return true;
    },
    true,
  );
}
