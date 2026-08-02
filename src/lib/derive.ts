import { todayISO } from "@/lib/format";
import type { Workspace, SessionRow, ReservationRow } from "@/lib/queries";

export const ACTIVE_STATUSES = ["pending", "confirmed", "attended", "no_show"];

export function sessionStats(ws: Workspace, session: SessionRow) {
  const reserved = ws.reservations
    .filter((r) => r.session_id === session.id && r.reservation_status !== "cancelled")
    .reduce((sum, r) => sum + r.guest_count, 0);
  const blocked = ws.blocks
    .filter((b) => b.session_id === session.id)
    .reduce((sum, b) => sum + b.quantity, 0);
  const available = Math.max(session.capacidad_maxima - reserved - blocked, 0);
  const occupancy = session.capacidad_maxima > 0 ? reserved / session.capacidad_maxima : 0;
  return { reserved, blocked, available, occupancy };
}

export function paidAmount(ws: Workspace, reservationId: string) {
  return ws.payments
    .filter((p) => p.reservation_id === reservationId)
    .reduce((sum, p) => sum + Number(p.amount), 0);
}

export function customerName(ws: Workspace, id: string) {
  const c = ws.customers.find((x) => x.id === id);
  return c ? `${c.first_name} ${c.last_name}`.trim() : "Cliente";
}

export function sessionLabelKey(s: SessionRow) {
  return `${s.fecha}T${s.hora_inicio}`;
}

export function upcomingSessions(ws: Workspace) {
  const today = todayISO();
  return ws.sessions
    .filter((s) => s.fecha >= today && s.estado !== "cancelled")
    .sort((a, b) => sessionLabelKey(a).localeCompare(sessionLabelKey(b)));
}

export function isValidReservation(r: ReservationRow) {
  return r.reservation_status !== "cancelled";
}

export function dashboardMetrics(ws: Workspace) {
  const today = todayISO();
  const todaySessions = ws.sessions.filter((s) => s.fecha === today && s.estado !== "cancelled");
  const todayIds = new Set(todaySessions.map((s) => s.id));
  const todayReservations = ws.reservations.filter(
    (r) => todayIds.has(r.session_id) && isValidReservation(r),
  );
  const capacity = todaySessions.reduce((sum, s) => sum + s.capacidad_maxima, 0);
  const reserved = todayReservations.reduce((sum, r) => sum + r.guest_count, 0);
  const collectedToday = ws.payments
    .filter((p) => (p.paid_at ?? "").slice(0, 10) === today)
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const pendingAmount = ws.reservations
    .filter((r) => isValidReservation(r) && (r.payment_status === "pending" || r.payment_status === "partial"))
    .reduce((sum, r) => sum + (Number(r.total) - paidAmount(ws, r.id)), 0);

  const attendedByCustomer = new Map<string, number>();
  for (const r of ws.reservations) {
    if (r.reservation_status === "attended" || r.reservation_status === "confirmed") {
      attendedByCustomer.set(r.customer_id, (attendedByCustomer.get(r.customer_id) ?? 0) + 1);
    }
  }
  const recurring = [...attendedByCustomer.values()].filter((n) => n >= 2).length;

  return {
    todaySessions,
    todaySessionCount: todaySessions.length,
    occupancy: capacity > 0 ? reserved / capacity : 0,
    reserved,
    capacity,
    collectedToday,
    pendingAmount,
    customers: ws.customers.length,
    recurring,
  };
}

export function customerStats(ws: Workspace, customerId: string) {
  const list = ws.reservations.filter((r) => r.customer_id === customerId);
  const attended = list.filter((r) => r.reservation_status === "attended");
  const cancelled = list.filter((r) => r.reservation_status === "cancelled");
  const noShows = list.filter((r) => r.reservation_status === "no_show");
  const spend = list.reduce((sum, r) => sum + paidAmount(ws, r.id), 0);
  const dates = list
    .map((r) => ws.sessions.find((s) => s.id === r.session_id)?.fecha)
    .filter((d): d is string => Boolean(d))
    .sort();
  return {
    reservations: list,
    total: list.length,
    attended: attended.length,
    cancelled: cancelled.length,
    noShows: noShows.length,
    spend,
    firstVisit: dates[0] ?? null,
    lastVisit: dates.length ? dates[dates.length - 1] : null,
  };
}

export function reportMetrics(ws: Workspace, from: string, to: string) {
  const sessions = ws.sessions.filter((s) => s.fecha >= from && s.fecha <= to && s.estado !== "cancelled");
  const ids = new Set(sessions.map((s) => s.id));
  const reservations = ws.reservations.filter((r) => ids.has(r.session_id));
  const valid = reservations.filter(isValidReservation);
  const guests = valid.reduce((sum, r) => sum + r.guest_count, 0);
  const revenue = reservations.reduce((sum, r) => sum + paidAmount(ws, r.id), 0);
  const capacity = sessions.reduce((sum, s) => sum + s.capacidad_maxima, 0);
  const noShows = reservations.filter((r) => r.reservation_status === "no_show").length;
  const cancelled = reservations.filter((r) => r.reservation_status === "cancelled").length;

  const customerIds = new Set(valid.map((r) => r.customer_id));
  let newCustomers = 0;
  let repeatCustomers = 0;
  for (const id of customerIds) {
    const all = ws.reservations.filter((r) => r.customer_id === id && isValidReservation(r));
    if (all.length > 1) repeatCustomers += 1;
    else newCustomers += 1;
  }

  return {
    revenue,
    reservations: valid.length,
    guests,
    occupancy: capacity > 0 ? guests / capacity : 0,
    averageTicket: valid.length > 0 ? revenue / valid.length : 0,
    revenuePerGuest: guests > 0 ? revenue / guests : 0,
    noShowRate: reservations.length > 0 ? noShows / reservations.length : 0,
    cancellationRate: reservations.length > 0 ? cancelled / reservations.length : 0,
    newCustomers,
    repeatCustomers,
  };
}
