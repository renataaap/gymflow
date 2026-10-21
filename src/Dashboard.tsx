import { useState } from "react";
import {
  Users,
  Wallet,
  CreditCard,
  Calendar,
  Plus,
  ArrowRight,
  Dumbbell,
  ClipboardList,
  Activity,
  GraduationCap,
  TriangleAlert,
  Play,
} from "lucide-react";
import type { State, EditorSpec } from "./types";
import {
  Heading,
  Button,
  Stat,
  Panel,
  Chart,
  Person,
  Badge,
  Empty,
  money,
  date,
} from "./ui";
export interface Actions {
  edit: (spec: EditorSpec) => void;
  navigate: (route: string) => void;
  run: (id: number) => void;
  showStudent: (id: number) => void;
}
export function Frequency({ state }: { state: State }) {
  const values = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(state.today + "T12:00:00Z");
      d.setUTCDate(d.getUTCDate() - 6 + i);
      return {
        label: d
          .toLocaleDateString("pt-BR", { weekday: "short", timeZone: "UTC" })
          .slice(0, 3),
        value: state.attendance.filter(
          (a) => a.day === d.toISOString().slice(0, 10),
        ).length,
      };
    }),
    max = Math.max(1, ...values.map((v) => v.value));
  return (
    <>
      <div className="occupancy">
        {values.map((v, i) => (
          <div className="bar-group" key={i}>
            <div
              className={`bar ${i === 6 ? "current" : ""}`}
              style={{ height: Math.max(2, (v.value / max) * 125) }}
              title={`${v.label}: ${v.value} check-ins`}
            />
            <small>{v.label}</small>
          </div>
        ))}
      </div>
      <div className="frequency-foot">
        <span>Total nos últimos 7 dias</span>
        <strong>{values.reduce((s, v) => s + v.value, 0)} check-ins</strong>
      </div>
    </>
  );
}
export function monthly(
  state: State,
  kind: "revenue" | "enrollment",
  count: number,
) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(state.today + "T12:00:00Z");
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() - count + 1 + i);
    const key = d.toISOString().slice(0, 7);
    return {
      label: d
        .toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" })
        .replace(".", ""),
      value:
        kind === "revenue"
          ? state.payments
              .filter((p) => p.status === "Pago" && p.paid_at?.startsWith(key))
              .reduce((s, p) => s + p.amount, 0)
          : state.students.filter((s) => s.enrollment.startsWith(key)).length,
    };
  });
}
export function Dashboard({
  state: s,
  actions: a,
}: {
  state: State;
  actions: Actions;
}) {
  const [period, setPeriod] = useState(6);
  const month = s.today.slice(0, 7),
    revenue = s.payments
      .filter((p) => p.status === "Pago" && p.paid_at?.startsWith(month))
      .reduce((v, p) => v + p.amount, 0),
    pending = s.payments.filter((p) =>
      ["Pendente", "Vencido"].includes(p.status),
    ),
    expired = pending.filter((p) => p.status === "Vencido"),
    checkins = s.attendance.filter((v) => v.day === s.today).length;
  if (s.user.role === "student") {
    const workout = s.workouts.find((w) => w.active);
    return (
      <>
        <Heading
          title={`Seu próximo passo começa aqui, ${s.user.name.split(" ")[0]}.`}
          subtitle="Consistência hoje. Evolução no seu ritmo."
          action={
            <Button
              primary
              onClick={() =>
                a.edit({ entity: "attendance", studentId: s.user.id })
              }
            >
              <Calendar />
              Fazer check-in
            </Button>
          }
        />
        <div className="stats">
          <Stat
            label="Visitas neste mês"
            value={s.attendance.filter((v) => v.day.startsWith(month)).length}
            icon={<Calendar />}
            foot="Cada presença conta"
          />
          <Stat
            label="Treinos concluídos"
            value={s.sessions.length}
            icon={<Dumbbell />}
            foot="Sua jornada registrada"
          />
          <Stat
            label="Meu plano"
            value={s.students[0]?.plan || "Sem plano"}
            icon={<CreditCard />}
            foot={`${pending.length} cobranças em aberto`}
          />
          <Stat
            label="Próxima avaliação"
            value={date(s.assessments[0]?.next_date)}
            icon={<Activity />}
            foot="Acompanhamento com seu professor"
          />
        </div>
        <section className="workout-hero">
          <span className="label violet">SEU TREINO · PRÓXIMO PASSO</span>
          <h2>{workout?.name || "Vamos preparar sua rotina"}</h2>
          <p>
            {workout
              ? `Ficha ${workout.division} · ${workout.exercises.length} exercícios · ${workout.objective}`
              : "Seu professor ainda não disponibilizou uma ficha."}
          </p>
          {workout && (
            <Button primary onClick={() => a.run(workout.id)}>
              <Play />
              Iniciar treino
            </Button>
          )}
        </section>
        <div className="dashboard-grid">
          <Panel
            title="Sua semana em movimento"
            subtitle="Presenças dos últimos 7 dias"
          >
            <Frequency state={s} />
          </Panel>
          <Panel title="Últimas atividades" subtitle="Seu esforço tem história">
            {s.sessions.length ? (
              s.sessions.slice(0, 4).map((v) => (
                <div className="activity-item" key={v.id}>
                  <div className="workout-letter">
                    <Dumbbell />
                  </div>
                  <div>
                    <strong>Treino concluído</strong>
                    <p className="muted">
                      {date(v.created)} · {v.logs.length} exercícios
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <Empty
                title="Sua história começa no primeiro treino"
                text="Ao concluir um treino, ele aparecerá aqui."
              />
            )}
          </Panel>
        </div>
      </>
    );
  }
  if (s.user.role === "teacher")
    return (
      <>
        <Heading
          title={`Vamos evoluir juntos, ${s.user.name.split(" ")[0]}.`}
          subtitle="Seu acompanhamento faz a diferença em cada treino."
          action={
            <Button primary onClick={() => a.edit({ entity: "workouts" })}>
              <Plus />
              Criar ficha de treino
            </Button>
          }
        />
        <div className="stats">
          <Stat
            label="Meus alunos"
            value={s.students.length}
            icon={<Users />}
            foot="Alunos sob sua responsabilidade"
          />
          <Stat
            label="Treinos ativos"
            value={s.workouts.filter((w) => w.active).length}
            icon={<Dumbbell />}
            foot="Fichas disponíveis aos alunos"
          />
          <Stat
            label="Avaliações pendentes"
            value={
              s.students.filter(
                (st) =>
                  !s.assessments.some(
                    (v) => v.student_id === st.id && v.next_date >= s.today,
                  ),
              ).length
            }
            icon={<ClipboardList />}
            foot="Sem reavaliação futura registrada"
          />
          <Stat
            label="Check-ins hoje"
            value={checkins}
            icon={<Calendar />}
            foot="Presenças dos seus alunos"
          />
        </div>
        <div className="dashboard-grid">
          <Panel title="Seu acompanhamento" subtitle="Próximas ações por aluno">
            {s.students.slice(0, 7).map((st) => (
              <div className="between activity-item" key={st.id}>
                <Person name={st.name} email={st.objective} />
                <Button small onClick={() => a.showStudent(st.id)}>
                  Ver perfil <ArrowRight size={14} />
                </Button>
              </div>
            ))}
          </Panel>
          <Panel title="Frequência dos seus alunos" subtitle="Últimos 7 dias">
            <Frequency state={s} />
          </Panel>
        </div>
        <Panel title="Ações do dia">
          <div className="row" style={{ flexWrap: "wrap" }}>
            <Button onClick={() => a.edit({ entity: "assessments" })}>
              <Activity />
              Registrar avaliação
            </Button>
            <Button onClick={() => a.navigate("exercises")}>
              <Dumbbell />
              Biblioteca de exercícios
            </Button>
            <Button onClick={() => a.edit({ entity: "attendance" })}>
              <Calendar />
              Registrar check-in
            </Button>
          </div>
        </Panel>
      </>
    );
  const data = monthly(s, "revenue", period);
  return (
    <>
      <Heading
        title="Sua academia, em movimento."
        subtitle={`Olá, ${s.user.name.split(" ")[0]}. Aqui está o resumo da sua operação.`}
        action={
          <div className="row">
            <span className="date-select">
              <Calendar />
              {date(s.today)}
            </span>
            <Button primary onClick={() => a.edit({ entity: "students" })}>
              <Plus />
              Novo aluno
            </Button>
          </div>
        }
      />
      <div className="stats">
        <Stat
          label="Alunos ativos"
          value={s.students.filter((v) => v.active).length}
          icon={<Users />}
          foot={`${s.students.length} alunos cadastrados`}
        />
        <Stat
          label="Receita do mês"
          value={money(revenue)}
          icon={<Wallet />}
          foot="Pagamentos registrados neste mês"
        />
        <Stat
          label="Mensalidades pendentes"
          value={money(pending.reduce((v, p) => v + p.amount, 0))}
          icon={<CreditCard />}
          foot={`${expired.length} vencidas · ${pending.length} cobranças a receber`}
        />
        <Stat
          label="Check-ins hoje"
          value={checkins}
          icon={<Calendar />}
          foot="Presenças registradas no dia"
        />
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <header className="panel-header">
            <div>
              <h2>Visão financeira</h2>
              <p>Acompanhe a receita da sua academia</p>
            </div>
            <div className="chart-controls">
              {[3, 6, 12].map((n) => (
                <button
                  key={n}
                  className={period === n ? "active" : ""}
                  onClick={() => setPeriod(n)}
                >
                  {n} meses
                </button>
              ))}
            </div>
          </header>
          <div className="between" style={{ paddingRight: 22 }}>
            <div className="chart-summary">
              <strong>{money(data.reduce((v, d) => v + d.value, 0))}</strong>
              <span>no período</span>
            </div>
            <span className="legend">Receita</span>
          </div>
          <Chart data={data} moneyValue />
        </section>
        <Panel
          title="Frequência da semana"
          subtitle="Um olhar sobre a rotina dos seus alunos"
          action={<span className="legend">Check-ins</span>}
        >
          <Frequency state={s} />
        </Panel>
      </div>
      <div className="dashboard-grid">
        <Panel
          title="Alunos recentes"
          subtitle="Quem está construindo uma nova rotina"
          action={
            <button
              className="text-link"
              onClick={() => a.navigate("students")}
            >
              Ver todos <ArrowRight size={14} />
            </button>
          }
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Plano</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {s.students.slice(0, 5).map((st) => (
                  <tr key={st.id}>
                    <td>
                      <Person name={st.name} email={st.email} />
                    </td>
                    <td>{st.plan || "Sem plano"}</td>
                    <td>
                      <Badge value={st.active} />
                    </td>
                    <td>
                      <Button
                        small
                        label={`Abrir perfil de ${st.name}`}
                        onClick={() => a.showStudent(st.id)}
                      >
                        <ArrowRight size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel
          title="Precisa da sua atenção"
          subtitle="Pequenas ações, grandes resultados"
        >
          <div className="alert-item">
            <span className="alert-icon">
              <TriangleAlert />
            </span>
            <div>
              <strong>{expired.length} mensalidades vencidas</strong>
              <p>
                {money(expired.reduce((v, p) => v + p.amount, 0))} aguardando
                regularização.
              </p>
              <button
                className="text-link"
                onClick={() => a.navigate("payments")}
              >
                Acessar financeiro <ArrowRight size={13} />
              </button>
            </div>
          </div>
          <div className="alert-item">
            <span className="alert-icon purple">
              <ClipboardList />
            </span>
            <div>
              <strong>
                {
                  s.students.filter(
                    (st) =>
                      st.active &&
                      !s.workouts.some(
                        (w) => w.active && w.student_id === st.id,
                      ),
                  ).length
                }{" "}
                alunos sem treino ativo
              </strong>
              <p>Conecte cada aluno ao próximo passo.</p>
              <button
                className="text-link"
                onClick={() => a.navigate("workouts")}
              >
                Gerenciar treinos <ArrowRight size={13} />
              </button>
            </div>
          </div>
          <div className="quick-actions">
            <Button onClick={() => a.edit({ entity: "attendance" })}>
              <Calendar />
              Novo check-in
            </Button>
            <Button onClick={() => a.navigate("payments")}>
              <Wallet />
              Registrar pagamento
            </Button>
            <Button onClick={() => a.edit({ entity: "workouts" })}>
              <Dumbbell />
              Criar treino
            </Button>
            <Button onClick={() => a.navigate("reports")}>
              <GraduationCap />
              Ver relatórios
            </Button>
          </div>
        </Panel>
      </div>
    </>
  );
}
