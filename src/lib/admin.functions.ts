import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SESSION_FIELDS =
  "id, fecha, hora_inicio, hora_fin, capacidad_maxima, precio_por_persona, ubicacion, estado, notas_internas, descripcion_publica";
const RESERVATION_FIELDS =
  "id, booking_code, session_id, customer_id, guest_count, subtotal, discount, total, reservation_status, payment_status, source, notes, dietary_notes, checked_in_at, cancelled_at, cancellation_reason, created_at, attendance_status, attendance_at, attendance_by, confirmation_email_sent_at";
const CUSTOMER_FIELDS =
  "id, first_name, last_name, email, phone, instagram, birthday, acquisition_source, notes, created_at";

export const ensureStaffRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("ensure_staff_role");
    if (error) throw new Error(error.message);
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    return { role: (roles?.[0]?.role ?? data ?? null) as string | null };
  });

/* ---------------------------------- data ---------------------------------- */

export const getWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [sessions, reservations, customers, payments, blocks, refunds] = await Promise.all([
      context.supabase.from("sessions").select(SESSION_FIELDS).order("fecha").order("hora_inicio"),
      context.supabase.from("reservations").select(RESERVATION_FIELDS).order("created_at", { ascending: false }),
      context.supabase.from("customers").select(CUSTOMER_FIELDS).order("first_name"),
      context.supabase.from("payments").select("id, reservation_id, amount, payment_method, paid_at, transaction_reference, notes, status, confirmed_at, created_at, status_updated_at").order("paid_at", { ascending: false }),
      context.supabase.from("seat_blocks").select("id, session_id, quantity, reason, notes, created_at"),
      context.supabase
        .from("refunds")
        .select("id, payment_id, reservation_id, customer_id, original_amount, amount, reason, status, processed_by, created_at")
        .order("created_at", { ascending: false }),
    ]);
    const err = sessions.error || reservations.error || customers.error || payments.error || blocks.error || refunds.error;
    if (err) throw new Error(err.message);
    return {
      sessions: sessions.data ?? [],
      reservations: reservations.data ?? [],
      customers: customers.data ?? [],
      payments: payments.data ?? [],
      blocks: blocks.data ?? [],
      refunds: refunds.data ?? [],
    };
  });

export const getSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("settings").select("*").eq("id", true).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

const settingsInput = z.object({
  business_name: z.string().trim().min(1).max(120),
  logo_url: z.string().trim().max(300).optional().default(""),
  address: z.string().trim().max(200).optional().default(""),
  currency: z.string().trim().min(1).max(10),
  timezone: z.string().trim().min(1).max(60),
  default_capacity: z.number().int().min(1).max(50),
  default_price: z.number().min(0).max(100000),
  payment_methods: z.array(z.string().max(40)).max(12),
  cancellation_policy: z.string().trim().max(1000).optional().default(""),
  confirmation_text: z.string().trim().max(2000).optional().default(""),
  payment_instructions: z.string().trim().max(4000).optional().default(""),
  whatsapp_message_template: z.string().trim().max(2000).optional().default(""),
});

export const saveSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => settingsInput.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("settings").update(data).eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* -------------------------------- sessions -------------------------------- */

const sessionInput = z.object({
  id: z.string().uuid().optional(),
  fecha: z.string().min(8),
  hora_inicio: z.string().min(4),
  hora_fin: z.string().min(4),
  capacidad_maxima: z.number().int().min(1).max(50),
  precio_por_persona: z.number().min(0).max(100000),
  ubicacion: z.string().trim().min(1).max(120),
  estado: z.enum(["draft", "published", "full", "closed", "cancelled"]),
  descripcion_publica: z.string().trim().max(800).optional().default(""),
  notas_internas: z.string().trim().max(800).optional().default(""),
});

export const saveSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => sessionInput.parse(data))
  .handler(async ({ data, context }) => {
    const { id, ...payload } = data;
    if (id) {
      const { error } = await context.supabase.from("sessions").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
      await context.supabase.from("audit_logs").insert({
        user_id: context.userId,
        action: "update_session",
        entity_type: "session",
        entity_id: id,
        new_values: payload,
      });
      return { id };
    }
    const { data: created, error } = await context.supabase
      .from("sessions")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id };
  });

