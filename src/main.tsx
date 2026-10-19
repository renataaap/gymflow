import React, { useState, useEffect, useCallback, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Dumbbell,
  ClipboardList,
  Activity,
  Calendar,
  CreditCard,
  Wallet,
  Settings,
  History,
  Menu,
  LogOut,
  Bell,
  PanelLeftClose,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import type { State, Role, EditorSpec } from "./types";
import { Brand, Button, Field, Modal, Empty } from "./ui";
import { Dashboard } from "./Dashboard";
import { Pages, type PageActions } from "./Pages";
import { Editor, RunWorkout } from "./Editors";
import "./style.css";
class RequestError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
  csrf?: string,
): Promise<T> {
  const res = await fetch("/api/" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const value = await res.json();
  if (!res.ok)
    throw new RequestError(
      res.status,
      value.error || "Não foi possível concluir.",
    );
  return value as T;
}
const labels: Record<string, string> = {
  dashboard: "Visão geral",
  students: "Alunos",
  teachers: "Professores",
  workouts: "Treinos",
  exercises: "Exercícios",
  assessments: "Avaliações físicas",
  attendance: "Frequência",
  plans: "Planos",
  payments: "Financeiro",
  reports: "Relatórios",
  settings: "Configurações",
  profile: "Meu perfil",
  history: "Histórico de treinos",
};
const icons: Record<string, typeof Users> = {
  dashboard: LayoutDashboard,
  students: Users,
  teachers: GraduationCap,
  workouts: ClipboardList,
  exercises: Dumbbell,
  assessments: Activity,
  attendance: Calendar,
  plans: CreditCard,
  payments: Wallet,
  reports: Activity,
  settings: Settings,
  profile: Users,
  history: History,
};
const roleNames: Record<Role, string> = {
  admin: "Administrador",
  teacher: "Professor",
  student: "Aluno",
};
const allowed: Record<Role, string[]> = {
  admin: [
    "dashboard",
    "students",
    "teachers",
    "workouts",
    "exercises",
    "assessments",
    "attendance",
    "plans",
    "payments",
    "reports",
    "settings",
    "profile",
  ],
  teacher: [
    "dashboard",
    "students",
    "workouts",
    "exercises",
    "assessments",
    "attendance",
    "profile",
  ],
  student: [
    "dashboard",
    "workouts",
    "history",
    "assessments",
    "attendance",
    "payments",
    "exercises",
    "profile",
  ],
};
function App() {
  const [state, setState] = useState<State | null>(null),
    [loading, setLoading] = useState(true),
    [bootError, setBootError] = useState(""),
    [demo, setDemo] = useState(false),
    [route, setRoute] = useState(location.hash.slice(1) || "dashboard"),
    [collapsed, setCollapsed] = useState(false),
    [mobile, setMobile] = useState(false),
    [editor, setEditor] = useState<EditorSpec | null>(null),
    [detail, setDetail] = useState<{
      title: string;
      subtitle: string;
      body: ReactNode;
    } | null>(null),
    [confirmation, setConfirmation] = useState<{
      entity: string;
      id: number;
      label: string;
    } | null>(null),
    [run, setRun] = useState<number | null>(null),
    [toast, setToast] = useState(""),
    [modalError, setModalError] = useState(""),
    [busy, setBusy] = useState(false);
  const close = useCallback(() => {
    setEditor(null);
    setDetail(null);
    setConfirmation(null);
    setRun(null);
    setModalError("");
  }, []);
  const boot = useCallback(async () => {
    setLoading(true);
    setBootError("");
    try {
      const config = await request<{ demo: boolean }>("config");
      setDemo(config.demo);
      try {
        setState(await request<State>("state"));
      } catch (err) {
        if (!(err instanceof RequestError && err.status === 401)) throw err;
      }
    } catch (err) {
      setBootError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void boot();
    const onHash = () => {
      setRoute(location.hash.slice(1) || "dashboard");
      setMobile(false);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [boot]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  const navigate = (to: string) => {
    location.hash = to;
    setRoute(to);
    setMobile(false);
    window.scrollTo(0, 0);
  };
  const save = async (path: string, method: string, data: unknown) => {
    try {
      await request(path, method, data, state?.csrf);
      setState(await request<State>("state"));
      close();
      setToast("Alterações salvas com sucesso.");
    } catch (err) {
      if (err instanceof RequestError && err.status === 401) {
        setState(null);
        close();
      }
      throw err;
    }
  };
  const edit = (spec: EditorSpec) => {
    close();
    setEditor(spec);
  };
  const show = (title: string, subtitle: string, body: ReactNode) => {
    close();
    setDetail({ title, subtitle, body });
  };
  const actions: PageActions = {
    edit,
    navigate,
    run: (id) => {
      close();
      setRun(id);
    },
    showStudent: (id) => navigate("students/" + id),
    show,
    deactivate: (entity, id, label) => {
      close();
      setConfirmation({ entity, id, label });
    },
  };
  if (loading) return <div className="initial">Preparando seu espaço…</div>;
  if (bootError)
    return (
      <main className="initial">
        <Empty title="Não foi possível conectar ao GymFlow" text={bootError} />
        <Button primary onClick={() => void boot()}>
          Tentar novamente
        </Button>
      </main>
    );
  if (!state)
    return (
      <Login
        demo={demo}
        onLogin={async (email, password) => {
          await request("login", "POST", { email, password });
          setState(await request<State>("state"));
          navigate("dashboard");
        }}
      />
    );
  const base = route.split("/")[0],
    safeRoute = allowed[state.user.role].includes(base) ? route : "dashboard";
  const navItem = (key: string) => {
    const Icon = icons[key];
    return (
      <button
        key={key}
        className={`nav-item ${safeRoute.split("/")[0] === key ? "active" : ""}`}
        title={labels[key]}
        aria-label={
          key === "students" && state.user.role === "teacher"
            ? "Meus alunos"
            : labels[key]
        }
        onClick={() => navigate(key)}
      >
        <Icon />
        <span>
          {key === "students" && state.user.role === "teacher"
            ? "Meus alunos"
            : labels[key]}
        </span>
        {key === "students" && (
          <span className="nav-count">{state.students.length}</span>
        )}
      </button>
    );
  };
  return (
    <>
      <div
        className={`shell ${collapsed ? "collapsed" : ""} ${mobile ? "mobile-open" : ""}`}
      >
        <aside className="sidebar">
          <a href="#dashboard" aria-label="GymFlow início">
            <Brand />
          </a>
          <div className="workspace">
            <span className="workspace-logo">GF</span>
            <span>
              {state.settings.gym_name}
              <small className="dim" style={{ display: "block", fontSize: 9 }}>
                Seu espaço de gestão
              </small>
            </span>
          </div>
          <nav>
            {[
              ["PRINCIPAL", ["dashboard"]],
              [
                "GESTÃO ESPORTIVA",
                [
                  "students",
                  "teachers",
                  "workouts",
                  "exercises",
                  "assessments",
                  "attendance",
                  "history",
                ],
              ],
              ["GESTÃO FINANCEIRA", ["plans", "payments", "reports"]],
            ].map(([title, keys]) => {
              const selected = (keys as string[]).filter((k) =>
                allowed[state.user.role].includes(k),
              );
              return selected.length ? (
                <div className="nav-group" key={String(title)}>
                  <span className="label">{title}</span>
                  {selected.map(navItem)}
                </div>
              ) : null;
            })}
          </nav>
          <div className="side-bottom">
            <div className="help-card">
              <strong>Gestão em movimento.</strong>
              <p>Mais tempo para o que importa: seus alunos.</p>
              <Button
                small
                onClick={() =>
                  show(
                    "Conheça seu espaço",
                    "GymFlow · gestão em movimento",
                    <div className="read-box">
                      Cadastre alunos e professores, vincule planos e acompanhe
                      treinos e avaliações.
                      <br />
                      Os cadastros e registros são salvos em PostgreSQL.
                      <br />
                      <br />
                      Este ambiente contém dados fictícios quando a demonstração
                      está ativa. IA, envio de e-mail e gateway de pagamento não
                      estão conectados.
                    </div>,
                  )
                }
              >
                Conheça seu espaço <ArrowRight size={13} />
              </Button>
            </div>
            {state.user.role === "admin" && navItem("settings")}
            <div className="side-user">
              <button
                className="icon-button"
                aria-label="Meu perfil"
                onClick={() => navigate("profile")}
              >
                <span className="avatar">
                  {state.user.name
                    .split(" ")
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("")}
                </span>
              </button>
              <div className="user-info">
                <strong>{state.user.name.split(" ")[0]}</strong>
                <small>{roleNames[state.user.role]}</small>
              </div>
              <button
                className="icon-button"
                aria-label="Recolher menu"
                onClick={() => setCollapsed(!collapsed)}
              >
                <PanelLeftClose />
              </button>
            </div>
          </div>
        </aside>
        <main className="main">
          <header className="topbar">
            <div className="row">
              <button
                className="icon-button mobile-toggle"
                aria-label="Abrir menu"
                onClick={() => setMobile(!mobile)}
              >
                <Menu />
              </button>
              <div className="breadcrumb">
                Workspace <span>/</span>
                <span>{labels[safeRoute.split("/")[0]]}</span>
              </div>
            </div>
            <div className="top-actions">
              <span className="key" title="Banco de dados conectado">
                PostgreSQL
              </span>
              <button
                className="icon-button notification-button"
                aria-label="Notificações"
                onClick={() =>
                  show(
                    "Notificações",
                    "Alertas dos seus registros",
                    <>
                      {state.notifications.map((n) => (
                        <div className="activity-item" key={n.id}>
                          {n.title}
                        </div>
                      ))}
                      <p className="muted" style={{ marginTop: 15 }}>
                        {
                          state.payments.filter((p) => p.status === "Vencido")
                            .length
                        }{" "}
                        cobranças vencidas.
                      </p>
                    </>,
                  )
                }
              >
                <Bell />
              </button>
              <button
                className="icon-button"
                aria-label="Sair da conta"
                onClick={async () => {
                  try {
                    await request("logout", "POST", {}, state.csrf);
                    sessionStorage.clear();
                    setState(null);
                    close();
                  } catch (err) {
                    setToast((err as Error).message);
                  }
                }}
              >
                <LogOut />
              </button>
            </div>
          </header>
          <div className="content">
            {safeRoute === "dashboard" ? (
              <Dashboard state={state} actions={actions} />
            ) : (
              <Pages
                key={safeRoute}
                route={safeRoute}
                state={state}
                actions={actions}
              />
            )}
            <footer className="bottom-note">
              <span>
                © {new Date().getFullYear()} GymFlow · Gestão em movimento
              </span>
              <span>
                <span className="status-dot" />
                {state.demo
                  ? "Demonstração · dados fictícios"
                  : "Conexão ativa"}
              </span>
            </footer>
          </div>
        </main>
        <nav className="mobile-nav" aria-label="Navegação principal">
          {(state.user.role === "student"
            ? ["dashboard", "workouts", "assessments", "profile"]
            : ["dashboard", "students", "attendance", "profile"]
          ).map((k) => {
            const Icon = icons[k];
            return (
              <button
                key={k}
                className={base === k ? "active" : ""}
                onClick={() => navigate(k)}
              >
                <Icon />
                {k === "dashboard" ? "Início" : labels[k]}
              </button>
            );
          })}
        </nav>
      </div>
      {editor && (
        <Editor
          key={`${editor.entity}-${editor.id || 0}`}
          spec={editor}
          state={state}
          save={save}
          close={close}
        />
      )}{" "}
      {run && state.workouts.some((w) => w.id === run) && (
        <RunWorkout
          key={run}
          workout={state.workouts.find((w) => w.id === run)!}
          userId={state.user.id}
          save={save}
          close={close}
        />
      )}{" "}
      {detail && (
        <Modal
          title={detail.title}
          subtitle={detail.subtitle}
          close={close}
          wide
        >
          <div className="modal-content">{detail.body}</div>
          <footer className="modal-footer">
            <Button onClick={close}>Fechar</Button>
          </footer>
        </Modal>
      )}
      {confirmation && (
        <Modal
          title="Desativar registro"
          subtitle="O histórico será preservado."
          close={close}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await save(
                  confirmation.entity + "/" + confirmation.id,
                  "DELETE",
                  {},
                );
              } catch (err) {
                setModalError((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="modal-content">
              <p>
                Deseja desativar <strong>{confirmation.label}</strong>?
              </p>
              <p className="muted" style={{ marginTop: 12 }}>
                O registro ficará indisponível para novas operações. Vínculos e
                históricos anteriores serão mantidos.
              </p>
              <div className="error-message" role="alert">
                {modalError}
              </div>
            </div>
            <footer className="modal-footer">
              <Button onClick={close}>Cancelar</Button>
              <Button type="submit" primary disabled={busy}>
                Confirmar desativação
              </Button>
            </footer>
          </form>
        </Modal>
      )}
      <div
        id="toast"
        role="status"
        aria-live="polite"
        className={toast ? "show" : ""}
      >
        {toast}
      </div>
    </>
  );
}
function Login({
  demo,
  onLogin,
}: {
  demo: boolean;
  onLogin: (email: string, password: string) => Promise<void>;
}) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [recover, setRecover] = useState(false);
  const login = async (e: string, p: string) => {
    setBusy(true);
    setError("");
    try {
      await onLogin(e, p);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const close = useCallback(() => setRecover(false), []);
  return (
    <main className="login-page">
      <section className="login-art">
        <Brand />
        <span className="label" style={{ marginTop: 70, color: "#bca9ee" }}>
          ATHLETIC TECH · GESTÃO INTELIGENTE
        </span>
        <h1>
          Seu negócio.
          <br />
          Seu movimento.
          <br />
          <span>Seu próximo nível.</span>
        </h1>
        <p>
          Conecte pessoas, treinos e resultados. Tudo o que sua academia
          precisa, em um só lugar.
        </p>
        <div className="athletic-art" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="row muted" style={{ marginTop: "auto", fontSize: 10 }}>
          <ShieldCheck />
          Um espaço para cada perfil. Uma gestão conectada.
        </div>
      </section>
      <section className="login-form-wrap">
        <div className="login-form">
          <div
            className="stat-icon"
            style={{ width: 40, height: 40, marginBottom: 22 }}
          >
            <Dumbbell />
          </div>
          <h2>Bem-vindo ao GymFlow.</h2>
          <p>Entre na sua conta e continue em movimento.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void login(email, password);
            }}
          >
            <Field
              label="E-mail"
              name="email"
              type="email"
              value={email}
              onChange={setEmail}
            />
            <Field
              label="Senha"
              name="password"
              type="password"
              value={password}
              onChange={setPassword}
            />
            <button
              type="button"
              className="text-link"
              onClick={() => setRecover(true)}
            >
              Esqueci minha senha
            </button>
            <div className="error-message" role="alert">
              {error}
            </div>
            <Button type="submit" primary disabled={busy}>
              Entrar na minha conta <ArrowRight />
            </Button>
          </form>
          {demo && (
            <div className="demo-box">
              <strong>Explore o GymFlow</strong>
              <p>
                Dados fictícios, operações reais. Escolha um perfil para
                conhecer o sistema.
              </p>
              <div className="demo-roles">
                {(["admin", "teacher", "student"] as Role[]).map((r) => (
                  <Button
                    key={r}
                    disabled={busy}
                    onClick={() => {
                      const e = {
                        admin: "admin@gymflow.demo",
                        teacher: "professor1@gymflow.demo",
                        student: "aluno1@gymflow.demo",
                      }[r];
                      setEmail(e);
                      setPassword("GymFlow@2026!");
                      void login(e, "GymFlow@2026!");
                    }}
                  >
                    {roleNames[r]}
                  </Button>
                ))}
              </div>
              <p>
                Senha demonstrativa:{" "}
                <span className="violet">GymFlow@2026!</span>
              </p>
            </div>
          )}
          <p
            className="dim"
            style={{ textAlign: "center", fontSize: 10, marginTop: 25 }}
          >
            GymFlow · Gestão em movimento.
          </p>
        </div>
      </section>
      {recover && (
        <Modal
          title="Recuperação de senha"
          subtitle="Serviço de e-mail não configurado."
          close={close}
        >
          <div className="modal-content">
            <p className="muted">
              A recuperação automática está indisponível. Nenhum serviço de
              envio de e-mail está conectado.
              {demo
                ? " Na demonstração, utilize a senha informada na tela de acesso."
                : ""}
            </p>
          </div>
          <footer className="modal-footer">
            <Button onClick={close}>Fechar</Button>
          </footer>
        </Modal>
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
