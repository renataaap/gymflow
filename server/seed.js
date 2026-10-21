import { transaction, one } from "./db.js";
import { passwordHash, today } from "./security.js";
const dayAgo = (n) => {
  const d = new Date(today() + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};
export async function seed(pool) {
  const pwd = await passwordHash("GymFlow@2026!");
  return transaction(
    pool,
    null,
    async (db) => {
      await db.query("SELECT pg_advisory_xact_lock(67492012)");
      if (await one(db, "SELECT id FROM users LIMIT 1")) return false;
      const makeUser = async (name, email, role, active = true) =>
        (
          await one(
            db,
            "INSERT INTO users(name,email,password_hash,role,active,phone) VALUES($1,$2,$3,$4,$5,$6) RETURNING id",
            [name, email, pwd, role, active, "(11) 90000-0000"],
          )
        ).id;
      const admin = await makeUser(
        "Administrador Demo",
        "admin@gymflow.demo",
        "admin",
      );
      const teachers = [];
      for (const [i, name] of [
        "Rafael Costa",
        "Camila Duarte",
        "Lucas Mendes",
      ].entries()) {
        const uid = await makeUser(
          name,
          `professor${i + 1}@gymflow.demo`,
          "teacher",
        );
        teachers.push(uid);
        await db.query("INSERT INTO teachers VALUES($1,$2,$3)", [
          uid,
          [
            "Musculação e força",
            "Condicionamento funcional",
            "Mobilidade e performance",
          ][i],
          `DEMO-${i + 1}`,
        ]);
      }
      const plans = [];
      for (const p of [
        [
          "Essencial",
          "Sua rotina, no seu ritmo",
          119.9,
          "Musculação • Acesso livre",
        ],
        [
          "Performance",
          "Mais possibilidades para evoluir",
          179.9,
          "Musculação • Aulas coletivas • Avaliação",
        ],
        [
          "Black",
          "Uma experiência completa",
          239.9,
          "Todas as modalidades • Acompanhamento individual",
        ],
      ]) {
        plans.push(
          await one(
            db,
            "INSERT INTO membership_plans(name,description,price,months,benefits) VALUES($1,$2,$3,1,$4) RETURNING id,price",
            p,
          ),
        );
      }
      const students = [];
      for (const [i, name] of [
        "Mariana Alves",
        "Pedro Santos",
        "Julia Ribeiro",
        "Gabriel Lima",
        "Beatriz Oliveira",
        "Felipe Rocha",
        "Isabela Martins",
        "Bruno Ferreira",
        "Larissa Gomes",
        "Thiago Barbosa",
        "Ana Cardoso",
        "Matheus Nunes",
        "Carolina Dias",
        "André Teixeira",
        "Sofia Azevedo",
      ].entries()) {
        const uid = await makeUser(
          name,
          `aluno${i + 1}@gymflow.demo`,
          "student",
          i !== 14,
        );
        students.push(uid);
        const teacher = teachers[i % 3],
          p = plans[i % 3];
        await db.query(
          "INSERT INTO students(user_id,teacher_id,birthday,enrollment,objective,consent) VALUES($1,$2,$3,$4,$5,true)",
          [
            uid,
            teacher,
            "1995-05-12",
            dayAgo(180 - i * 9),
            "Condicionamento e força",
          ],
        );
        const sub = await one(
          db,
          "INSERT INTO subscriptions(student_id,plan_id,start) VALUES($1,$2,$3) RETURNING id",
          [uid, p.id, dayAgo(180 - i * 9)],
        );
        for (let m = 0; m < 6; m++) {
          const d = new Date(today() + "T12:00:00Z");
          d.setUTCDate(10);
          d.setUTCMonth(d.getUTCMonth() - m);
          const due = d.toISOString().slice(0, 10),
            paid = m > 0 || i % 4 !== 0;
          await db.query(
            "INSERT INTO payments(student_id,subscription_id,amount,due,status,paid_at,method) VALUES($1,$2,$3,$4,$5,$6,$7)",
            [
              uid,
              sub.id,
              p.price,
              due,
              paid ? "Pago" : "Pendente",
              paid ? due + "T13:00:00Z" : null,
              paid ? "Registro demonstrativo" : "",
            ],
          );
        }
        for (let n = 0; n < 28; n++)
          if ((n + i) % 4 !== 0)
            await db.query(
              "INSERT INTO attendance(student_id,day,time,actor_id) VALUES($1,$2,$3,$4)",
              [
                uid,
                dayAgo(n),
                `${String(6 + (i % 13)).padStart(2, "0")}:30`,
                admin,
              ],
            );
        for (const days of [60, 30, 0])
          await db.query(
            "INSERT INTO assessments(student_id,teacher_id,date,weight,height,waist,notes,objective,next_date) VALUES($1,$2,$3,$4,170,80,$5,$6,$7)",
            [
              uid,
              teacher,
              dayAgo(days),
              72 + i / 2 + days / 30,
              "Registro fictício para demonstração.",
              "Acompanhar medidas definidas com o aluno",
              dayAgo(days - 30),
            ],
          );
      }
      const ex = [];
      const names = [
        "Supino reto",
        "Agachamento livre",
        "Puxada frontal",
        "Remada baixa",
        "Leg press 45°",
        "Desenvolvimento com halteres",
        "Rosca direta",
        "Tríceps na polia",
        "Prancha",
        "Elevação lateral",
        "Cadeira extensora",
        "Mesa flexora",
        "Stiff",
        "Elevação pélvica",
        "Panturrilha em pé",
        "Supino inclinado",
        "Crucifixo",
        "Remada unilateral",
        "Pulldown",
        "Rosca martelo",
        "Tríceps francês",
        "Abdominal no solo",
        "Afundo",
        "Agachamento goblet",
        "Flexão de braços",
        "Bicicleta ergométrica",
        "Esteira",
        "Mobilidade de quadril",
        "Face pull",
        "Elevação de joelhos",
      ];
      const muscle = [
        "Peitoral",
        "Pernas",
        "Costas",
        "Costas",
        "Pernas",
        "Ombros",
        "Bíceps",
        "Tríceps",
        "Core",
        "Ombros",
        "Pernas",
        "Pernas",
        "Posteriores",
        "Glúteos",
        "Panturrilhas",
      ];
      for (const [i, name] of names.entries())
        ex.push(
          (
            await one(
              db,
              "INSERT INTO exercises(name,muscle,equipment,level,instructions,precautions) VALUES($1,$2,$3,$4,$5,$6) RETURNING id",
              [
                name,
                muscle[i % 15],
                ["Halteres", "Barra", "Máquina", "Peso corporal"][i % 4],
                i % 2 ? "Intermediário" : "Iniciante",
                "Ajuste a posição inicial e execute de forma controlada, mantendo a postura orientada pelo professor.",
                "Solicite orientação para ajustar a execução e interrompa em caso de dor.",
              ],
            )
          ).id,
        );
      for (let i = 0; i < 10; i++) {
        const w = await one(
          db,
          "INSERT INTO workouts(student_id,teacher_id,name,objective,division,notes) VALUES($1,$2,$3,$4,$5,$6) RETURNING id",
          [
            students[i],
            teachers[i % 3],
            [
              "Força e condicionamento",
              "Membros inferiores",
              "Superiores e core",
            ][i % 3],
            "Condicionamento e força",
            "ABC"[i % 3],
            "Respeite o descanso e registre suas cargas.",
          ],
        );
        for (const [position, index] of [
          i % 4,
          4 + (i % 5),
          8,
          9 + (i % 5),
        ].entries())
          await db.query(
            "INSERT INTO workout_exercises(workout_id,exercise_id,position,sets,reps,load,rest) VALUES($1,$2,$3,3,$4,20,60)",
            [w.id, ex[index], position, "12"],
          );
      }
      await db.query("INSERT INTO notifications(user_id,title) VALUES($1,$2)", [
        admin,
        "Bem-vindo ao GymFlow. Esta base contém apenas dados fictícios.",
      ]);
      return true;
    },
    true,
  );
}