export const blockSeats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        session_id: z.string().uuid(),
        quantity: z.number().int().min(1).max(50),
        reason: z.enum(["invitado", "influencer", "equipo", "prensa", "cortesia", "otro"]),
        notes: z.string().trim().max(300).optional().default(""),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("seat_blocks").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeBlock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("seat_blocks").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------- reservations ------------------------------ */

export const createReservationAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        sessionId: z.string().uuid(),
        customerId: z.string().uuid().optional(),
        firstName: z.string().trim().max(80).optional().default(""),
        lastName: z.string().trim().max(80).optional().default(""),
        email: z.string().trim().max(160).optional().default(""),
        phone: z.string().trim().max(30).optional().default(""),
        guestCount: z.number().int().min(1).max(20),
        reservationStatus: z.enum(["pending", "confirmed", "attended", "no_show", "cancelled"]),
        paymentStatus: z.enum(["pending", "partial", "paid", "refunded", "complimentary"]),
        notes: z.string().trim().max(500).optional().default(""),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { sendReservationPaymentInstructionsEmail, sendInternalNewReservationEmail } = await import(
      "@/lib/admin.server"
    );
    const args = {
      _session_id: data.sessionId,
      _first_name: data.firstName || "Invitado",
      _last_name: data.lastName,
      _email: data.email,
      _phone: data.phone,
      _guest_count: data.guestCount,
      _notes: data.notes,
      _dietary_notes: "",
      _source: "admin",
      _reservation_status: data.reservationStatus,
      _payment_status: data.paymentStatus,
      ...(data.customerId ? { _customer_id: data.customerId } : {}),
    };
    const { data: res, error } = await context.supabase.rpc("create_reservation", args);
    if (error) throw new Error(error.message);
    const reservation = res as unknown as { id: string; booking_code: string };
    const shouldSendPaymentInstructions =
      data.reservationStatus === "pending" && (data.paymentStatus === "pending" || data.paymentStatus === "partial");
    const email = shouldSendPaymentInstructions
      ? await sendReservationPaymentInstructionsEmail(context.supabase, reservation.id)
      : { sent: false, reason: "not_pending_payment" };
    try {
      await sendInternalNewReservationEmail(context.supabase, reservation.id);
    } catch (err) {
      console.error("internal_new_reservation_email_failed", err);
    }
    return { bookingCode: reservation.booking_code, email };
  });

