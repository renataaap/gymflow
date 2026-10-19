import express from "express";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { transaction, one } from "./db.js";
import {
  token,
  hash,
  passwordOK,
  same,
  text,
  fail,
  AppError,
} from "./security.js";
import { state } from "./state.js";
import { mutate } from "./mutations.js";
const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
  active: u.active,
});
export function createApp(
  pool,
  {
    demo = process.env.GYMFLOW_DEMO === "1",
    secure = process.env.NODE_ENV === "production",
    publicOrigin = process.env.PUBLIC_ORIGIN,
  } = {},
) {
  const app = express();
  if (process.env.RENDER === "true") app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          fontSrc: ["'self'"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      strictTransportSecurity: secure ? undefined : false,
    }),
  );
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (!["GET", "HEAD"].includes(req.method)) {
      const origin = req.get("origin");
      const allowed = publicOrigin || `${req.protocol}://${req.get("host")}`;
      if (origin && origin !== allowed)
        return res.status(403).json({ error: "Origem não permitida." });
      if (!req.is("application/json"))
        return res.status(415).json({ error: "Envie dados JSON." });
    }
    next();
  });
  app.use(express.json({ limit: "200kb" }));
  app.get("/api/health", async (req, res) => {
    await pool.query("SELECT id FROM settings WHERE id=1");
    res.json({ status: "ok", database: "postgresql" });
  });
  app.get("/api/config", (req, res) => res.json({ demo }));
  const attempts = new Map();
  const cleanup = setInterval(() => {
    const cutoff = Date.now() - 60000;
    for (const [key, value] of attempts)
      if (value.every((t) => t < cutoff)) attempts.delete(key);
  }, 60000);
  cleanup.unref();
  app.post("/api/login", async (req, res) => {
    const key = req.ip,
      recent = (attempts.get(key) || []).filter((t) => t > Date.now() - 60000);
    if (recent.length >= 12) fail(429, "Muitas tentativas. Aguarde um minuto.");
    recent.push(Date.now());
    attempts.set(key, recent);
    const email = text(req.body, "email", 3, 200).toLowerCase(),
      password = text(req.body, "password", 1, 200);
    const session = await transaction(
      pool,
      null,
      async (db) => {
        const user = await one(
          db,
          "SELECT * FROM users WHERE lower(email)=$1 AND active",
          [email],
        );
        if (!user || !(await passwordOK(password, user.password_hash)))
          fail(401, "E-mail ou senha incorretos.");
        const value = token(),
          csrf = token();
        await db.query("DELETE FROM sessions WHERE expires<now()");
        await db.query(
          "INSERT INTO sessions(token_hash,user_id,csrf,expires) VALUES($1,$2,$3,now()+interval '8 hours')",
          [hash(value), user.id, csrf],
        );
        return value;
      },
      true,
    );
    res.cookie("gymflow_session", session, {
      httpOnly: true,
      sameSite: "strict",
      secure,
      path: "/",
      maxAge: 8 * 3600000,
    });
    res.json({ ok: true });
  });
  app.use("/api", async (req, res) => {
    if (!["GET", "POST", "PUT", "DELETE"].includes(req.method))
      fail(405, "Método não permitido.");
    const cookie = (req.get("cookie") || "")
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("gymflow_session="));
    const sessionHash = hash(cookie?.slice("gymflow_session=".length) || "");
    const session = await transaction(
      pool,
      null,
      (db) =>
        one(
          db,
          "SELECT s.csrf,u.id,u.name,u.email,u.phone,u.role,u.active FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires>now() AND u.active",
          [sessionHash],
        ),
      true,
    );
    if (!session) fail(401, "Entre na sua conta para continuar.");
    const user = publicUser(session);
    if (req.method !== "GET" && !same(req.get("x-csrf-token"), session.csrf))
      fail(403, "Sessão inválida. Atualize a página.");
    if (req.path === "/logout" && req.method === "POST") {
      await pool.query("DELETE FROM sessions WHERE token_hash=$1", [
        sessionHash,
      ]);
      res.clearCookie("gymflow_session", {
        httpOnly: true,
        sameSite: "strict",
        secure,
        path: "/",
      });
      res.json({ ok: true });
      return;
    }
    const result = await transaction(pool, user, async (db) => {
      if (req.path === "/state" && req.method === "GET")
        return { ...(await state(db, user, demo)), csrf: session.csrf };
      if (!req.body || typeof req.body !== "object" || Array.isArray(req.body))
        fail(400, "Dados inválidos.");
      return {
        ok: true,
        ...(await mutate(
          db,
          { ...user, session_hash: sessionHash },
          req.method,
          req.path,
          req.body,
        )),
      };
    });
    res.json(result);
  });
  const dist = fileURLToPath(new URL("../dist/", import.meta.url));
  app.use(express.static(dist));
  app.get("/{*path}", (req, res) =>
    res.sendFile(path.join(dist, "index.html")),
  );
  app.use((error, req, res, next) => {
    if (error instanceof AppError)
      return res.status(error.status).json({ error: error.message });
    if (error.type === "entity.parse.failed")
      return res.status(400).json({ error: "JSON inválido." });
    if (error.type === "entity.too.large")
      return res.status(413).json({ error: "Requisição muito grande." });
    if (
      ["23505", "23503", "23514", "22P02", "22003", "42501"].includes(
        error.code,
      )
    )
      return res
        .status(
          error.code === "42501" ? 403 : error.code === "23505" ? 409 : 400,
        )
        .json({
          error:
            error.constraint === "attendance_student_id_day_key"
              ? "O check-in de hoje já foi registrado."
              : error.code === "23505"
                ? "Registro duplicado. Confira os dados."
                : error.code === "42501"
                  ? "Operação não autorizada."
                  : "Dados ou vínculos inválidos. Confira os campos.",
        });
    console.error("Erro interno na operação:", error.code || error.name);
    res
      .status(500)
      .json({ error: "Não foi possível concluir. Tente novamente." });
  });
  return app;
}
