import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export function money(amount: number | string | null | undefined) {
  const value = Number(amount ?? 0);
  return `S/ ${value.toLocaleString("es-PE", { minimumFractionDigits: value % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;
}

export function toDate(fecha: string) {
  return parseISO(`${fecha}T00:00:00`);
}

export function dayLabel(fecha: string) {
  return format(toDate(fecha), "EEE d 'de' MMM", { locale: es });
}

export function shortDay(fecha: string) {
  return format(toDate(fecha), "EEE d MMM", { locale: es });
}

export function longDay(fecha: string) {
  return format(toDate(fecha), "EEEE d 'de' MMMM", { locale: es });
}

export function hour(time: string) {
  const [h, m] = time.split(":");
  const hn = Number(h);
  const suffix = hn >= 12 ? "pm" : "am";
  const h12 = hn % 12 === 0 ? 12 : hn % 12;
  return `${h12}:${m} ${suffix}`;
}

export function todayISO() {
  const now = new Date();
  return format(now, "yyyy-MM-dd");
}

export function isToday(fecha: string) {
  return fecha === todayISO();
}

export function relativeDay(fecha: string) {
  if (isToday(fecha)) return "Hoy";
  return shortDay(fecha);
}

export function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function seatsLabel(n: number) {
  if (n <= 0) return "Completa";
  return n === 1 ? "1 lugar" : `${n} lugares`;
}

export function initials(first: string, last: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}