export const moveReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ reservationId: z.string().uuid(), sessionId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("move_reservation", {
      _reservation_id: data.reservationId,
      _new_session_id: data.sessionId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const cancelReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ reservationId: z.string().uuid(), reason: z.string().trim().min(1).max(200) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("cancel_reservation", {
      _reservation_id: data.reservationId,
      _reason: data.reason,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const registerPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        reservationId: z.string().uuid(),
        amount: z.number().min(0.01).max(100000),
        method: z.enum([
          "yape",
          "plin",
          "bank_transfer",
          "card",
          "payment_link",
          "cash",
          "complimentary",
          "other",
        ]),
        paidAt: z.string().min(8),
        reference: z.string().trim().max(120).optional().default(""),
        notes: z.string().trim().max(300).optional().default(""),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { sendPaymentConfirmedEmail } = await import("@/lib/admin.server");
    const { error } = await context.supabase.rpc("register_payment", {
      _reservation_id: data.reservationId,
      _amount: data.amount,
      _method: data.method,
      _paid_at: new Date(`${data.paidAt}T12:00:00`).toISOString(),
      _reference: data.reference,
      _notes: data.notes,
    });
    if (error) throw new Error(error.message);
    const [{ data: reservation }, { data: payment }] = await Promise.all([
      context.supabase
        .from("reservations")
        .select("payment_status, reservation_status")
        .eq("id", data.reservationId)
        .maybeSingle(),
      context.supabase
        .from("payments")
        .select("id")
        .eq("reservation_id", data.reservationId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    const ready =
      reservation?.reservation_status === "confirmed" &&
      (reservation.payment_status === "paid" || reservation.payment_status === "complimentary");
    const email =
      ready && payment
        ? await sendPaymentConfirmedEmail(context.supabase, payment.id)
        : { sent: false, reason: "payment_not_complete" };
    return { ok: true, email };
  });

export const setAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        reservationId: z.string().uuid(),
        status: z.enum(["pending", "arrived", "no_show"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { logAudit } = await import("@/lib/admin.server");
    const { data: before } = await context.supabase
      .from("reservations")
      .select("attendance_status")
      .eq("id", data.reservationId)
      .maybeSingle();

    const now = new Date().toISOString();
    const patch =
      data.status === "pending"
        ? {
            attendance_status: "pending" as const,
            attendance_at: null,
            attendance_by: null,
            checked_in_at: null,
            checked_in_by: null,
          }
        : {
            attendance_status: data.status,
            attendance_at: now,
            attendance_by: context.userId,
            ...(data.status === "arrived"
              ? { checked_in_at: now, checked_in_by: context.userId }
              : { checked_in_at: null, checked_in_by: null }),
          };

    const { error } = await context.supabase.from("reservations").update(patch).eq("id", data.reservationId);
    if (error) throw new Error(error.message);

    await logAudit(context.supabase, context.userId, {
      action: "set_attendance",
      entityType: "reservation",
      entityId: data.reservationId,
      oldValues: { attendance_status: before?.attendance_status ?? null },
      newValues: { attendance_status: data.status, at: now },
    });
    return { ok: true };
  });

/* ---------------------------- edit reservation ----------------------------- */

export const updateReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        reservationId: z.string().uuid(),
        sessionId: z.string().uuid(),
        firstName: z.string().trim().min(1).max(80),
        lastName: z.string().trim().max(80).optional().default(""),
        email: z.string().trim().max(160).optional().default(""),
        phone: z.string().trim().max(30).optional().default(""),
        guestCount: z.number().int().min(1).max(20),
        notes: z.string().trim().max(500).optional().default(""),
        reservationStatus: z.enum(["pending", "confirmed", "attended", "no_show", "cancelled"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { logAudit } = await import("@/lib/admin.server");

    const { data: before, error: loadError } = await context.supabase
      .from("reservations")
      .select("id, session_id, customer_id, guest_count, notes, reservation_status, discount")
      .eq("id", data.reservationId)
      .maybeSingle();
    if (loadError) throw new Error(loadError.message);
    if (!before) throw new Error("Reserva no encontrada");

    // Session change goes through the safe RPC (capacity checks + audit trail).
    if (before.session_id !== data.sessionId) {
      const { error } = await context.supabase.rpc("move_reservation", {
        _reservation_id: data.reservationId,
        _new_session_id: data.sessionId,
      });
      if (error) throw new Error(error.message);
    }

    const { data: session } = await context.supabase
      .from("sessions")
      .select("precio_por_persona, capacidad_maxima")
      .eq("id", data.sessionId)
      .maybeSingle();

    if (data.guestCount !== before.guest_count) {
      const { data: available } = await context.supabase.rpc("session_available", {
        _session_id: data.sessionId,
      });
      const room = Number(available ?? 0) + (before.session_id === data.sessionId ? before.guest_count : 0);
      if (data.guestCount > room) throw new Error(`Solo quedan ${room} lugares en esa sesión`);
    }

    const price = Number(session?.precio_por_persona ?? 0);
    const subtotal = price * data.guestCount;
    const discount = Number(before.discount ?? 0);

    const cancelling = data.reservationStatus === "cancelled" && before.reservation_status !== "cancelled";
    const patch = {
      guest_count: data.guestCount,
      notes: data.notes,
      subtotal,
      total: subtotal - discount,
      reservation_status: data.reservationStatus,
      ...(cancelling ? { cancelled_at: new Date().toISOString() } : {}),
    };

    const { error } = await context.supabase
      .from("reservations")
      .update(patch)
      .eq("id", data.reservationId);
    if (error) throw new Error(error.message);

    const { error: customerError } = await context.supabase
      .from("customers")
      .update({
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email || null,
        phone: data.phone || null,
      })
      .eq("id", before.customer_id);
    if (customerError) throw new Error(customerError.message);

    await logAudit(context.supabase, context.userId, {
      action: "update_reservation",
      entityType: "reservation",
      entityId: data.reservationId,
      oldValues: {
        session_id: before.session_id,
        guest_count: before.guest_count,
        reservation_status: before.reservation_status,
        notes: before.notes,
      },
      newValues: {
        session_id: data.sessionId,
        guest_count: data.guestCount,
        reservation_status: data.reservationStatus,
        notes: data.notes,
      },
    });

    return { ok: true, email: { sent: false, reason: "confirmation_requires_payment_validation" } };
  });

export const confirmReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ reservationId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { logAudit } = await import("@/lib/admin.server");
    const { data: before } = await context.supabase
      .from("reservations")
      .select("reservation_status")
      .eq("id", data.reservationId)
      .maybeSingle();
    if (!before) throw new Error("Reserva no encontrada");
    if (before.reservation_status === "confirmed") return { ok: true, email: { sent: false } };

    const { error } = await context.supabase
      .from("reservations")
      .update({ reservation_status: "confirmed" })
      .eq("id", data.reservationId);
    if (error) throw new Error(error.message);

    await logAudit(context.supabase, context.userId, {
      action: "confirm_reservation",
      entityType: "reservation",
      entityId: data.reservationId,
      oldValues: { reservation_status: before.reservation_status },
      newValues: { reservation_status: "confirmed" },
    });

    return { ok: true, email: { sent: false, reason: "confirmation_requires_payment_validation" } };
  });

/* ----------------------------- payments admin ------------------------------ */

export const updatePaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        paymentId: z.string().uuid(),
        status: z.enum(["pending", "paid", "refunded", "partially_refunded", "cancelled"]),
        notes: z.string().trim().max(300).optional().default(""),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { logAudit, sendPaymentConfirmedEmail } = await import("@/lib/admin.server");
    const { data: before } = await context.supabase
      .from("payments")
      .select("id, status, notes, reservation_id")
      .eq("id", data.paymentId)
      .maybeSingle();
    if (!before) throw new Error("Pago no encontrado");

    const now = new Date().toISOString();
    const patch = {
      status: data.status,
      status_updated_at: now,
      status_updated_by: context.userId,
      ...(data.status === "paid" ? { confirmed_at: now } : {}),
      ...(data.notes ? { notes: [before.notes, data.notes].filter(Boolean).join("\n") } : {}),
    };

    const { error } = await context.supabase.from("payments").update(patch).eq("id", data.paymentId);
    if (error) throw new Error(error.message);

    await logAudit(context.supabase, context.userId, {
      action: "update_payment_status",
      entityType: "payment",
      entityId: data.paymentId,
      oldValues: { status: before.status },
      newValues: { status: data.status, at: now },
    });

    const [{ data: reservation }, { data: payments }] = await Promise.all([
      context.supabase
        .from("reservations")
        .select("id, total, payment_status, reservation_status")
        .eq("id", before.reservation_id)
        .maybeSingle(),
      context.supabase
        .from("payments")
        .select("amount, status")
        .eq("reservation_id", before.reservation_id),
    ]);
    const paidTotal = (payments ?? [])
      .filter((payment) => payment.status === "paid")
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
    const isFullyPaid = Boolean(reservation) && paidTotal >= Number(reservation?.total ?? 0);
    if (reservation) {
      await context.supabase
        .from("reservations")
        .update({
          payment_status: isFullyPaid ? "paid" : paidTotal > 0 ? "partial" : "pending",
          reservation_status:
            isFullyPaid && reservation.reservation_status === "pending" ? "confirmed" : reservation.reservation_status,
        })
        .eq("id", before.reservation_id);
    }

    let email: { sent: boolean; reason?: string } = { sent: false, reason: "no_transition" };
    if (data.status === "paid" && before.status !== "paid" && isFullyPaid) {
      email = await sendPaymentConfirmedEmail(context.supabase, data.paymentId);
    }
    return { ok: true, email };
  });

export const createRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        paymentId: z.string().uuid(),
        amount: z.number().min(0.01).max(1000000),
        reason: z.string().trim().min(1).max(300),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { logAudit, refundStatus } = await import("@/lib/admin.server");

    const { data: payment } = await context.supabase
      .from("payments")
      .select("id, reservation_id, amount")
      .eq("id", data.paymentId)
      .maybeSingle();
    if (!payment) throw new Error("Pago no encontrado");

    const { data: previous } = await context.supabase
      .from("refunds")
      .select("amount")
      .eq("payment_id", data.paymentId);
    const already = (previous ?? []).reduce((sum, r) => sum + Number(r.amount), 0);
    const paid = Number(payment.amount);
    const remaining = paid - already;
    if (data.amount > remaining + 0.001) {
      throw new Error(`Solo puedes devolver hasta ${remaining.toFixed(2)}`);
    }

    const { data: reservation } = await context.supabase
      .from("reservations")
      .select("customer_id")
      .eq("id", payment.reservation_id)
      .maybeSingle();

    const { data: created, error } = await context.supabase
      .from("refunds")
      .insert({
        payment_id: data.paymentId,
        reservation_id: payment.reservation_id,
        customer_id: reservation?.customer_id ?? null,
        original_amount: paid,
        amount: data.amount,
        reason: data.reason,
        status: "processed",
        processed_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const totalRefunded = already + data.amount;
    const status = refundStatus(paid, totalRefunded);
    await context.supabase
      .from("payments")
      .update({ status, status_updated_at: new Date().toISOString(), status_updated_by: context.userId })
      .eq("id", data.paymentId);

    if (status === "refunded") {
      await context.supabase
        .from("reservations")
        .update({ payment_status: "refunded" })
        .eq("id", payment.reservation_id);
    }

    await logAudit(context.supabase, context.userId, {
      action: "create_refund",
      entityType: "payment",
      entityId: data.paymentId,
      oldValues: { refunded: already },
      newValues: { refunded: totalRefunded, amount: data.amount, reason: data.reason, refund_id: created.id },
    });

    return { ok: true, refundId: created.id, status };
  });

/* ------------------------------ email templates ---------------------------- */

export const getEmailTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("email_templates")
      .select("id, template_key, name, subject, title, body, signature, extra_info, enabled, updated_at")
      .order("template_key");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveEmailTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        subject: z.string().trim().min(1).max(200),
        title: z.string().trim().max(200).optional().default(""),
        body: z.string().trim().max(6000).optional().default(""),
        signature: z.string().trim().max(1000).optional().default(""),
        extra_info: z.string().trim().max(2000).optional().default(""),
        enabled: z.boolean(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { requireAdmin, logAudit } = await import("@/lib/admin.server");
    await requireAdmin(context.supabase, context.userId);
    const { id, ...payload } = data;
    const { error } = await context.supabase.from("email_templates").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
    await logAudit(context.supabase, context.userId, {
      action: "update_email_template",
      entityType: "email_template",
      entityId: id,
      newValues: { subject: payload.subject, enabled: payload.enabled },
    });
    return { ok: true };
  });

