import { rows, one } from "./db.js";
import { today, fail } from "./security.js";
export async function student(db, u, sid) {
  const s = await one(
    db,
    "SELECT s.*,u.active FROM students s JOIN users u ON u.id=s.user_id WHERE s.user_id=$1",
    [sid],
  );
  if (!s) fail(403, "Aluno não encontrado ou fora do seu acesso.");
  return s;
}
export const audit = (db, u, action, entity, eid = null) =>
  db.query(
    "INSERT INTO audit_logs(actor_id,action,entity,entity_id) VALUES($1,$2,$3,$4)",
    [u.id, action, entity, eid],
  );
export async function state(db, u, demo) {
  const students = await rows(
    db,
    `SELECT u.id,u.name,u.email,u.phone,u.active,s.birthday,s.enrollment,s.objective,s.consent,s.teacher_id,t.name teacher,p.name plan,p.id plan_id FROM students s JOIN users u ON u.id=s.user_id JOIN users t ON t.id=s.teacher_id LEFT JOIN subscriptions sub ON sub.student_id=s.user_id AND sub.active LEFT JOIN membership_plans p ON p.id=sub.plan_id ORDER BY s.enrollment DESC`,
  );
  const ids = students.map((s) => s.id);
  const scoped = (table, order = "id DESC") =>
    rows(
      db,
      `SELECT * FROM ${table} WHERE student_id=ANY($1::int[]) ORDER BY ${order}`,
      [ids],
    );
  const workouts = await scoped("workouts");
  for (const w of workouts) {
    w.exercises = await rows(
      db,
      "SELECT we.*,e.name,e.muscle,e.instructions,e.precautions FROM workout_exercises we JOIN exercises e ON e.id=we.exercise_id WHERE workout_id=$1 ORDER BY position",
      [w.id],
    );
    w.versions = await rows(
      db,
      "SELECT id,created,snapshot FROM workout_versions WHERE workout_id=$1 ORDER BY id DESC",
      [w.id],
    );
  }
  const sessions = await scoped("workout_sessions");
  for (const session of sessions)
    session.logs = await rows(
      db,
      "SELECT * FROM workout_logs WHERE session_id=$1 ORDER BY id",
      [session.id],
    );
  const payments = u.role === "teacher" ? [] : await scoped("payments");
  for (const p of payments)
    if (p.status === "Pendente" && p.due < today()) p.status = "Vencido";
  const teachers =
    u.role === "student"
      ? []
      : await rows(
          db,
          `SELECT u.id,u.name,u.email,u.phone,u.active,t.specialty,t.registration FROM teachers t JOIN users u ON u.id=t.user_id${u.role === "teacher" ? " WHERE u.id=$1" : ""} ORDER BY u.id`,
          u.role === "teacher" ? [u.id] : [],
        );
  return {
    user: u,
    students,
    teachers,
    workouts,
    sessions,
    payments,
    assessments: await scoped("assessments", "date DESC,id DESC"),
    attendance: await scoped("attendance", "day DESC,time DESC"),
    subscriptions: await scoped("subscriptions"),
    plans: await rows(db, "SELECT * FROM membership_plans ORDER BY id"),
    exercises: await rows(db, "SELECT * FROM exercises ORDER BY name"),
    settings: await one(db, "SELECT * FROM settings WHERE id=1"),
    notifications: await rows(
      db,
      "SELECT * FROM notifications WHERE user_id=$1 ORDER BY id DESC",
      [u.id],
    ),
    audit:
      u.role === "admin"
        ? await rows(
            db,
            "SELECT a.*,u.name actor FROM audit_logs a JOIN users u ON u.id=a.actor_id ORDER BY a.id DESC LIMIT 100",
          )
        : [],
    today: today(),
    demo,
    integrations: { ai: false, email: false, gateway: false },
  };
}
