import { useState, type ReactNode } from "react";
import {
  Plus,
  Eye,
  Pencil,
  Archive,
  Play,
  Wallet,
  CreditCard,
  Activity,
  Users,
  Calendar,
  ArrowLeft,
} from "lucide-react";
import type {
  State,
  EditorSpec,
  Workout,
  Assessment,
  Exercise,
  Payment,
} from "./types";
import {
  Table,
  Heading,
  Button,
  Person,
  Badge,
  Panel,
  Empty,
  Chart,
  Stat,
  money,
  date,
  csv,
} from "./ui";
import { monthly, type Actions } from "./Dashboard";
export interface PageActions extends Actions {
  show: (title: string, subtitle: string, body: ReactNode) => void;
  deactivate: (entity: string, id: number, label: string) => void;
}
export function workoutDetail(w: Workout) {
  return (
    <>
      <div className="banner">
        <div>
          <strong>{w.objective}</strong>
          <p>{w.notes}</p>
        </div>
      </div>
      {w.exercises.map((e, i) => (
        <div className="activity-item" key={i}>
          <div className="workout-letter">{i + 1}</div>
          <div>
            <h3>{e.name}</h3>
            <p className="muted">
              {e.sets} × {e.reps} · {e.load} kg · {e.rest}s de descanso
            </p>
            <p className="dim" style={{ fontSize: 11, marginTop: 7 }}>
              {e.instructions}
            </p>
          </div>
        </div>
      ))}
      {w.versions.length > 0 && (
        <details style={{ marginTop: 20 }}>
          <summary>{w.versions.length} versões anteriores preservadas</summary>
          {w.versions.map((v) => (
            <div className="read-box" key={v.id} style={{ marginTop: 10 }}>
              <strong>
                {v.snapshot.name} · {date(v.created)}
              </strong>
              {v.snapshot.exercises.map((e, i) => (
                <div key={i}>
                  {e.name} · {e.sets} × {e.reps} · {e.load} kg
                </div>
              ))}
            </div>
          ))}
        </details>
      )}
    </>
  );
}
export function assessmentDetail(a: Assessment, s: State) {
  return (
    <>
      <div className="details-grid">
        {[
          ["Peso", `${a.weight} kg`],
          ["Altura", `${a.height} cm`],
          ["Cintura", `${a.waist} cm`],
          ["Reavaliação", date(a.next_date)],
        ].map(([k, v]) => (
          <div key={k}>
            <small>{k}</small>
            <strong>{v}</strong>
          </div>
        ))}
      </div>
      <h3 style={{ margin: "25px 0 12px" }}>Histórico de peso (kg)</h3>
      <Chart
        data={s.assessments
          .filter((x) => x.student_id === a.student_id)
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((x) => ({ label: date(x.date).slice(0, 5), value: x.weight }))}
      />
      <h3 style={{ marginBottom: 10 }}>Objetivo</h3>
      <p className="read-box">{a.objective}</p>
      <h3 style={{ margin: "20px 0 10px" }}>Observações profissionais</h3>
      <p className="read-box">{a.notes}</p>
    </>
  );
}
export function Pages({
  route,
  state: s,
  actions: a,
}: {
  route: string;
  state: State;
  actions: PageActions;
}) {
  const admin = s.user.role === "admin",
    staff = s.user.role !== "student",
    name = (id: number) =>
      s.students.find((st) => st.id === id)?.name || "Aluno";
  const viewWorkout = (w: Workout) =>
    a.show(
      w.name,
      `Ficha ${w.division} · ${name(w.student_id)}`,
      workoutDetail(w),
    );
  const viewAssessment = (v: Assessment) =>
    a.show(
      "Avaliação e evolução",
      `${name(v.student_id)} · ${date(v.date)}`,
      assessmentDetail(v, s),
    );
  const add = (label: string, entity: EditorSpec["entity"]) => (
    <Button primary onClick={() => a.edit({ entity })}>
      <Plus />
      {label}
    </Button>
  );
  if (route.startsWith("students/"))
    return (
      <StudentProfile id={Number(route.split("/")[1])} state={s} actions={a} />
    );
  if (route === "students")
    return (
      <>
        <Heading
          title={admin ? "Alunos" : "Meus alunos"}
          subtitle="Cada pessoa, uma jornada. Gerencie tudo em um só lugar."
          action={admin && add("Novo aluno", "students")}
        />
        <Table
          rows={s.students}
          headers={[
            "Aluno",
            "Plano",
            "Professor",
            "Matrícula",
            "Status",
            "Ações",
          ]}
          search={(st) => st.name + " " + st.email}
          filters={["Ativo", "Inativo"]}
          filterValue={(st) => (st.active ? "Ativo" : "Inativo")}
          exportRows={(data) =>
            csv(
              ["Nome", "E-mail", "Plano", "Professor", "Status"],
              data.map((st) => [
                st.name,
                st.email,
                st.plan,
                st.teacher,
                st.active ? "Ativo" : "Inativo",
              ]),
              "gymflow-alunos.csv",
            )
          }
          render={(st) => (
            <>
              <td>
                <Person name={st.name} email={st.email} />
              </td>
              <td>{st.plan || "Sem plano"}</td>
              <td>{st.teacher}</td>
              <td>{date(st.enrollment)}</td>
              <td>
                <Badge value={st.active} />
              </td>
              <td>
                <div className="row">
                  <Button
                    small
                    label="Ver perfil"
                    onClick={() => a.showStudent(st.id)}
                  >
                    <Eye size={15} />
                  </Button>
                  {admin && (
                    <Button
                      small
                      label="Editar aluno"
                      onClick={() => a.edit({ entity: "students", id: st.id })}
                    >
                      <Pencil size={15} />
                    </Button>
                  )}
                </div>
              </td>
            </>
          )}
        />
      </>
    );
  if (route === "teachers")
    return (
      <>
        <Heading
          title="Professores"
          subtitle="Profissionais que transformam movimento em evolução."
          action={add("Novo professor", "teachers")}
        />
        <Table
          rows={s.teachers}
          headers={[
            "Professor",
            "Especialidade",
            "Registro",
            "Alunos",
            "Status",
            "Ações",
          ]}
          search={(t) => t.name + " " + t.email}
          filters={["Ativo", "Inativo"]}
          filterValue={(t) => (t.active ? "Ativo" : "Inativo")}
          render={(t) => (
            <>
              <td>
                <Person name={t.name} email={t.email} />
              </td>
              <td>{t.specialty}</td>
              <td>{t.registration || "—"}</td>
              <td>
                {s.students.filter((st) => st.teacher_id === t.id).length}
              </td>
              <td>
                <Badge value={t.active} />
              </td>
              <td>
                <div className="row">
                  <Button
                    small
                    label="Editar professor"
                    onClick={() => a.edit({ entity: "teachers", id: t.id })}
                  >
                    <Pencil size={15} />
                  </Button>
                  {t.active && (
                    <Button
                      small
                      danger
                      label="Desativar professor"
                      onClick={() => a.deactivate("teachers", t.id, t.name)}
                    >
                      <Archive size={15} />
                    </Button>
                  )}
                </div>
              </td>
            </>
          )}
        />
      </>
    );
  if (route === "exercises")
    return (
      <>
        <Heading
          title="Biblioteca de exercícios"
          subtitle="Uma base para orientar cada movimento."
          action={staff && add("Novo exercício", "exercises")}
        />
        <Table
          rows={s.exercises}
          headers={[
            "Exercício",
            "Grupo muscular",
            "Equipamento",
            "Nível",
            "Status",
            "Ações",
          ]}
          search={(e) =>
            e.name + " " + e.equipment + " " + e.level + " " + e.category
          }
          filters={[...new Set(s.exercises.map((e) => e.muscle))]}
          filterValue={(e) => e.muscle}
          render={(e) => (
            <>
              <td>
                <strong>{e.name}</strong>
              </td>
              <td>{e.muscle}</td>
              <td>{e.equipment}</td>
              <td>{e.level}</td>
              <td>
                <Badge value={e.active} />
              </td>
              <td>
                <div className="row">
                  <Button
                    small
                    label="Ver instruções"
                    onClick={() =>
                      a.show(
                        e.name,
                        `${e.muscle} · ${e.equipment} · ${e.level}`,
                        <>
                          <h3>Como executar</h3>
                          <p
                            className="read-box"
                            style={{ margin: "12px 0 20px" }}
                          >
                            {e.instructions}
                          </p>
                          <h3>Cuidados gerais</h3>
                          <p className="read-box" style={{ marginTop: 12 }}>
                            {e.precautions || "Consulte seu professor."}
                          </p>
                          {staff && e.active && (
                            <div style={{ marginTop: 20 }}>
                              <Button
                                danger
                                onClick={() =>
                                  a.deactivate("exercises", e.id, e.name)
                                }
                              >
                                Desativar exercício
                              </Button>
                            </div>
                          )}
                        </>,
                      )
                    }
                  >
                    <Eye size={15} />
                  </Button>
                  {staff && (
                    <Button
                      small
                      label="Editar exercício"
                      onClick={() => a.edit({ entity: "exercises", id: e.id })}
                    >
                      <Pencil size={15} />
                    </Button>
                  )}
                </div>
              </td>
            </>
          )}
        />
      </>
    );
  if (route === "workouts")
    return (
      <>
        <Heading
          title={staff ? "Treinos" : "Meus treinos"}
          subtitle="Fichas personalizadas para uma evolução consistente."
          action={staff && add("Criar ficha", "workouts")}
        />
        <Table
          rows={s.workouts}
          headers={[
            "Treino",
            "Aluno",
            "Divisão",
            "Exercícios",
            "Atualização",
            "Status",
            "Ações",
          ]}
          search={(w) => w.name + " " + name(w.student_id)}
          filters={["Ativo", "Inativo"]}
          filterValue={(w) => (w.active ? "Ativo" : "Inativo")}
          render={(w) => (
            <>
              <td>{w.name}</td>
              <td>{name(w.student_id)}</td>
              <td>
                <span className="badge">Ficha {w.division}</span>
              </td>
              <td>{w.exercises.length}</td>
              <td>{date(w.updated)}</td>
              <td>
                <Badge value={w.active} />
              </td>
              <td>
                <div className="row">
                  <Button
                    small
                    label="Abrir ficha"
                    onClick={() => viewWorkout(w)}
                  >
                    <Eye size={15} />
                  </Button>
                  {staff ? (
                    <>
                      <Button
                        small
                        label="Editar ficha"
                        onClick={() => a.edit({ entity: "workouts", id: w.id })}
                      >
                        <Pencil size={15} />
                      </Button>
                      {w.active && (
                        <Button
                          small
                          label="Desativar ficha"
                          danger
                          onClick={() => a.deactivate("workouts", w.id, w.name)}
                        >
                          <Archive size={15} />
                        </Button>
                      )}
                    </>
                  ) : (
                    w.active && (
                      <Button
                        small
                        label="Iniciar treino"
                        onClick={() => a.run(w.id)}
                      >
                        <Play size={15} />
                      </Button>
                    )
                  )}
                </div>
              </td>
            </>
          )}
        />
      </>
    );
  if (route === "assessments")
    return (
      <>
        <Heading
          title={staff ? "Avaliações físicas" : "Minha evolução"}
          subtitle="Acompanhamento individual, com respeito à sua jornada."
          action={staff && add("Nova avaliação", "assessments")}
        />
        <Table
          rows={s.assessments}
          headers={["Aluno", "Data", "Peso", "Altura", "Reavaliação", "Ações"]}
          search={(v) => name(v.student_id) + " " + v.date}
          render={(v) => (
            <>
              <td>
                <Person name={name(v.student_id)} />
              </td>
              <td>{date(v.date)}</td>
              <td>{v.weight} kg</td>
              <td>{v.height} cm</td>
              <td>{date(v.next_date)}</td>
              <td>
                <div className="row">
                  <Button
                    small
                    label="Ver avaliação"
                    onClick={() => viewAssessment(v)}
                  >
                    <Activity size={15} />
                  </Button>
                  {staff && (
                    <Button
                      small
                      label="Editar avaliação"
                      onClick={() =>
                        a.edit({ entity: "assessments", id: v.id })
                      }
                    >
                      <Pencil size={15} />
                    </Button>
                  )}
                </div>
              </td>
            </>
          )}
        />
      </>
    );
  if (route === "attendance")
    return (
      <>
        <Heading
          title="Frequência"
          subtitle="Cada check-in é um compromisso com a evolução."
          action={
            <Button
              primary
              onClick={() =>
                a.edit({
                  entity: "attendance",
                  studentId: staff ? undefined : s.user.id,
                })
              }
            >
              <Calendar />
              Fazer check-in
            </Button>
          }
        />
        <Table
          rows={s.attendance}
          headers={["Aluno", "Data", "Horário", "Registro"]}
          search={(v) => name(v.student_id) + " " + date(v.day)}
          exportRows={(data) =>
            csv(
              ["Aluno", "Data", "Hora"],
              data.map((v) => [name(v.student_id), v.day, v.time]),
              "gymflow-presencas.csv",
            )
          }
          render={(v) => (
            <>
              <td>
                <Person name={name(v.student_id)} />
              </td>
              <td>{date(v.day)}</td>
              <td>{v.time}</td>
              <td>
                <Badge value="Confirmado" />
              </td>
            </>
          )}
        />
      </>
    );
  if (route === "plans")
    return (
      <>
        <Heading
          title="Planos da academia"
          subtitle="Experiências que acompanham diferentes objetivos."
          action={add("Novo plano", "plans")}
        />
        <div className="card-grid">
          {s.plans.map((p) => (
            <article className="entity-card" key={p.id}>
              <div className="between">
                <span className="stat-icon">
                  <CreditCard />
                </span>
                <Badge value={p.active} />
              </div>
              <div>
                <h2 style={{ fontSize: 21 }}>{p.name}</h2>
                <p>{p.description}</p>
              </div>
              <div className="price">
                {money(p.price)} <small>/ {p.months} mês(es)</small>
              </div>
              <ul>
                {p.benefits.split("•").map((v) => (
                  <li key={v}>{v.trim()}</li>
                ))}
              </ul>
              <p>
                {
                  s.subscriptions.filter(
                    (sub) => sub.active && sub.plan_id === p.id,
                  ).length
                }{" "}
                assinaturas ativas
              </p>
              <footer>
                <Button
                  small
                  onClick={() => a.edit({ entity: "plans", id: p.id })}
                >
                  <Pencil size={14} />
                  Editar
                </Button>
                {p.active && (
                  <Button
                    small
                    onClick={() => a.deactivate("plans", p.id, p.name)}
                  >
                    Desativar
                  </Button>
                )}
              </footer>
            </article>
          ))}
        </div>
      </>
    );
  if (route === "payments")
    return (
      <>
        {!admin && (
          <div className="banner">
            <CreditCard />
            <div>
              Seu plano:{" "}
              <strong className="violet">
                {s.students[0]?.plan || "Sem plano"}
              </strong>
              <p>
                Consulte sua academia para alterar a assinatura ou efetuar
                pagamentos.
              </p>
            </div>
          </div>
        )}
        <Heading
          title={admin ? "Financeiro" : "Meu plano e pagamentos"}
          subtitle="Cobranças e registros manuais. Nenhum gateway conectado."
          action={
            admin && (
              <div className="row">
                <Button onClick={() => a.edit({ entity: "subscriptions" })}>
                  <CreditCard />
                  Vincular plano
                </Button>
                {add("Gerar cobrança", "payments")}
              </div>
            )
          }
        />
        <Table
          rows={s.payments}
          headers={[
            "Aluno",
            "Valor",
            "Vencimento",
            "Status",
            "Pagamento",
            "Ações",
          ]}
          search={(p) => name(p.student_id) + " " + p.status}
          filters={["Pago", "Pendente", "Vencido", "Cancelado"]}
          filterValue={(p) => p.status}
          exportRows={
            admin
              ? (data) =>
                  csv(
                    ["Aluno", "Valor", "Vencimento", "Status"],
                    data.map((p) => [
                      name(p.student_id),
                      p.amount,
                      p.due,
                      p.status,
                    ]),
                    "gymflow-financeiro.csv",
                  )
              : undefined
          }
          render={(p) => (
            <>
              <td>
                <Person name={name(p.student_id)} />
              </td>
              <td>{money(p.amount)}</td>
              <td>{date(p.due)}</td>
              <td>
                <Badge value={p.status} />
              </td>
              <td>{date(p.paid_at)}</td>
              <td>
                {admin && ["Pendente", "Vencido"].includes(p.status) ? (
                  <div className="row">
                    <Button
                      small
                      onClick={() =>
                        a.edit({
                          entity: "payments",
                          id: p.id,
                          paymentAction: "Pago",
                        })
                      }
                    >
                      Registrar
                    </Button>
                    <Button
                      small
                      danger
                      label="Cancelar cobrança"
                      onClick={() =>
                        a.edit({
                          entity: "payments",
                          id: p.id,
                          paymentAction: "Cancelado",
                        })
                      }
                    >
                      <Archive size={14} />
                    </Button>
                  </div>
                ) : (
                  <Button
                    small
                    label="Ver registro de pagamento"
                    onClick={() =>
                      a.show(
                        "Detalhes da cobrança",
                        name(p.student_id),
                        <div className="read-box">
                          {money(p.amount)} · {p.status}
                          <br />
                          Vencimento: {date(p.due)}
                          <br />
                          Pagamento: {date(p.paid_at)}
                          <br />
                          Método: {p.method || "Não registrado"}
                          <p>
                            Registro manual. Não representa confirmação de um
                            gateway.
                          </p>
                        </div>,
                      )
                    }
                  >
                    <Eye size={14} />
                  </Button>
                )}
              </td>
            </>
          )}
        />
      </>
    );
  if (route === "history")
    return (
      <>
        <Heading
          title="Histórico de treinos"
          subtitle="Seu esforço registrado, exercício por exercício."
        />
        <Table
          rows={s.sessions}
          headers={["Data", "Treino", "Exercícios", "Ações"]}
          search={(v) => v.created}
          render={(v) => (
            <>
              <td>{date(v.created)}</td>
              <td>
                {s.workouts.find((w) => w.id === v.workout_id)?.name ||
                  "Treino"}
              </td>
              <td>{v.logs.length}</td>
              <td>
                <Button
                  small
                  label="Ver execução"
                  onClick={() =>
                    a.show(
                      "Treino concluído",
                      date(v.created),
                      v.logs.map((l) => (
                        <div className="activity-item" key={l.id}>
                          <div>
                            <h3>{l.name}</h3>
                            <p className="muted">
                              {l.sets} séries × {l.reps} repetições · {l.load}{" "}
                              kg
                            </p>
                          </div>
                        </div>
                      )),
                    )
                  }
                >
                  <Eye size={15} />
                </Button>
              </td>
            </>
          )}
        />
      </>
    );
  if (route === "reports")
    return (
      <>
        <Heading
          title="Relatórios"
          subtitle="Informação clara para decisões com mais contexto."
        />
        <div className="stats">
          <Stat
            label="Alunos ativos"
            value={s.students.filter((v) => v.active).length}
            icon={<Users />}
            foot={`${s.students.length} alunos cadastrados`}
          />
          <Stat
            label="Professores ativos"
            value={s.teachers.filter((v) => v.active).length}
            icon={<Users />}
            foot="Equipe de acompanhamento"
          />
          <Stat
            label="Receita do mês"
            value={money(
              s.payments
                .filter(
                  (p) =>
                    p.status === "Pago" &&
                    p.paid_at?.startsWith(s.today.slice(0, 7)),
                )
                .reduce((v, p) => v + p.amount, 0),
            )}
            icon={<Wallet />}
            foot="Recebimentos registrados"
          />
          <Stat
            label="Inadimplência"
            value={money(
              s.payments
                .filter((p) => p.status === "Vencido")
                .reduce((v, p) => v + p.amount, 0),
            )}
            icon={<CreditCard />}
            foot="Cobranças vencidas"
          />
        </div>
        <div className="dashboard-grid">
          <Panel title="Evolução de matrículas" subtitle="Novos alunos por mês">
            <Chart data={monthly(s, "enrollment", 6)} />
          </Panel>
          <Panel title="Distribuição de planos" subtitle="Assinaturas ativas">
            {s.plans.map((p) => {
              const count = s.subscriptions.filter(
                  (sub) => sub.active && sub.plan_id === p.id,
                ).length,
                total = s.subscriptions.filter((sub) => sub.active).length;
              return (
                <div key={p.id} style={{ marginBottom: 20 }}>
                  <div className="between">
                    <span>{p.name}</span>
                    <span className="muted">{count} alunos</span>
                  </div>
                  <div className="progress-track">
                    <span
                      style={{
                        width: `${(count / Math.max(1, total)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </Panel>
        </div>
        <Panel
          title="Atividade administrativa"
          subtitle="Últimas 100 operações auditadas"
        >
          {s.audit.length ? (
            s.audit.map((v) => (
              <div className="between activity-item" key={v.id}>
                <div>
                  <strong>{v.action}</strong>
                  <p className="muted">
                    {v.actor} · {v.entity} #{v.entity_id}
                  </p>
                </div>
                <small className="dim">{date(v.created)}</small>
              </div>
            ))
          ) : (
            <Empty title="Nenhuma operação registrada" />
          )}
        </Panel>
      </>
    );
  if (route === "settings" || route === "profile")
    return (
      <>
        <Heading
          title={route === "settings" ? "Configurações" : "Meu perfil"}
          subtitle={
            route === "settings"
              ? "Identidade da academia e serviços conectados."
              : "Seus dados e preferências."
          }
        />
        <div className="dashboard-grid">
          <Panel
            title={
              route === "settings" ? "Sua academia" : "Informações pessoais"
            }
          >
            <div className="details-grid">
              {Object.entries(
                route === "settings"
                  ? s.settings
                  : {
                      Nome: s.user.name,
                      "E-mail": s.user.email,
                      Telefone: s.user.phone,
                      Perfil: s.user.role,
                    },
              ).map(([k, v]) => (
                <div key={k}>
                  <small>{k}</small>
                  <span>{v || "Não informado"}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 24 }}>
              <Button
                primary
                onClick={() =>
                  a.edit({
                    entity: route === "settings" ? "settings" : "profile",
                  })
                }
              >
                <Pencil />
                Editar informações
              </Button>
            </div>
          </Panel>
          <Panel
            title="Serviços conectados"
            subtitle="Status real das integrações"
          >
            {[
              "Assistente de IA",
              "E-mail e recuperação de senha",
              "Gateway de pagamentos",
            ].map((v) => (
              <div className="alert-item" key={v}>
                <div>
                  <strong>{v}</strong>
                  <p>Indisponível · serviço não conectado.</p>
                </div>
              </div>
            ))}
          </Panel>
        </div>
      </>
    );
  return <Empty title="Página não encontrada" />;
}
function StudentProfile({
  id,
  state: s,
  actions: a,
}: {
  id: number;
  state: State;
  actions: PageActions;
}) {
  const [tab, setTab] = useState("overview");
  const student = s.students.find((v) => v.id === id);
  if (!student) return <Empty title="Aluno não encontrado" />;
  const admin = s.user.role === "admin";
  const workouts = s.workouts.filter((v) => v.student_id === id),
    assessments = s.assessments.filter((v) => v.student_id === id),
    attendance = s.attendance.filter((v) => v.student_id === id),
    payments = s.payments.filter((v) => v.student_id === id);
  return (
    <>
      <button className="text-link" onClick={() => a.navigate("students")}>
        <ArrowLeft size={14} />
        Voltar para alunos
      </button>
      <section className="panel detail-hero">
        <Person name={student.name} email={student.email} />
        <Badge value={student.active} />
      </section>
      <div className="tabs">
        {[
          ["overview", "Visão geral"],
          ["workouts", "Treinos"],
          ["assessments", "Avaliações"],
          ["attendance", "Frequência"],
          ...(admin ? [["payments", "Financeiro"]] : []),
        ].map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "overview" && (
        <Panel title="Informações do aluno">
          <div className="details-grid">
            {[
              ["Professor", student.teacher],
              ["Plano", student.plan || "Sem plano"],
              ["Matrícula", date(student.enrollment)],
              ["Nascimento", date(student.birthday)],
              ["Objetivo", student.objective],
              [
                "Dados de avaliação",
                student.consent ? "Autorização registrada" : "Sem autorização",
              ],
            ].map(([k, v]) => (
              <div key={k}>
                <small>{k}</small>
                {v}
              </div>
            ))}
          </div>
          <div className="row" style={{ marginTop: 24, flexWrap: "wrap" }}>
            {admin && (
              <>
                <Button onClick={() => a.edit({ entity: "students", id })}>
                  Editar cadastro
                </Button>
                <Button
                  onClick={() =>
                    a.edit({ entity: "subscriptions", studentId: id })
                  }
                >
                  Vincular plano
                </Button>
                {student.active && (
                  <Button
                    danger
                    onClick={() => a.deactivate("students", id, student.name)}
                  >
                    Desativar aluno
                  </Button>
                )}
              </>
            )}
            <Button
              onClick={() => a.edit({ entity: "attendance", studentId: id })}
            >
              Registrar check-in
            </Button>
          </div>
        </Panel>
      )}
      {tab === "workouts" && (
        <Panel title="Fichas de treino">
          {workouts.map((w) => (
            <div className="between activity-item" key={w.id}>
              <div>
                <strong>{w.name}</strong>
                <p className="muted">
                  Ficha {w.division} · {w.exercises.length} exercícios
                </p>
              </div>
              <Button
                small
                onClick={() =>
                  a.show(w.name, `Ficha ${w.division}`, workoutDetail(w))
                }
              >
                Abrir
              </Button>
            </div>
          ))}
          {!workouts.length && <Empty />}
        </Panel>
      )}
      {tab === "assessments" && (
        <Panel
          title="Histórico de avaliações"
          subtitle="Informações de acesso restrito"
        >
          {assessments.map((v) => (
            <div className="between activity-item" key={v.id}>
              <div>
                {date(v.date)} · {v.weight} kg
              </div>
              <Button
                small
                onClick={() =>
                  a.show(
                    "Avaliação e evolução",
                    student.name,
                    assessmentDetail(v, s),
                  )
                }
              >
                Ver avaliação
              </Button>
            </div>
          ))}
          {!assessments.length && <Empty />}
        </Panel>
      )}
      {tab === "attendance" && (
        <Panel
          title="Presenças"
          subtitle={`${attendance.length} check-ins registrados`}
        >
          {attendance.map((v) => (
            <div className="between activity-item" key={v.id}>
              <span>{date(v.day)}</span>
              <span>{v.time}</span>
              <Badge value="Confirmado" />
            </div>
          ))}
        </Panel>
      )}
      {tab === "payments" && admin && (
        <Panel title="Histórico financeiro">
          {payments.map((p) => (
            <div className="between activity-item" key={p.id}>
              <span>{date(p.due)}</span>
              <strong>{money(p.amount)}</strong>
              <Badge value={p.status} />
              {["Pendente", "Vencido"].includes(p.status) && (
                <Button
                  small
                  onClick={() =>
                    a.edit({
                      entity: "payments",
                      id: p.id,
                      paymentAction: "Pago",
                    })
                  }
                >
                  Registrar
                </Button>
              )}
            </div>
          ))}
        </Panel>
      )}
    </>
  );
}