/* --------------------------------- users ----------------------------------- */

export const listStaffUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: users, error }, { data: roles }] = await Promise.all([
      context.supabase
        .from("staff_users")
        .select("id, user_id, email, full_name, active, modules, created_at")
        .order("created_at"),
      context.supabase.from("user_roles").select("user_id, role"),
    ]);
    if (error) throw new Error(error.message);
    const roleByUser = new Map((roles ?? []).map((r) => [r.user_id, r.role]));
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return {
      isAdmin: Boolean(isAdmin),
      currentUserId: context.userId,
      users: (users ?? []).map((u) => ({ ...u, role: (roleByUser.get(u.user_id) ?? "operator") as string })),
    };
  });

export const getMyAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: isAdmin }, { data: me }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase
        .from("staff_users")
        .select("modules, active")
        .eq("user_id", context.userId)
        .maybeSingle(),
    ]);
    return {
      isAdmin: Boolean(isAdmin),
      modules: (me?.modules ?? null) as string[] | null,
    };
  });

export const createStaffUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        email: z.string().trim().email().max(160),
        password: z.string().min(8).max(72),
        fullName: z.string().trim().max(120).optional().default(""),
        role: z.enum(["admin", "operator"]),
        modules: z.array(z.string().max(40)).max(40).optional().default([]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { requireAdmin, logAudit } = await import("@/lib/admin.server");
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error) throw new Error(error.message);
    const userId = created.user?.id;
    if (!userId) throw new Error("No pudimos crear el usuario");

    await supabaseAdmin.from("staff_users").insert({
      user_id: userId,
      email: data.email,
      full_name: data.fullName,
      active: true,
      modules: data.modules,
    });
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: data.role });

    await logAudit(context.supabase, context.userId, {
      action: "create_staff_user",
      entityType: "staff_user",
      entityId: userId,
      newValues: { email: data.email, role: data.role },
    });
    return { ok: true, userId };
  });

