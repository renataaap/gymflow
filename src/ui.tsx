import { type ReactNode, useId, useEffect, useRef, useState } from "react";
import { Dumbbell, Search, ChevronLeft, ChevronRight, X } from "lucide-react";
export const money = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const date = (v?: string | null) =>
  v ? new Date(v.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR") : "—";
export const names = (v: string) =>
  v
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("");
export function Brand() {
  return (
    <div className="brand">
      <span className="brand-symbol">
        <Dumbbell size={24} />
      </span>
      <span className="brand-text">
        gym<em>flow</em>.
      </span>
    </div>
  );
}
export function Button({
  children,
  onClick,
  primary = false,
  small = false,
  danger = false,
  type = "button",
  disabled = false,
  label,
}: {
  children: ReactNode;
  onClick?: () => void;
  primary?: boolean;
  small?: boolean;
  danger?: boolean;
  type?: "button" | "submit";
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      aria-label={label}
      onClick={onClick}
      className={`button ${primary ? "primary" : ""} ${small ? "small" : ""} ${danger ? "danger" : ""}`}
    >
      {children}
    </button>
  );
}
export function Person({ name, email }: { name: string; email?: string }) {
  return (
    <div className="person">
      <span className="avatar">{names(name)}</span>
      <div>
        <strong>{name}</strong>
        {email && <small>{email}</small>}
      </div>
    </div>
  );
}
export function Badge({ value }: { value: string | boolean }) {
  const v = typeof value === "boolean" ? (value ? "Ativo" : "Inativo") : value;
  return (
    <span
      className={`badge ${["Vencido", "Inativo"].includes(v) ? "danger" : v === "Pendente" ? "warn" : v === "Cancelado" ? "neutral" : ""}`}
    >
      {v}
    </span>
  );
}
export function Empty({
  title = "Nenhum registro encontrado",
  text = "Tente outra busca ou cadastre o primeiro registro.",
}: {
  title?: string;
  text?: string;
}) {
  return (
    <div className="empty">
      <Dumbbell size={30} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
export function Heading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="between page-heading">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
export function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className="panel-body">{children}</div>
    </section>
  );
}
export function Stat({
  label,
  value,
  icon,
  foot,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  foot: string;
}) {
  return (
    <article className="stat">
      <div className="stat-head">
        <span>{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <div className="stat-value number">{value}</div>
      <small>{foot}</small>
    </article>
  );
}
export function Field({
  label,
  name,
  value,
  type = "text",
  required = true,
  onChange,
  options,
  full = false,
}: {
  label: string;
  name: string;
  value: string | number;
  type?: string;
  required?: boolean;
  onChange: (v: string) => void;
  options?: { value: string | number; label: string }[];
  full?: boolean;
}) {
  const fieldId = useId();
  return (
    <div className={`field ${full ? "full" : ""}`}>
      <label htmlFor={fieldId}>
        {label}
        {required && <span className="violet"> *</span>}
      </label>
      {options ? (
        <select
          id={fieldId}
          name={name}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {required && <option value="">Selecione…</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea
          id={fieldId}
          name={name}
          required={required}
          maxLength={5000}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={fieldId}
          name={name}
          required={required}
          type={type}
          maxLength={5000}
          step={type === "number" ? "any" : undefined}
          min={type === "number" ? 0 : undefined}
          autoComplete={type === "password" ? "new-password" : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
export function Modal({
  title,
  subtitle,
  children,
  close,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  close: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const titleId = useId();
  useEffect(() => {
    const last = document.activeElement as HTMLElement;
    document.body.style.overflow = "hidden";
    ref.current
      ?.querySelector<HTMLElement>("input,select,textarea,button")
      ?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const all = [
            ...ref.current!.querySelectorAll<HTMLElement>(
              "button,input,select,textarea,a",
            ),
          ].filter(
            (el) => !el.hasAttribute("disabled") && el.offsetParent !== null,
          ),
          first = all[0],
          last = all.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handler);
      last?.focus();
    };
  }, [close]);
  return (
    <div className="modal-backdrop">
      <section
        ref={ref}
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="modal-head">
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            className="icon-button"
            aria-label="Fechar janela"
            onClick={close}
          >
            <X size={18} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
export function Chart({
  data,
  moneyValue = false,
}: {
  data: { label: string; value: number }[];
  moneyValue?: boolean;
}) {
  const uid = useId().replaceAll(":", "");
  if (!data.length) return <Empty title="Sem registros no período" />;
  const max = Math.max(1, ...data.map((d) => d.value)) * 1.2,
    coords = data.map((d, i) => [
      45 + (i * 540) / Math.max(1, data.length - 1),
      15 + 145 - (d.value / max) * 145,
    ]);
  return (
    <div className="chart">
      <svg
        viewBox="0 0 600 190"
        role="img"
        aria-label={moneyValue ? "Receita por mês" : "Evolução por período"}
      >
        <defs>
          <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#9c88ff" stopOpacity=".2" />
            <stop offset="1" stopColor="#9c88ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <g key={v}>
            <line
              x1={45}
              x2={585}
              y1={15 + 145 * v}
              y2={15 + 145 * v}
              stroke="#30303d"
              strokeDasharray="3 5"
            />
            <text x={35} y={19 + 145 * v} textAnchor="end">
              {moneyValue
                ? Math.round((max * (1 - v)) / 1000) + "k"
                : Math.round(max * (1 - v))}
            </text>
          </g>
        ))}
        <polygon
          points={`45,160 ${coords.map((v) => v.join(",")).join(" ")} ${coords.at(-1)![0]},160`}
          fill={`url(#${uid})`}
        />
        <polyline
          points={coords.map((v) => v.join(",")).join(" ")}
          fill="none"
          stroke="#9c88ff"
          strokeWidth="2.4"
        />
        {coords.map(([x, y], i) => (
          <g key={i}>
            <circle
              cx={x}
              cy={y}
              r={4}
              stroke="#b9a9ff"
              fill="#191923"
              strokeWidth={2}
            >
              <title>
                {data[i].label}:{" "}
                {moneyValue ? money(data[i].value) : data[i].value}
              </title>
            </circle>
            <text x={x} y={185} textAnchor="middle">
              {data[i].label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
export function Table<T extends { id: number }>({
  rows,
  headers,
  render,
  search,
  filters,
  filterValue,
  exportRows,
}: {
  rows: T[];
  headers: string[];
  render: (r: T) => ReactNode;
  search: (r: T) => string;
  filters?: string[];
  filterValue?: (r: T) => string;
  exportRows?: (rows: T[]) => void;
}) {
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState(""),
    [sort, setSort] = useState("default"),
    [page, setPage] = useState(1);
  let data = rows.filter(
    (r) =>
      search(r).toLocaleLowerCase().includes(query.toLocaleLowerCase()) &&
      (!filter || filterValue?.(r) === filter),
  );
  if (sort !== "default")
    data = [...data].sort(
      (a, b) =>
        search(a).localeCompare(search(b), "pt-BR") * (sort === "asc" ? 1 : -1),
    );
  const pages = Math.max(1, Math.ceil(data.length / 7)),
    current = Math.min(page, pages);
  return (
    <section className="panel">
      <div className="table-toolbar">
        <div className="search-field">
          <Search size={15} />
          <input
            aria-label="Buscar registros"
            placeholder="Buscar registros…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
        {filters && (
          <select
            aria-label="Filtrar registros"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            {filters.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        )}
        <select
          aria-label="Ordenar registros"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="default">Ordem padrão</option>
          <option value="asc">A → Z</option>
          <option value="desc">Z → A</option>
        </select>
        {exportRows && (
          <Button small onClick={() => exportRows(data)}>
            Exportar CSV
          </Button>
        )}
      </div>
      {data.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {headers.map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.slice((current - 1) * 7, current * 7).map((r) => (
                <tr key={r.id}>{render(r)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty />
      )}
      <footer className="table-foot">
        <span>{data.length} registros</span>
        <div className="pagination">
          <Button
            small
            label="Página anterior"
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
          >
            <ChevronLeft size={14} />
          </Button>
          <span>
            {current} / {pages}
          </span>
          <Button
            small
            label="Próxima página"
            disabled={current === pages}
            onClick={() => setPage(current + 1)}
          >
            <ChevronRight size={14} />
          </Button>
        </div>
      </footer>
    </section>
  );
}
export function csv(
  headers: string[],
  data: (string | number | null)[][],
  name: string,
) {
  const content =
    "\uFEFF" +
    [headers, ...data]
      .map((row) =>
        row
          .map((v) => {
            let s = String(v ?? "");
            if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
            return '"' + s.replaceAll('"', '""') + '"';
          })
          .join(";"),
      )
      .join("\r\n");
  const url = URL.createObjectURL(
      new Blob([content], { type: "text/csv;charset=utf-8" }),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
