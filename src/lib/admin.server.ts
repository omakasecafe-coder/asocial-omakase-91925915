/**
 * Server-only helpers used by src/lib/admin.functions.ts.
 * Keeping them out of the server-function module avoids runtime-splitting issues.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendTemplateEmail, type TemplateRow } from "./email.server";

type DB = SupabaseClient<any, "public", any>;

export async function requireAdmin(supabase: DB, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Solo un administrador puede realizar esta acción");
  return true;
}

export async function logAudit(
  supabase: DB,
  userId: string,
  args: {
    action: string;
    entityType: string;
    entityId: string;
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
  },
) {
  await supabase.from("audit_logs").insert({
    user_id: userId,
    action: args.action,
    entity_type: args.entityType,
    entity_id: args.entityId,
    old_values: args.oldValues ?? null,
    new_values: args.newValues ?? null,
  });
}

const money = (value: number, currency = "PEN") =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency, minimumFractionDigits: 0 }).format(value);

const longDate = (iso: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "full", timeZone: "UTC" }).format(
    new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)),
  );
};

const reservationStatusEs: Record<string, string> = {
  pending: "Por confirmar",
  confirmed: "Confirmada",
  attended: "Asistió",
  no_show: "No asistió",
  cancelled: "Cancelada",
};

export type EmailContext = {
  email: string;
  vars: Record<string, string>;
};

/** Gathers customer + session data needed to render the automatic emails. */
export async function buildEmailContext(
  supabase: DB,
  reservationId: string,
  extra: Record<string, string> = {},
): Promise<EmailContext | null> {
  const { data: reservation } = await supabase
    .from("reservations")
    .select("id, booking_code, guest_count, total, reservation_status, session_id, customer_id")
    .eq("id", reservationId)
    .maybeSingle();
  if (!reservation) return null;

  const [{ data: customer }, { data: session }, { data: settings }] = await Promise.all([
    supabase
      .from("customers")
      .select("first_name, last_name, email")
      .eq("id", reservation.customer_id)
      .maybeSingle(),
    supabase.from("sessions").select("fecha, hora_inicio").eq("id", reservation.session_id).maybeSingle(),
    supabase.from("settings").select("business_name, currency, payment_instructions").eq("id", true).maybeSingle(),
  ]);

  const currency = settings?.currency ?? "PEN";

  return {
    email: (customer?.email ?? "").trim(),
    vars: {
      customer_name: `${customer?.first_name ?? ""} ${customer?.last_name ?? ""}`.trim() || "Hola",
      reservation_date: longDate(session?.fecha ?? ""),
      reservation_time: (session?.hora_inicio ?? "").slice(0, 5),
      party_size: String(reservation.guest_count),
      reservation_total: money(Number(reservation.total ?? 0), currency),
      reservation_status: reservationStatusEs[reservation.reservation_status] ?? reservation.reservation_status,
      booking_code: reservation.booking_code,
      business_name: settings?.business_name ?? "asocial",
      payment_options: settings?.payment_instructions ?? "",
      ...extra,
    },
  };
}

async function getTemplate(supabase: DB, key: string): Promise<TemplateRow | null> {
  const { data } = await supabase
    .from("email_templates")
    .select("template_key, subject, title, body, signature, extra_info, enabled")
    .eq("template_key", key)
    .maybeSingle();
  return (data as TemplateRow | null) ?? null;
}

/** Sends payment instructions once when a reservation is created. */
export async function sendReservationPaymentInstructionsEmail(supabase: DB, reservationId: string) {
  const { data: row } = await supabase
    .from("reservations")
    .select("confirmation_email_sent_at")
    .eq("id", reservationId)
    .maybeSingle();
  if (!row || row.confirmation_email_sent_at) return { sent: false, reason: "already_sent" };

  const template = await getTemplate(supabase, "reservation_confirmed");
  const ctx = await buildEmailContext(supabase, reservationId);
  if (!template || !ctx) return { sent: false, reason: "missing_data" };

  const result = await sendTemplateEmail({
    template,
    to: ctx.email,
    vars: ctx.vars,
    idempotencyKey: `reservation-payment-instructions-${reservationId}`,
    label: "reservation_payment_instructions",
  });
  if (result.sent) {
    await supabase
      .from("reservations")
      .update({ confirmation_email_sent_at: new Date().toISOString() })
      .eq("id", reservationId);
  }
  return result;
}

/** Sends the final reservation confirmation once a payment has been validated. */
export async function sendPaymentConfirmedEmail(supabase: DB, paymentId: string) {
  const { data: payment } = await supabase
    .from("payments")
    .select("id, reservation_id, amount, status, email_sent_at")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment || payment.email_sent_at || payment.status !== "paid") {
    return { sent: false, reason: "already_sent_or_not_paid" };
  }
  const { data: previousEmail } = await supabase
    .from("payments")
    .select("id")
    .eq("reservation_id", payment.reservation_id)
    .not("email_sent_at", "is", null)
    .limit(1)
    .maybeSingle();
  if (previousEmail) return { sent: false, reason: "reservation_confirmation_already_sent" };

  const template = await getTemplate(supabase, "payment_confirmed");
  const ctx = await buildEmailContext(supabase, payment.reservation_id, {});
  if (!template || !ctx) return { sent: false, reason: "missing_data" };

  const { data: settings } = await supabase.from("settings").select("currency").eq("id", true).maybeSingle();
  const vars = {
    ...ctx.vars,
    payment_amount: money(Number(payment.amount ?? 0), settings?.currency ?? "PEN"),
    payment_status: "Pagado",
  };

  const result = await sendTemplateEmail({
    template,
    to: ctx.email,
    vars,
    idempotencyKey: `payment-confirmed-${paymentId}`,
    label: "payment_confirmed",
  });
  if (result.sent) {
    await supabase.from("payments").update({ email_sent_at: new Date().toISOString() }).eq("id", paymentId);
  }
  return result;
}

