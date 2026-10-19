import { one, rows } from "./db.js";
import {
  fail,
  role,
  text,
  number,
  id,
  bool,
  date,
  today,
  clock,
  passwordHash,
  passwordOK,
} from "./security.js";
import { student, audit } from "./state.js";
export async function mutate(db, u, method, path, d) {
  const match = path.match(/^\/([a-z-]+)(?:\/(\d+))?$/);
  if (!match) fail(404, "Operação não encontrada.");
  const entity = match[1];
  let eid = match[2] ? Number(match[2]) : null;
  if (
    (method === "POST" && eid) ||
    (method !== "POST" && entity !== "profile" && entity !== "settings" && !eid)
  )
    fail(400, "Endereço da operação inválido.");
  if (entity === "profile" && method === "PUT") {
    const name = text(d, "name", 2, 100),
      phone = text(d, "phone", 0, 40);
    if (d.new_password) {
      const stored = await one(
        db,
        "SELECT password_hash FROM users WHERE id=$1",
        [u.id],
      );
      if (
        !(await passwordOK(
          text(d, "current_password", 1, 200),
          stored.password_hash,
        ))
      )
        fail(400, "A senha atual está incorreta.");
      await db.query("UPDATE users SET password_hash=$1 WHERE id=$2", [
        await passwordHash(text(d, "new_password", 12, 200)),
        u.id,
      ]);
      await db.query(
        "DELETE FROM sessions WHERE user_id=$1 AND token_hash<>$2",
        [u.id, u.session_hash],
      );
    }
    await db.query("UPDATE users SET name=$1,phone=$2 WHERE id=$3", [
      name,
      phone,
      u.id,
    ]);
    await audit(db, u, "Atualizou perfil", "users", u.id);
    return;
  }
  if (["students", "teachers"].includes(entity)) {
    role(u, "admin");
    const targetRole = entity === "students" ? "student" : "teacher";
    if (
      eid &&
      !(await one(db, "SELECT id FROM users WHERE id=$1 AND role=$2", [
        eid,
        targetRole,
      ]))
    )
      fail(404, "Cadastro não encontrado.");
    if (method === "DELETE") {
      await db.query("UPDATE users SET active=false WHERE id=$1", [eid]);
      await db.query("DELETE FROM sessions WHERE user_id=$1", [eid]);
      await audit(db, u, "Desativou cadastro", entity, eid);
      return;
    }
    if (!["POST", "PUT"].includes(method)) fail(405, "Método não permitido.");
    const name = text(d, "name", 2, 100),
      email = text(d, "email", 3, 200).toLowerCase(),
      phone = text(d, "phone", 0, 40);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      fail(400, "Informe um e-mail válido.");
    let teacherId, birthday, consent, objective, specialty, registration;
    if (targetRole === "student") {
      teacherId = id(d, "teacher_id");
      if (
        !(await one(
          db,
          "SELECT t.user_id FROM teachers t JOIN users u ON u.id=t.user_id WHERE t.user_id=$1 AND u.active",
          [teacherId],
        ))
      )
        fail(400, "Selecione um professor ativo.");
      birthday = d.birthday ? date(d, "birthday") : null;
      if (birthday && birthday > today())
        fail(400, "Nascimento não pode ser no futuro.");
      consent = bool(d, "consent", false);
      objective = text(d, "objective", 0, 1000);
    } else {
      specialty = text(d, "specialty", 2, 200);
      registration = text(d, "registration", 0, 80);
    }
    if (method === "POST") {
      eid = (
        await one(
          db,
          "INSERT INTO users(name,email,password_hash,role,phone) VALUES($1,$2,$3,$4,$5) RETURNING id",
          [
            name,
            email,
            await passwordHash(text(d, "password", 12, 200)),
            targetRole,
            phone,
          ],
        )
      ).id;
      if (targetRole === "student")
        await db.query(
          "INSERT INTO students(user_id,teacher_id,birthday,objective,consent,enrollment) VALUES($1,$2,$3,$4,$5,$6)",
          [eid, teacherId, birthday, objective, consent, today()],
        );
      else
        await db.query("INSERT INTO teachers VALUES($1,$2,$3)", [
          eid,
          specialty,
          registration,
        ]);
    } else {
      const active = bool(d, "active");
      await db.query(
        "UPDATE users SET name=$1,email=$2,phone=$3,active=$4 WHERE id=$5",
        [name, email, phone, active, eid],
      );
      if (!active)
        await db.query("DELETE FROM sessions WHERE user_id=$1", [eid]);
      if (targetRole === "student")
        await db.query(
          "UPDATE students SET teacher_id=$1,birthday=$2,objective=$3,consent=$4 WHERE user_id=$5",
          [teacherId, birthday, objective, consent, eid],
        );
      else
        await db.query(
          "UPDATE teachers SET specialty=$1,registration=$2 WHERE user_id=$3",
          [specialty, registration, eid],
        );
    }
    await audit(db, u, "Salvou cadastro", entity, eid);
    return { id: eid };
  }
  if (["plans", "exercises"].includes(entity)) {
    entity === "plans" ? role(u, "admin") : role(u, "admin", "teacher");
    const table = entity === "plans" ? "membership_plans" : "exercises";
    if (eid && !(await one(db, `SELECT id FROM ${table} WHERE id=$1`, [eid])))
      fail(404, "Registro não encontrado.");
    if (method === "DELETE")
      await db.query(`UPDATE ${table} SET active=false WHERE id=$1`, [eid]);
    else if (["POST", "PUT"].includes(method)) {
      const columns =
        entity === "plans"
          ? ["name", "description", "price", "months", "benefits"]
          : [
              "name",
              "muscle",
              "category",
              "equipment",
              "level",
              "instructions",
              "precautions",
            ];
      const values = columns.map((k) =>
        k === "price"
          ? number(d, k, 0, 100000)
          : k === "months"
            ? number(d, k, 1, 36, true)
            : text(
                {
                  ...d,
                  category: d.category || "Musculação",
                  precautions: d.precautions || "",
                },
                k,
                k === "precautions" ? 0 : 1,
                2000,
              ),
      );
      if (method === "POST")
        eid = (
          await one(
            db,
            `INSERT INTO ${table}(${columns.join(",")}) VALUES(${values.map((_, i) => "$" + (i + 1)).join(",")}) RETURNING id`,
            values,
          )
        ).id;
      else
        await db.query(
          `UPDATE ${table} SET ${[...columns, "active"].map((k, i) => k + "=$" + (i + 1)).join(",")} WHERE id=$${columns.length + 2}`,
          [...values, bool(d, "active"), eid],
        );
    } else fail(405, "Método não permitido.");
    await audit(db, u, "Salvou registro", entity, eid);
    return { id: eid };
  }
  if (entity === "subscriptions" && method === "POST") {
    role(u, "admin");
    const sid = id(d, "student_id");
    const s = await student(db, u, sid);
    if (!s.active) fail(400, "Aluno inativo.");
    await db.query("SELECT user_id FROM students WHERE user_id=$1 FOR UPDATE", [
      sid,
    ]);
    const p = await one(
      db,
      "SELECT * FROM membership_plans WHERE id=$1 AND active",
      [id(d, "plan_id")],
    );
    if (!p) fail(400, "Plano indisponível.");
    await db.query(
      "UPDATE subscriptions SET active=false WHERE student_id=$1 AND active",
      [sid],
    );
    eid = (
      await one(
        db,
        "INSERT INTO subscriptions(student_id,plan_id,start) VALUES($1,$2,$3) RETURNING id",
        [sid, p.id, today()],
      )
    ).id;
    await db.query(
      "INSERT INTO payments(student_id,subscription_id,amount,due) VALUES($1,$2,$3,$4)",
      [sid, eid, p.price, date(d, "due")],
    );
    await audit(db, u, "Vinculou plano e gerou cobrança", entity, eid);
    return { id: eid };
  }
  if (entity === "payments") {
    role(u, "admin");
    if (method === "POST") {
      const sid = id(d, "student_id");
      await student(db, u, sid);
      const sub = await one(
        db,
        "SELECT s.id,p.price FROM subscriptions s JOIN membership_plans p ON p.id=s.plan_id WHERE s.student_id=$1 AND s.active",
        [sid],
      );
      if (!sub) fail(400, "Vincule um plano antes de gerar a cobrança.");
      eid = (
        await one(
          db,
          "INSERT INTO payments(student_id,subscription_id,amount,due) VALUES($1,$2,$3,$4) RETURNING id",
          [sid, sub.id, sub.price, date(d, "due")],
        )
      ).id;
    } else if (method === "PUT") {
      const payment = await one(
        db,
        "SELECT * FROM payments WHERE id=$1 FOR UPDATE",
        [eid],
      );
      if (!payment) fail(404, "Cobrança não encontrada.");
      if (payment.status !== "Pendente")
        fail(409, "A cobrança já foi paga ou cancelada.");
      const status = text(d, "status");
      if (!["Pago", "Cancelado"].includes(status))
        fail(400, "Status inválido.");
      await db.query(
        "UPDATE payments SET status=$1,paid_at=$2,method=$3 WHERE id=$4",
        [
          status,
          status === "Pago" ? new Date() : null,
          status === "Pago" ? text(d, "method", 1, 80) : "",
          eid,
        ],
      );
    } else fail(405, "Método não permitido.");
    await audit(db, u, "Atualizou cobrança (registro manual)", entity, eid);
    return { id: eid };
  }
  if (entity === "attendance" && method === "POST") {
    const sid = id(d, "student_id");
    const s = await student(db, u, sid);
    if (!s.active) fail(400, "Aluno inativo.");
    eid = (
      await one(
        db,
        "INSERT INTO attendance(student_id,day,time,actor_id) VALUES($1,$2,$3,$4) RETURNING id",
        [sid, today(), clock(), u.id],
      )
    ).id;
    await audit(db, u, "Registrou check-in", entity, eid);
    return { id: eid };
  }
  if (entity === "workouts") {
    role(u, "admin", "teacher");
    let old;
    if (eid) {
      await db.query("SELECT pg_advisory_xact_lock(67492013,$1)", [eid]);
      old = await one(db, "SELECT * FROM workouts WHERE id=$1 FOR UPDATE", [
        eid,
      ]);
      if (!old) fail(403, "Treino não encontrado ou fora do seu acesso.");
      await student(db, u, old.student_id);
    }
    if (method === "DELETE") {
      await db.query("UPDATE workouts SET active=false WHERE id=$1", [eid]);
      await audit(db, u, "Desativou treino", entity, eid);
      return;
    }
    if (!["POST", "PUT"].includes(method)) fail(405, "Método não permitido.");
    const sid = id(d, "student_id"),
      s = await student(db, u, sid);
    if (!s.active) fail(400, "Aluno inativo.");
    if (old && sid !== old.student_id)
      fail(400, "O aluno de uma ficha existente não pode ser alterado.");
    const division = text(d, "division", 1, 1).toUpperCase();
    if (!"ABCDEFG".includes(division)) fail(400, "Divisão inválida.");
    const ex = d.exercises;
    if (!Array.isArray(ex) || ex.length < 1 || ex.length > 40)
      fail(400, "Adicione entre 1 e 40 exercícios.");
    const configured = [];
    for (const [pos, e] of ex.entries()) {
      const exid = id(e, "exercise_id");
      if (
        !(await one(db, "SELECT id FROM exercises WHERE id=$1 AND active", [
          exid,
        ]))
      )
        fail(400, "Exercício indisponível.");
      configured.push([
        exid,
        pos,
        number(e, "sets", 1, 20, true),
        text(e, "reps", 1, 30),
        number(e, "load", 0, 1000),
        number(e, "rest", 0, 1800, true),
      ]);
    }
    const values = [
      sid,
      u.id,
      text(d, "name", 2, 100),
      text(d, "objective", 2, 1000),
      division,
      text(d, "notes", 0, 3000),
    ];
    if (method === "POST")
      eid = (
        await one(
          db,
          "INSERT INTO workouts(student_id,teacher_id,name,objective,division,notes) VALUES($1,$2,$3,$4,$5,$6) RETURNING id",
          values,
        )
      ).id;
    else {
      old.exercises = await rows(
        db,
        "SELECT we.*,e.name FROM workout_exercises we JOIN exercises e ON e.id=we.exercise_id WHERE workout_id=$1 ORDER BY position",
        [eid],
      );
      await db.query(
        "INSERT INTO workout_versions(workout_id,snapshot) VALUES($1,$2)",
        [eid, JSON.stringify(old)],
      );
      await db.query(
        "UPDATE workouts SET student_id=$1,teacher_id=$2,name=$3,objective=$4,division=$5,notes=$6,active=$7,updated=now() WHERE id=$8",
        [...values, bool(d, "active"), eid],
      );
      await db.query("DELETE FROM workout_exercises WHERE workout_id=$1", [
        eid,
      ]);
    }
    for (const e of configured)
      await db.query(
        "INSERT INTO workout_exercises(workout_id,exercise_id,position,sets,reps,load,rest) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [eid, ...e],
      );
    await audit(db, u, "Salvou ficha", entity, eid);
    return { id: eid };
  }
  if (entity === "assessments") {
    role(u, "admin", "teacher");
    if (!["POST", "PUT"].includes(method))
      fail(
        405,
        "Avaliações históricas são preservadas. Registre uma correção.",
      );
    if (eid) {
      const old = await one(db, "SELECT * FROM assessments WHERE id=$1", [eid]);
      if (!old) fail(403, "Avaliação não encontrada ou fora do seu acesso.");
      if (old.student_id !== id(d, "student_id"))
        fail(400, "O aluno não pode ser alterado.");
    }
    const sid = id(d, "student_id"),
      s = await student(db, u, sid);
    if (!s.consent)
      fail(
        400,
        "Registre a autorização para dados de avaliação no cadastro do aluno.",
      );
    const at = date(d, "date"),
      next = date(d, "next_date");
    if (at > today() || next < at)
      fail(400, "Confira as datas da avaliação e da reavaliação.");
    const columns = [
      "student_id",
      "teacher_id",
      "date",
      "weight",
      "height",
      "waist",
      "notes",
      "objective",
      "next_date",
    ];
    const values = [
      sid,
      u.id,
      at,
      number(d, "weight", 10, 500),
      number(d, "height", 50, 250),
      number(d, "waist", 20, 300),
      text(d, "notes", 1, 5000),
      text(d, "objective", 1, 2000),
      next,
    ];
    if (method === "POST")
      eid = (
        await one(
          db,
          `INSERT INTO assessments(${columns}) VALUES(${values.map((_, i) => "$" + (i + 1))}) RETURNING id`,
          values,
        )
      ).id;
    else
      await db.query(
        `UPDATE assessments SET ${columns.map((k, i) => k + "=$" + (i + 1))} WHERE id=$10`,
        [...values, eid],
      );
    await audit(db, u, "Salvou avaliação", entity, eid);
    return { id: eid };
  }
  if (entity === "workout-sessions" && method === "POST") {
    role(u, "student");
    const wid = id(d, "workout_id");
    await db.query("SELECT pg_advisory_xact_lock(67492013,$1)", [wid]);
    const w = await one(db, "SELECT * FROM workouts WHERE id=$1 AND active", [
      wid,
    ]);
    if (!w) fail(403, "Treino indisponível ou fora do seu acesso.");
    await student(db, u, w.student_id);
    const ex = await rows(
      db,
      "SELECT we.*,e.name FROM workout_exercises we JOIN exercises e ON e.id=we.exercise_id WHERE workout_id=$1 ORDER BY position",
      [wid],
    );
    const logs = d.logs;
    if (
      !Array.isArray(logs) ||
      logs.length !== ex.length ||
      !logs.every((l, i) => Number(l.exercise_id) === ex[i].exercise_id)
    )
      fail(
        400,
        "Registre todos os exercícios da ficha atual antes de concluir.",
      );
    eid = (
      await one(
        db,
        "INSERT INTO workout_sessions(workout_id,student_id) VALUES($1,$2) RETURNING id",
        [wid, u.id],
      )
    ).id;
    for (const [i, l] of logs.entries())
      await db.query(
        "INSERT INTO workout_logs(session_id,exercise_id,name,sets,reps,load) VALUES($1,$2,$3,$4,$5,$6)",
        [
          eid,
          ex[i].exercise_id,
          ex[i].name,
          ex[i].sets,
          number(l, "reps", 1, 500, true),
          number(l, "load", 0, 1000),
        ],
      );
    await audit(db, u, "Concluiu treino", "workout_sessions", eid);
    return { id: eid };
  }
  if (entity === "settings" && method === "PUT") {
    role(u, "admin");
    await db.query(
      "UPDATE settings SET gym_name=$1,phone=$2,address=$3 WHERE id=1",
      [
        text(d, "gym_name", 2, 100),
        text(d, "phone", 0, 40),
        text(d, "address", 0, 500),
      ],
    );
    await audit(db, u, "Atualizou configurações", entity, 1);
    return;
  }
  fail(404, "Operação não encontrada.");
}
