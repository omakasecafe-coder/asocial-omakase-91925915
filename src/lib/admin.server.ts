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

/** Sends the reservation-confirmed email once per reservation. */
export async function sendReservationConfirmedEmail(supabase: DB, reservationId: string) {
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
    idempotencyKey: `reservation-confirmed-${reservationId}`,
    label: "reservation_confirmed",
  });
  if (result.sent) {
    await supabase
      .from("reservations")
      .update({ confirmation_email_sent_at: new Date().toISOString() })
      .eq("id", reservationId);
  }
  return result;
}

/** Sends the payment-confirmed email once per payment. */
export async function sendPaymentConfirmedEmail(supabase: DB, paymentId: string) {
  const { data: payment } = await supabase
    .from("payments")
    .select("id, reservation_id, amount, status, email_sent_at")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment || payment.email_sent_at || payment.status !== "paid") {
    return { sent: false, reason: "already_sent_or_not_paid" };
  }

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