/** Recomputes a payment's transaction status after refunds. */
export function refundStatus(amountPaid: number, refunded: number) {
  if (refunded <= 0) return "paid" as const;
  if (refunded >= amountPaid) return "refunded" as const;
  return "partially_refunded" as const;
}

/** Sends a template with sample data to an arbitrary address, for manual testing. */
export async function sendTestTemplateEmail(supabase: DB, key: string, to: string) {
  const template = await getTemplate(supabase, key);
  if (!template) return { sent: false, reason: "template_not_found" };

  const { data: settings } = await supabase
    .from("settings")
    .select("business_name, currency, payment_instructions")
    .eq("id", true)
    .maybeSingle();
  const currency = settings?.currency ?? "PEN";

  const vars: Record<string, string> = {
    customer_name: "Prueba asocial",
    reservation_date: longDate(new Date().toISOString().slice(0, 10)),
    reservation_time: "19:00",
    party_size: "2",
    reservation_total: money(180, currency),
    reservation_status: key === "payment_confirmed" ? reservationStatusEs["confirmed"]! : reservationStatusEs["pending"]!,
    booking_code: "TEST-0001",
    business_name: settings?.business_name ?? "asocial",
    payment_options: settings?.payment_instructions ?? "",
    payment_amount: money(180, currency),
    payment_status: "Pagado",
  };

  return sendTemplateEmail({
    template: { ...template, enabled: true },
    to,
    vars,
    idempotencyKey: `test-${key}-${to}-${Date.now()}`,
    label: `test_${key}`,
  });
}

/* --------------------- internal (staff) notifications --------------------- */

const INTERNAL_NOTIFICATION_TO = "reservas@asocialcafe.com";

const shortDate = (iso: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)),
  );
};

/** Notifies the team by email as soon as a new reservation is created. */
export async function sendInternalNewReservationEmail(supabase: DB, reservationId: string) {
  const { data: reservation } = await supabase
    .from("reservations")
    .select(
      "id, booking_code, guest_count, total, source, notes, dietary_notes, reservation_status, payment_status, session_id, customer_id, created_at",
    )
    .eq("id", reservationId)
    .maybeSingle();
  if (!reservation) return { sent: false, reason: "missing_reservation" };

  const [{ data: customer }, { data: session }, { data: settings }] = await Promise.all([
    supabase
      .from("customers")
      .select("first_name, last_name, email, phone")
      .eq("id", reservation.customer_id)
      .maybeSingle(),
    supabase.from("sessions").select("fecha, hora_inicio, hora_fin").eq("id", reservation.session_id).maybeSingle(),
    supabase.from("settings").select("business_name, currency").eq("id", true).maybeSingle(),
  ]);

  const currency = settings?.currency ?? "PEN";
  const fecha = session?.fecha ?? "";
  const hora = (session?.hora_inicio ?? "").slice(0, 5);
  const customerName = `${customer?.first_name ?? ""} ${customer?.last_name ?? ""}`.trim() || "Sin nombre";

  const subject = `Nueva reserva · ${shortDate(fecha)} · ${hora} · ${reservation.guest_count} ${
    reservation.guest_count === 1 ? "persona" : "personas"
  } · ${reservation.booking_code}`;

  const body = [
    `Código: ${reservation.booking_code}`,
    `Fecha: ${longDate(fecha)}`,
    `Hora: ${hora}${session?.hora_fin ? ` – ${String(session.hora_fin).slice(0, 5)}` : ""}`,
    `Personas: ${reservation.guest_count}`,
    `Total: ${money(Number(reservation.total ?? 0), currency)}`,
    "",
    `Cliente: ${customerName}`,
    `Email: ${customer?.email ?? "—"}`,
    `WhatsApp: ${customer?.phone ?? "—"}`,
    "",
    `Origen: ${reservation.source === "admin" ? "Panel administrativo" : "Web"}`,
    `Estado: ${reservationStatusEs[reservation.reservation_status] ?? reservation.reservation_status}`,
    `Pago: ${reservation.payment_status === "paid" ? "Pagado" : reservation.payment_status === "partial" ? "Pagado parcialmente" : "No pagado"}`,
    reservation.notes ? `\nNotas: ${reservation.notes}` : "",
    reservation.dietary_notes ? `Restricciones: ${reservation.dietary_notes}` : "",
  ]
    .filter((line) => line !== "")
    .join("\n");

  const template: TemplateRow = {
    template_key: "internal_new_reservation",
    subject,
    title: "Nueva reserva recibida",
    body,
    signature: "",
    extra_info: "",
    enabled: true,
  };

  return sendTemplateEmail({
    template,
    to: INTERNAL_NOTIFICATION_TO,
    vars: { business_name: settings?.business_name ?? "asocial" },
    idempotencyKey: `internal-new-reservation-${reservationId}`,
    label: "internal_new_reservation",
  });
}
