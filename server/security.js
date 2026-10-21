import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(scryptCallback);
export const token = () => randomBytes(32).toString("base64url");
export const hash = (value) => createHash("sha256").update(value).digest("hex");
export async function passwordHash(value) {
  const salt = randomBytes(16).toString("hex");
  return (
    salt + ":" + Buffer.from(await scrypt(value, salt, 64)).toString("hex")
  );
}
export async function passwordOK(value, stored) {
  if (!stored) return false;
  const [salt, key] = stored.split(":");
  const derived = Buffer.from(await scrypt(value, salt, 64));
  const expected = Buffer.from(key, "hex");
  return (
    derived.length === expected.length && timingSafeEqual(derived, expected)
  );
}
export function same(a, b) {
  const x = Buffer.from(a || ""),
    y = Buffer.from(b || "");
  return x.length === y.length && timingSafeEqual(x, y);
}
export class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const fail = (status, message) => {
  throw new AppError(status, message);
};
export const role = (user, ...allowed) => {
  if (!allowed.includes(user.role))
    fail(403, "Seu perfil não permite esta operação.");
};
export function text(data, key, min = 1, max = 5000) {
  const v = data[key];
  if (typeof v !== "string" || v.trim().length < min || v.trim().length > max)
    fail(400, `Confira o campo ${key}.`);
  return v.trim();
}
export function number(data, key, min = 0, max = 100000, integer = false) {
  const raw = data[key],
    v = Number(raw);
  if (
    raw === null ||
    raw === "" ||
    raw === undefined ||
    !Number.isFinite(v) ||
    v < min ||
    v > max ||
    (integer && !Number.isInteger(v))
  )
    fail(400, `Valor inválido: ${key}.`);
  return v;
}
export const id = (data, key) => number(data, key, 1, 2147483647, true);
export function bool(data, key, fallback) {
  if (data[key] === undefined && fallback !== undefined) return fallback;
  if ([true, 1, "1"].includes(data[key])) return true;
  if ([false, 0, "0"].includes(data[key])) return false;
  fail(400, `Valor inválido: ${key}.`);
}
export function date(data, key) {
  const v = text(data, key, 10, 10);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(v) ||
    Number.isNaN(Date.parse(v)) ||
    new Date(v).toISOString().slice(0, 10) !== v
  )
    fail(400, `Confira a data: ${key}.`);
  return v;
}
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const clock = () =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