export const updateStaffUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        fullName: z.string().trim().max(120).optional().default(""),
        role: z.enum(["admin", "operator"]),
        active: z.boolean(),
        modules: z.array(z.string().max(40)).max(40).optional().default([]),
        password: z.string().max(72).optional().default(""),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { requireAdmin, logAudit } = await import("@/lib/admin.server");
    await requireAdmin(context.supabase, context.userId);
    if (data.userId === context.userId && !data.active) {
      throw new Error("No puedes desactivar tu propio acceso");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: before } = await supabaseAdmin
      .from("staff_users")
      .select("full_name, active, modules")
      .eq("user_id", data.userId)
      .maybeSingle();

    const { error } = await supabaseAdmin
      .from("staff_users")
      .update({ full_name: data.fullName, active: data.active, modules: data.modules })
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: data.role });

    if (data.password && data.password.length >= 8) {
      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
        password: data.password,
      });
      if (passwordError) throw new Error(passwordError.message);
    }

    await logAudit(context.supabase, context.userId, {
      action: "update_staff_user",
      entityType: "staff_user",
      entityId: data.userId,
      oldValues: { full_name: before?.full_name ?? null, active: before?.active ?? null },
      newValues: { full_name: data.fullName, active: data.active, role: data.role, modules: data.modules },
    });
    return { ok: true };
  });

