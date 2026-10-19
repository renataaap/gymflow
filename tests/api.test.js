import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { testDatabase } from "../scripts/test-database.js";
import { migrate, transaction, rows, one } from "../server/db.js";
import { seed } from "../server/seed.js";
import { createApp } from "../server/app.js";
import { today } from "../server/security.js";
let db, http, base, admin, teacher, learner, newStudent, newTeacher, newPlan;
class Client {
  constructor() {
    this.cookie = "";
    this.csrf = "";
  }
  async call(path, method = "GET", body, headers = {}) {
    const response = await fetch(base + "/api/" + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        Cookie: this.cookie,
        "X-CSRF-Token": this.csrf,
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const cookie = response.headers.get("set-cookie");
    if (cookie) this.cookie = cookie.split(";")[0];
    return {
      status: response.status,
      data: await response.json(),
      headers: response.headers,
    };
  }
  async login(email = "admin@gymflow.demo", password = "GymFlow@2026!") {
    const r = await this.call("login", "POST", { email, password });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    const s = await this.call("state");
    assert.equal(s.status, 200, JSON.stringify(s.data));
    this.csrf = s.data.csrf;
    return s.data;
  }
}
before(async () => {
  db = await testDatabase();
  await migrate(db.pool);
  await seed(db.pool);
  http = createApp(db.pool, { demo: true, secure: false }).listen(
    0,
    "127.0.0.1",
  );
  await new Promise((resolve) => http.once("listening", resolve));
  base = `http://127.0.0.1:${http.address().port}`;
  admin = new Client();
  teacher = new Client();
  learner = new Client();
  await admin.login();
  await teacher.login("professor1@gymflow.demo");
  await learner.login("aluno1@gymflow.demo");
});
after(async () => {
  if (http) await new Promise((resolve) => http.close(resolve));
  if (db) await db.stop();
});
test("PostgreSQL real, migrações e seed idempotentes", async () => {
  const version = await one(
    db.pool,
    "SELECT version(),rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user",
  );
  assert.match(version.version, /PostgreSQL 18/);
  assert.equal(version.rolsuper, false);
  assert.equal(version.rolbypassrls, false);
  await migrate(db.pool);
  assert.equal(await seed(db.pool), false);
  const s = (await admin.call("state")).data;
  assert.deepEqual(
    ["students", "teachers", "exercises", "workouts", "plans"].map(
      (k) => s[k].length,
    ),
    [15, 3, 30, 10, 3],
  );
  assert.equal(JSON.stringify(s).includes("password_hash"), false);
  assert.equal((await new Client().call("state")).status, 401);
  assert.equal((await new Client().call("health")).data.database, "postgresql");
});
test("Administrador cadastra professor, aluno, plano, assinatura e pagamento", async () => {
  let r = await admin.call("teachers", "POST", {
    name: "Professor Teste",
    email: "prof.teste@gymflow.demo",
    phone: "",
    password: "SenhaTeste12345!",
    specialty: "Força",
    registration: "DEMO-99",
  });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  newTeacher = r.data.id;
  r = await admin.call("students", "POST", {
    name: "Aluno Teste",
    email: "aluno.teste@gymflow.demo",
    phone: "",
    password: "SenhaTeste12345!",
    teacher_id: newTeacher,
    birthday: "2000-01-01",
    objective: "Força",
    consent: true,
  });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  newStudent = r.data.id;
  r = await admin.call("plans", "POST", {
    name: "Plano Teste",
    price: 199.9,
    months: 1,
    description: "Teste",
    benefits: "Treino • Avaliação",
  });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  newPlan = r.data.id;
  r = await admin.call("subscriptions", "POST", {
    student_id: newStudent,
    plan_id: newPlan,
    due: today(),
    amount: 0.01,
  });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  const payment = (await admin.call("state")).data.payments.find(
    (p) => p.student_id === newStudent,
  );
  assert.equal(payment.amount, 199.9);
  r = await admin.call("payments/" + payment.id, "PUT", {
    status: "Pago",
    method: "Dinheiro",
  });
  assert.equal(r.status, 200);
  assert.equal(
    (
      await admin.call("payments/" + payment.id, "PUT", {
        status: "Pago",
        method: "Dinheiro",
      })
    ).status,
    409,
  );
  assert.equal(
    (await admin.call("state")).data.payments.find((p) => p.id === payment.id)
      .status,
    "Pago",
  );
});
test("Professor cria ficha, revisa com snapshot e registra avaliação", async () => {
  const s = (await teacher.call("state")).data,
    sid = s.students[0].id;
  const w = {
    student_id: sid,
    name: "Ficha teste",
    objective: "Força",
    division: "A",
    notes: "Controle",
    exercises: [
      {
        exercise_id: s.exercises[0].id,
        sets: 3,
        reps: "10",
        load: 20,
        rest: 60,
      },
    ],
  };
  let r = await teacher.call("workouts", "POST", w);
  assert.equal(r.status, 200, JSON.stringify(r.data));
  const wid = r.data.id;
  r = await teacher.call("workouts/" + wid, "PUT", {
    ...w,
    name: "Ficha revisada",
    active: true,
  });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  const revised = (await teacher.call("state")).data.workouts.find(
    (w) => w.id === wid,
  );
  assert.equal(revised.versions.length, 1);
  assert.equal(revised.versions[0].snapshot.name, "Ficha teste");
  r = await teacher.call("assessments", "POST", {
    student_id: sid,
    date: today(),
    next_date: today(),
    weight: 75,
    height: 170,
    waist: 80,
    objective: "Força",
    notes: "Acompanhamento fictício",
  });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(
    (await teacher.call("attendance", "POST", { student_id: newStudent }))
      .status,
    403,
  );
});
test("Aluno só recebe seus dados e não consegue alterar o perfil ou cobrar", async () => {
  const s = (await learner.call("state")).data;
  assert.deepEqual(
    s.students.map((v) => v.id),
    [s.user.id],
  );
  assert.equal(s.audit.length, 0);
  assert.equal(s.teachers.length, 0);
  for (const key of [
    "assessments",
    "payments",
    "attendance",
    "workouts",
    "subscriptions",
    "sessions",
  ])
    assert.ok(
      s[key].every((v) => v.student_id === s.user.id),
      key,
    );
  assert.equal(
    (await learner.call("attendance", "POST", { student_id: newStudent }))
      .status,
    403,
  );
  assert.equal(
    (await learner.call("students/" + s.user.id, "PUT", { role: "admin" }))
      .status,
    403,
  );
  assert.equal(
    (await learner.call("plans", "POST", { name: "Ataque" })).status,
    403,
  );
  assert.equal(
    (
      await learner.call("profile", "PUT", {
        name: s.user.name,
        phone: "",
        role: "admin",
      })
    ).status,
    200,
  );
  assert.equal((await learner.call("state")).data.user.role, "student");
});
test("RLS protege consultas diretas e escritas no PostgreSQL com usuário não privilegiado", async () => {
  const u = (await learner.call("state")).data.user;
  assert.deepEqual(await rows(db.pool, "SELECT id FROM assessments"), []);
  await transaction(db.pool, u, async (sql) => {
    const found = await rows(sql, "SELECT student_id FROM assessments");
    assert.ok(found.length > 0);
    assert.ok(found.every((r) => r.student_id === u.id));
    assert.deepEqual(
      await rows(sql, "SELECT * FROM students WHERE user_id=$1", [newStudent]),
      [],
    );
    assert.deepEqual(
      await rows(sql, "SELECT * FROM payments WHERE student_id=$1", [
        newStudent,
      ]),
      [],
    );
  });
  await assert.rejects(
    transaction(db.pool, u, (sql) =>
      sql.query(
        "INSERT INTO attendance(student_id,day,time,actor_id) VALUES($1,$2,$3,$4)",
        [newStudent, today(), "10:00", u.id],
      ),
    ),
    (e) => e.code === "42501",
  );
  const t = (await teacher.call("state")).data.user;
  await transaction(db.pool, t, async (sql) =>
    assert.deepEqual(await rows(sql, "SELECT * FROM payments"), []),
  );
});
test("Aluno conclui treino e histórico mantém execução após revisão", async () => {
  const s = (await learner.call("state")).data,
    w = s.workouts.find((w) => w.active),
    logs = w.exercises.map((e) => ({
      exercise_id: e.exercise_id,
      load: 25,
      reps: 12,
    }));
  assert.equal(
    (
      await learner.call("workout-sessions", "POST", {
        workout_id: w.id,
        logs: logs.slice(1),
      })
    ).status,
    400,
  );
  let r = await learner.call("workout-sessions", "POST", {
    workout_id: w.id,
    logs,
  });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  const sessionId = r.data.id;
  r = await admin.call("workouts/" + w.id, "PUT", {
    ...w,
    name: "Treino atualizado",
    exercises: w.exercises.map((e) => ({ ...e, load: 40 })),
  });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  const session = (await learner.call("state")).data.sessions.find(
    (v) => v.id === sessionId,
  );
  assert.equal(session.logs[0].load, 25);
});
test("Check-in concorrente é único; CSRF e origem externa são bloqueados", async () => {
  const sid = (await learner.call("state")).data.user.id;
  assert.equal(
    (
      await learner.call(
        "attendance",
        "POST",
        { student_id: sid },
        { "X-CSRF-Token": "" },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await learner.call(
        "attendance",
        "POST",
        { student_id: sid },
        { Origin: "https://evil.example" },
      )
    ).status,
    403,
  );
  const calls = await Promise.all([
    learner.call("attendance", "POST", { student_id: sid }),
    learner.call("attendance", "POST", { student_id: sid }),
  ]);
  assert.deepEqual(calls.map((r) => r.status).sort(), [200, 409]);
});
test("Cadastro inválido é revertido e avaliação exige consentimento", async () => {
  const count = (await admin.call("state")).data.students.length;
  const r = await admin.call("students", "POST", {
    name: "Não persiste",
    email: "rollback@gymflow.demo",
    password: "SenhaTeste12345!",
    phone: "",
    teacher_id: 999999,
    objective: "",
    consent: true,
  });
  assert.equal(r.status, 400);
  assert.equal((await admin.call("state")).data.students.length, count);
  await transaction(
    db.pool,
    null,
    (db) =>
      db.query("UPDATE students SET consent=false WHERE user_id=$1", [
        newStudent,
      ]),
    true,
  );
  const a = await admin.call("assessments", "POST", {
    student_id: newStudent,
    date: today(),
    next_date: today(),
    weight: 75,
    height: 170,
    waist: 80,
    objective: "Força",
    notes: "Teste",
  });
  assert.equal(a.status, 400);
});
test("Desativação mantém histórico e revoga sessões; logout encerra acesso", async () => {
  const c = new Client();
  await c.login("aluno.teste@gymflow.demo", "SenhaTeste12345!");
  assert.equal(
    (await admin.call("students/" + newStudent, "DELETE", {})).status,
    200,
  );
  assert.equal((await c.call("state")).status, 401);
  const payment = (await admin.call("state")).data.payments.find(
    (p) => p.student_id === newStudent,
  );
  assert.equal(payment.status, "Pago");
  assert.equal((await learner.call("logout", "POST", {})).status, 200);
  assert.equal((await learner.call("state")).status, 401);
});
test("Pool reconectado encontra dados persistidos e HTTPS emite cookie seguro", async () => {
  const otherPool = (await import("../server/db.js")).createPool(db.url);
  const found = await transaction(
    otherPool,
    null,
    (sql) => one(sql, "SELECT name FROM users WHERE id=$1", [newStudent]),
    true,
  );
  assert.equal(found.name, "Aluno Teste");
  await otherPool.end();
  const secureApp = createApp(db.pool, { demo: true, secure: true }),
    secureHttp = secureApp.listen(0, "127.0.0.1");
  await new Promise((resolve) => secureHttp.once("listening", resolve));
  try {
    const r = await fetch(
      `http://127.0.0.1:${secureHttp.address().port}/api/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@gymflow.demo",
          password: "GymFlow@2026!",
        }),
      },
    );
    assert.equal(r.status, 200);
    const cookie = r.headers.get("set-cookie");
    for (const flag of ["Secure", "HttpOnly", "SameSite=Strict"])
      assert.ok(cookie.includes(flag));
  } finally {
    await new Promise((resolve) => secureHttp.close(resolve));
  }
});

test("Banco PostgreSQL preserva registros após parar e reiniciar o processo", async () => {
  await new Promise((resolve) => http.close(resolve));
  http = null;
  await db.pool.end();
  await db.cluster.stop();
  await db.cluster.start();
  const pool = (await import("../server/db.js")).createPool(db.url);
  try {
    await migrate(pool);
    assert.equal(await seed(pool), false);
    const found = await transaction(
      pool,
      null,
      (sql) =>
        one(sql, "SELECT name,active FROM users WHERE id=$1", [newStudent]),
      true,
    );
    assert.equal(found.name, "Aluno Teste");
    assert.equal(found.active, false);
  } finally {
    await pool.end();
  }
});

test("Base vazia cria administrador próprio sem contas ou senhas demonstrativas", async () => {
  const adminConnection = db.cluster.getPgClient("postgres", "127.0.0.1");
  await adminConnection.connect();
  await adminConnection.query(
    "CREATE DATABASE gymflow_bootstrap OWNER gymflow_app",
  );
  await adminConnection.end();
  const url = new URL(db.url);
  url.pathname = "/gymflow_bootstrap";
  const pool = (await import("../server/db.js")).createPool(url.toString());
  const keys = [
      "INITIAL_ADMIN_NAME",
      "INITIAL_ADMIN_EMAIL",
      "INITIAL_ADMIN_PASSWORD",
    ],
    old = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  try {
    await migrate(pool);
    process.env.INITIAL_ADMIN_NAME = "Gestora Teste";
    process.env.INITIAL_ADMIN_EMAIL = "gestora@example.test";
    process.env.INITIAL_ADMIN_PASSWORD = "SenhaExclusivaTeste123!";
    const { bootstrapAdmin } = await import("../server/bootstrap.js");
    assert.equal(await bootstrapAdmin(pool), true);
    assert.equal(await bootstrapAdmin(pool), false);
    const users = await rows(
      pool,
      "SELECT name,email,role,password_hash FROM users",
    );
    assert.equal(users.length, 1);
    assert.equal(users[0].email, "gestora@example.test");
    assert.equal(users[0].role, "admin");
    assert.equal(
      await (
        await import("../server/security.js")
      ).passwordOK("SenhaExclusivaTeste123!", users[0].password_hash),
      true,
    );
  } finally {
    for (const k of keys)
      if (old[k] === undefined) delete process.env[k];
      else process.env[k] = old[k];
    await pool.end();
  }
});

test("Comando real da hospedagem aplica migrações, lê PORT e encerra com SIGTERM", async () => {
  const { spawn } = await import("node:child_process");
  const { freePort } = await import("../scripts/test-database.js");
  const port = await freePort();
  const child = spawn(process.execPath, ["server/index.js"], {
    cwd: new URL("../", import.meta.url),
    env: {
      ...process.env,
      DATABASE_URL: db.url,
      GYMFLOW_DEMO: "1",
      PORT: String(port),
      NODE_ENV: "production",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let errors = "";
  child.stderr.on("data", (d) => {
    errors += d.toString();
  });
  try {
    let healthy = false;
    for (let n = 0; n < 100; n++) {
      if (child.exitCode !== null)
        throw new Error("Falha de inicialização: " + errors);
      try {
        const r = await fetch(`http://127.0.0.1:${port}/api/health`);
        if (r.ok) {
          assert.equal((await r.json()).database, "postgresql");
          healthy = true;
          break;
        }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.equal(healthy, true);
    const response = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /GymFlow/);
  } finally {
    child.kill("SIGTERM");
    if (child.exitCode === null)
      await new Promise((resolve) => child.once("exit", resolve));
  }
  assert.equal(child.exitCode, 0, errors);
});
