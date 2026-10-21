import { useEffect, useState } from "react";
import { Plus, X, ShieldCheck } from "lucide-react";
import type { State, EditorSpec, Workout } from "./types";
import { Modal, Field, Button, money } from "./ui";
export type Save = (
  path: string,
  method: string,
  data: unknown,
) => Promise<void>;
const titles: Record<string, string> = {
  students: "aluno",
  teachers: "professor",
  exercises: "exercício",
  plans: "plano",
  workouts: "ficha de treino",
  assessments: "avaliação",
  subscriptions: "assinatura",
  payments: "cobrança",
  attendance: "check-in",
  profile: "perfil",
  settings: "configuração",
};
export function Editor({
  spec,
  state: s,
  save,
  close,
}: {
  spec: EditorSpec;
  state: State;
  save: Save;
  close: () => void;
}) {
  const source = {
    students: s.students,
    teachers: s.teachers,
    exercises: s.exercises,
    workouts: s.workouts,
    assessments: s.assessments,
    plans: s.plans,
    payments: s.payments,
  }[spec.entity as "students"] as unknown as
    Record<string, unknown>[] | undefined;
  const record =
    spec.entity === "profile"
      ? s.user
      : spec.entity === "settings"
        ? s.settings
        : source?.find((v) => v.id === spec.id) || {};
  const [v, setV] = useState<Record<string, string | boolean>>(() => {
    const values: Record<string, string | boolean> = {
      phone: "",
      notes: "",
      objective: "",
      precautions: "",
      registration: "",
      description: "",
      benefits: "",
      category: "Musculação",
      level: "Iniciante",
      consent: false,
      active: true,
      division: "A",
      months: "1",
      date: s.today,
      next_date: s.today,
      due: s.today,
      student_id: spec.studentId
        ? String(spec.studentId)
        : s.user.role === "student"
          ? String(s.user.id)
          : "",
    };
    for (const [k, val] of Object.entries(record))
      if (
        typeof val === "boolean" ||
        typeof val === "string" ||
        typeof val === "number"
      )
        values[k] = typeof val === "boolean" ? val : String(val);
    return values;
  });
  const [exercises, setExercises] = useState(() => {
    const w = s.workouts.find((w) => w.id === spec.id);
    return (
      w?.exercises.map((e) => ({
        exercise_id: e.exercise_id,
        sets: String(e.sets),
        reps: e.reps,
        load: String(e.load),
        rest: String(e.rest),
      })) || []
    );
  });
  const [pick, setPick] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const set = (k: string, value: string | boolean) =>
    setV((old) => ({ ...old, [k]: value }));
  const field = (
    label: string,
    name: string,
    type = "text",
    required = true,
    full = false,
  ) => (
    <Field
      key={name}
      label={label}
      name={name}
      value={String(v[name] ?? "")}
      type={type}
      required={required}
      full={full}
      onChange={(value) => set(name, value)}
    />
  );
  const select = (
    label: string,
    name: string,
    options: { value: string | number; label: string }[],
    full = false,
  ) => (
    <Field
      key={name}
      label={label}
      name={name}
      value={String(v[name] ?? "")}
      options={options}
      onChange={(value) => set(name, value)}
      full={full}
    />
  );
  const student = () =>
    select(
      "Aluno",
      "student_id",
      s.students
        .filter((st) => st.active || st.id === Number(v.student_id))
        .map((st) => ({ value: st.id, label: st.name })),
    );
  const active = () =>
    spec.id
      ? select("Situação", "active", [
          { value: "true", label: "Ativo" },
          { value: "false", label: "Inativo" },
        ])
      : null;
  let body;
  if (["students", "teachers"].includes(spec.entity))
    body = (
      <>
        {field("Nome completo", "name")}
        {field("E-mail de acesso", "email", "email")}
        {field("Telefone", "phone", "tel", false)}
        {!spec.id
          ? field(
              "Senha inicial · mínimo de 12 caracteres",
              "password",
              "password",
            )
          : active()}
        {spec.entity === "teachers" ? (
          <>
            {field("Especialidade", "specialty")}
            {field("Registro profissional", "registration", "text", false)}
          </>
        ) : (
          <>
            {field("Nascimento", "birthday", "date", false)}
            {select(
              "Professor responsável",
              "teacher_id",
              s.teachers
                .filter((t) => t.active)
                .map((t) => ({ value: t.id, label: t.name })),
            )}
            {field("Objetivo do aluno", "objective", "textarea", false, true)}
            <div className="field full">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="consent"
                  checked={Boolean(v.consent)}
                  onChange={(e) => set("consent", e.target.checked)}
                />
                <span>
                  Autorização para dados de avaliação obtida do aluno e
                  registrada.
                </span>
              </label>
            </div>
          </>
        )}
      </>
    );
  if (spec.entity === "plans")
    body = (
      <>
        {field("Nome do plano", "name")}
        {field("Valor por período (R$)", "price", "number")}
        {field("Periodicidade em meses", "months", "number")}
        {active()}
        {field("Descrição", "description", "textarea", true, true)}
        {field("Benefícios · separe por •", "benefits", "textarea", true, true)}
      </>
    );
  if (spec.entity === "exercises")
    body = (
      <>
        {field("Nome", "name")}
        {field("Grupo muscular", "muscle")}
        {field("Categoria", "category")}
        {field("Equipamento", "equipment")}
        {select(
          "Nível",
          "level",
          ["Iniciante", "Intermediário", "Avançado"].map((v) => ({
            value: v,
            label: v,
          })),
        )}
        {active()}
        {field(
          "Instruções de execução",
          "instructions",
          "textarea",
          true,
          true,
        )}
        {field("Cuidados gerais", "precautions", "textarea", false, true)}
      </>
    );
  if (spec.entity === "subscriptions")
    body = (
      <>
        {student()}
        {select(
          "Plano",
          "plan_id",
          s.plans
            .filter((p) => p.active)
            .map((p) => ({
              value: p.id,
              label: `${p.name} · ${money(p.price)} / ${p.months} mês(es)`,
            })),
        )}
        {field("Vencimento da primeira cobrança", "due", "date")}
        <div className="banner field full">
          <ShieldCheck />O valor vem do plano no banco. A assinatura anterior
          será encerrada e a primeira cobrança será gerada.
        </div>
      </>
    );
  if (spec.entity === "attendance")
    body = (
      <>
        {student()}
        <div className="banner field full">
          <ShieldCheck />A data e a hora vêm do servidor. Um check-in por aluno
          por dia.
        </div>
      </>
    );
  if (spec.entity === "payments")
    body = spec.id ? (
      <>
        <div className="banner field full">
          {spec.paymentAction === "Cancelado"
            ? "A cobrança será preservada como Cancelado."
            : "Confira o recebimento antes de confirmar. Este é um registro manual, sem confirmação de gateway."}
        </div>
        {spec.paymentAction !== "Cancelado" &&
          select(
            "Forma de recebimento",
            "method",
            [
              "Pix conferido manualmente",
              "Dinheiro",
              "Cartão conferido manualmente",
              "Transferência conferida manualmente",
            ].map((v) => ({ value: v, label: v })),
          )}
      </>
    ) : (
      <>
        {student()}
        {field("Vencimento", "due", "date")}
        <p className="muted">
          O valor será calculado pelo plano ativo do aluno.
        </p>
      </>
    );
  if (spec.entity === "assessments")
    body = (
      <>
        {student()}
        {field("Data da avaliação", "date", "date")}
        {field("Peso (kg)", "weight", "number")}
        {field("Altura (cm)", "height", "number")}
        {field("Cintura (cm)", "waist", "number")}
        {field("Próxima avaliação", "next_date", "date")}
        {field(
          "Objetivos definidos com o aluno",
          "objective",
          "textarea",
          true,
          true,
        )}
        {field("Observações profissionais", "notes", "textarea", true, true)}
        <p className="muted field full">
          A autorização deve estar registrada no cadastro do aluno.
        </p>
      </>
    );
  if (spec.entity === "workouts")
    body = (
      <>
        <div className="form-section">01 · Aluno e objetivo</div>
        {student()}
        {field("Nome do treino", "name")}
        {select(
          "Divisão",
          "division",
          "ABCDEFG".split("").map((c) => ({ value: c, label: "Ficha " + c })),
        )}
        {active()}
        {field("Objetivo", "objective", "textarea", true, true)}
        {field("Orientações", "notes", "textarea", false, true)}
        <div className="form-section">02 · Exercícios</div>
        <div className="field full">
          <div className="row">
            <select
              aria-label="Selecionar exercício"
              value={pick}
              onChange={(e) => setPick(e.target.value)}
              style={{ flex: 1 }}
            >
              <option value="">Selecione um exercício…</option>
              {s.exercises
                .filter((e) => e.active)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} · {e.muscle}
                  </option>
                ))}
            </select>
            <Button
              onClick={() => {
                if (pick) {
                  setExercises([
                    ...exercises,
                    {
                      exercise_id: Number(pick),
                      sets: "3",
                      reps: "12",
                      load: "0",
                      rest: "60",
                    },
                  ]);
                  setPick("");
                }
              }}
            >
              <Plus />
              Adicionar
            </Button>
          </div>
          {exercises.map((ex, i) => (
            <div className="exercise-builder" key={i}>
              <div className="between">
                <strong>
                  {i + 1}.{" "}
                  {s.exercises.find((e) => e.id === ex.exercise_id)?.name}
                </strong>
                <button
                  className="icon-button"
                  type="button"
                  aria-label="Remover exercício"
                  onClick={() =>
                    setExercises(exercises.filter((_, pos) => i !== pos))
                  }
                >
                  <X />
                </button>
              </div>
              <div className="form-grid">
                {(["sets", "reps", "load", "rest"] as const).map((k, j) => (
                  <Field
                    key={k}
                    label={
                      ["Séries", "Repetições", "Carga (kg)", "Descanso (seg.)"][
                        j
                      ]
                    }
                    name={k}
                    value={ex[k]}
                    type={k === "reps" ? "text" : "number"}
                    onChange={(value) =>
                      setExercises(
                        exercises.map((item, pos) =>
                          pos === i ? { ...item, [k]: value } : item,
                        ),
                      )
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </>
    );
  if (spec.entity === "profile")
    body = (
      <>
        {field("Nome completo", "name")}
        {field("Telefone", "phone", "tel", false)}
        <div className="form-section">Alterar senha (opcional)</div>
        {field("Senha atual", "current_password", "password", false)}
        {field(
          "Nova senha · mínimo de 12 caracteres",
          "new_password",
          "password",
          false,
        )}
      </>
    );
  if (spec.entity === "settings")
    body = (
      <>
        {field("Nome da academia", "gym_name")}
        {field("Telefone", "phone", "tel", false)}
        {field("Endereço", "address", "text", false, true)}
      </>
    );
  return (
    <Modal
      title={
        spec.entity === "payments" && spec.id
          ? "Registrar pagamento"
          : `${spec.id ? "Editar" : "Novo"} ${titles[spec.entity]}`
      }
      subtitle={
        spec.entity === "workouts"
          ? "Selecione exercícios e configure a ficha. Cada atualização preserva uma versão."
          : "Preencha os dados. As operações serão validadas no servidor."
      }
      close={close}
      wide={spec.entity === "workouts"}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const data: Record<string, unknown> = { ...v };
            if (["true", "false"].includes(String(v.active)))
              data.active = String(v.active) === "true";
            if (spec.entity === "workouts") data.exercises = exercises;
            if (spec.entity === "payments" && spec.id)
              data.status = spec.paymentAction || "Pago";
            await save(
              spec.entity + (spec.id ? "/" + spec.id : ""),
              spec.id || ["profile", "settings"].includes(spec.entity)
                ? "PUT"
                : "POST",
              data,
            );
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="modal-content">
          <div className="form-grid">{body}</div>
          <div className="error-message" role="alert">
            {error}
          </div>
        </div>
        <footer className="modal-footer">
          <Button onClick={close}>Cancelar</Button>
          <Button type="submit" primary disabled={busy}>
            {busy
              ? "Salvando…"
              : spec.entity === "subscriptions"
                ? "Vincular e gerar cobrança"
                : spec.entity === "attendance"
                  ? "Registrar presença"
                  : spec.entity === "workouts"
                    ? "Salvar ficha"
                    : "Salvar"}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
export function RunWorkout({
  workout: w,
  save,
  close,
  userId,
}: {
  workout: Workout;
  save: Save;
  close: () => void;
  userId: number;
}) {
  const key = `gymflow-${userId}-${w.id}-${w.updated}`;
  const [logs, setLogs] = useState(() => {
    try {
      const draft = JSON.parse(sessionStorage.getItem(key) || "null");
      if (Array.isArray(draft) && draft.length === w.exercises.length && draft.every((row, i) => row.exercise_id === w.exercises[i].exercise_id))
        return draft as {
          exercise_id: number;
          load: string;
          reps: string;
          done: boolean;
        }[];
    } catch {}
    return w.exercises.map((e) => ({
      exercise_id: e.exercise_id,
      load: String(e.load),
      reps: String(parseInt(e.reps) || 12),
      done: false,
    }));
  });
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const update = (index: number, value: Partial<(typeof logs)[number]>) => {
    const next = logs.map((l, i) => (i === index ? { ...l, ...value } : l));
    setLogs(next);
    sessionStorage.setItem(key, JSON.stringify(next));
  };
  const [resumed] = useState(() => {
    try { const draft = JSON.parse(sessionStorage.getItem(key) || "null"); return Array.isArray(draft) && draft.length === w.exercises.length && draft.every((row, i) => row.exercise_id === w.exercises[i].exercise_id); } catch { return false; }
  });
  const [rest, setRest] = useState<{name: string; remaining: number; deadline: number | null} | null>(null);
  useEffect(() => {
    if (!rest?.deadline) return;
    const deadline = rest.deadline;
    const tick = () => setRest(current => current?.deadline === deadline ? {...current, remaining: Math.max(0, Math.ceil((deadline-Date.now())/1000)), deadline: deadline <= Date.now() ? null : deadline} : current);
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [rest?.deadline]);
  const count = logs.filter((l) => l.done).length;
  return (
    <Modal
      title={w.name}
      subtitle={`Ficha ${w.division} · Registre o que você realizou.`}
      close={close}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (logs.some((l) => !l.done)) {
            setError(
              "Marque todos os exercícios realizados antes de concluir.",
            );
            return;
          }
          setBusy(true);
          try {
            await save("workout-sessions", "POST", { workout_id: w.id, logs });
            sessionStorage.removeItem(key);
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="modal-content">
          <div className="between">
            <BadgeCount value={`${count} de ${logs.length} exercícios`} />
          </div>
          <div className="progress-track">
            <span style={{ width: `${logs.length ? (count / logs.length) * 100 : 0}%` }} />
          </div>
          {rest && <section className="rest-panel" aria-label="Cronômetro de descanso">
            <div><p role="status">{rest.remaining === 0 ? "Descanso concluído. Pronto para a próxima série." : 'Descanso · '+rest.name}</p>
              <strong role="timer" className="number">{String(Math.floor(rest.remaining/60)).padStart(2,'0')}:{String(rest.remaining%60).padStart(2,'0')}</strong>
            </div>
            <div className="row">
              <Button disabled={rest.remaining===0} onClick={() => setRest(current => current ? {...current, remaining: current.deadline ? Math.max(0,Math.ceil((current.deadline-Date.now())/1000)) : current.remaining, deadline: current.deadline ? null : Date.now()+current.remaining*1000} : null)}>{rest.deadline ? "Pausar" : "Continuar"}</Button>
              <Button onClick={() => setRest(null)}>Encerrar</Button>
            </div>
          </section>}
          {resumed && <p className="draft-notice">Rascunho retomado: seus registros desta aba foram recuperados.</p>}
          {w.exercises.map((ex, i) => (
            <div className={"exercise-run"+(logs[i].done ? " completed" : "")} key={ex.exercise_id}>
              <h3>
                {i + 1}. {ex.name}
              </h3>
              <small className="dim">
                {ex.sets} séries · {ex.reps} repetições sugeridas · {ex.rest}s
                de descanso
              </small>
              <p>{ex.instructions}</p>
              {ex.rest > 0 && <Button onClick={() => setRest({name: ex.name, remaining: ex.rest, deadline: Date.now()+ex.rest*1000})}>Descansar {ex.rest}s</Button>}
              <div className="form-grid">
                <Field
                  label="Carga realizada (kg)"
                  name="load"
                  type="number"
                  value={logs[i].load}
                  onChange={(v) => update(i, { load: v })}
                />
                <Field
                  label="Repetições por série"
                  name="reps"
                  type="number"
                  value={logs[i].reps}
                  onChange={(v) => update(i, { reps: v })}
                />
                <label className="checkbox-label check">
                  <input
                    type="checkbox"
                    checked={logs[i].done}
                    onChange={(e) => update(i, { done: e.target.checked })}
                  />
                  Realizado
                </label>
              </div>
            </div>
          ))}
          <div className="error-message" role="alert">
            {error}
          </div>
        </div>
        <footer className="modal-footer">
          <Button onClick={close}>Continuar depois</Button>
          <Button type="submit" primary disabled={busy}>
            Concluir treino
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
function BadgeCount({ value }: { value: string }) {
  return <span className="badge">{value}</span>;
}
