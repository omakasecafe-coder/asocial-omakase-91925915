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
  confirmation_text: z.string().trim().max(1000).optional().default(""),
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
    return { bookingCode: (res as unknown as { booking_code: string }).booking_code };
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
    const { error } = await context.supabase.rpc("register_payment", {
      _reservation_id: data.reservationId,
      _amount: data.amount,
      _method: data.method,
      _paid_at: new Date(`${data.paidAt}T12:00:00`).toISOString(),
      _reference: data.reference,
      _notes: data.notes,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        reservationId: z.string().uuid(),
        status: z.enum(["attended", "no_show", "confirmed"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const patch =
      data.status === "attended"
        ? {
            reservation_status: "attended" as const,
            checked_in_at: new Date().toISOString(),
            checked_in_by: context.userId,
          }
        : data.status === "no_show"
          ? { reservation_status: "no_show" as const }
          : { reservation_status: "confirmed" as const, checked_in_at: null, checked_in_by: null };
    const { error } = await context.supabase.from("reservations").update(patch).eq("id", data.reservationId);
    if (error) throw new Error(error.message);
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