/* -------------------------------- customers -------------------------------- */

export const saveCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        first_name: z.string().trim().min(1).max(80),
        last_name: z.string().trim().max(80).optional().default(""),
        email: z.string().trim().max(160).optional().default(""),
        phone: z.string().trim().max(30).optional().default(""),
        instagram: z.string().trim().max(60).optional().default(""),
        acquisition_source: z.string().trim().max(60).optional().default(""),
        notes: z.string().trim().max(500).optional().default(""),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { id, ...payload } = data;
    if (id) {
      const { error } = await context.supabase.from("customers").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: created, error } = await context.supabase
      .from("customers")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id };
  });

/* ------------------------------- email test ------------------------------- */

export const sendTestEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        template: z.enum(["reservation_confirmed", "payment_confirmed"]),
        to: z.string().trim().email().max(160),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { requireAdmin, sendTestTemplateEmail, logAudit } = await import("./admin.server");
    await requireAdmin(context.supabase, context.userId);
    const result = await sendTestTemplateEmail(context.supabase, data.template, data.to);
    await logAudit(context.supabase, context.userId, {
      action: "send_test_email",
      entityType: "email_template",
      entityId: data.template,
      newValues: { to: data.to, sent: result.sent, reason: result.reason ?? null },
    });
    return result;
  });
