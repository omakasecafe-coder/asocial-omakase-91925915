import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const url = process.env["SUPABASE_URL"]!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
          h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export type PublicSession = {
  id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  precio_por_persona: number;
  ubicacion: string;
  descripcion_publica: string | null;
  capacidad_maxima: number;
  available: number;
};

export const getPublicSessions = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient().rpc("public_sessions");
  if (error) throw new Error(error.message);
  return (data ?? []) as PublicSession[];
});

const priceQuoteInput = z.object({
  sessionId: z.string().uuid(),
  guestCount: z.number().int().min(1).max(12),
  promoCode: z.string().trim().max(40).optional().nullable(),
  email: z.string().trim().max(160).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
});

export type PublicPriceQuote = {
  subtotal: number;
  discount: number;
  total: number;
  promotionId: string | null;
  promotionName: string | null;
  promotionCode: string | null;
  promotionApplicationType: "automatic" | "code" | null;
};

export const getPublicPriceQuote = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => priceQuoteInput.parse(data))
  .handler(async ({ data }) => {
    const { data: result, error } = await publicClient().rpc("public_price_quote", {
      _session_id: data.sessionId,
      _guest_count: data.guestCount,
      _promo_code: data.promoCode ?? "",
      _email: data.email ?? "",
      _phone: data.phone ?? "",
    });
    if (error) throw new Error(error.message);
    const row = (Array.isArray(result) ? result[0] : result) as
      | {
          subtotal: number;
          discount: number;
          total: number;
          promotion_id: string | null;
          promotion_name: string | null;
          promotion_code: string | null;
          promotion_application_type: "automatic" | "code" | null;
        }
      | undefined;
    if (!row) throw new Error("No se pudo calcular el total");
    return {
      subtotal: Number(row.subtotal),
      discount: Number(row.discount),
      total: Number(row.total),
      promotionId: row.promotion_id,
      promotionName: row.promotion_name,
      promotionCode: row.promotion_code,
      promotionApplicationType: row.promotion_application_type,
    } satisfies PublicPriceQuote;
  });

const reservationInput = z.object({
  sessionId: z.string().uuid(),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().max(80).default(""),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().min(6).max(30),
  guestCount: z.number().int().min(1).max(12),
  dietary: z.string().trim().max(500).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  promoCode: z.string().trim().max(40).optional().nullable(),
});

export const createPublicReservation = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => reservationInput.parse(data))
  .handler(async ({ data }) => {
    const { data: res, error } = await publicClient().rpc("public_create_reservation", {
      _session_id: data.sessionId,
      _first_name: data.firstName,
      _last_name: data.lastName ?? "",
      _email: data.email,
      _phone: data.phone,
      _guest_count: data.guestCount,
      _notes: data.notes ?? "",
      _dietary_notes: data.dietary ?? "",
      _promo_code: data.promoCode ?? "",
    });
    if (error) throw new Error(error.message);
    const row = (Array.isArray(res) ? res[0] : res) as unknown as {
      booking_code: string;
      total: number;
      guest_count: number;
      subtotal: number;
      discount: number;
      promotion_name: string | null;
      promotion_code: string | null;
      reservation_status: "pending" | "confirmed";
      payment_status: "pending" | "complimentary";
    };
    if (!row) throw new Error("No se pudo crear la reserva");

    const [
      { supabaseAdmin },
      {
        sendComplimentaryReservationConfirmedEmail,
        sendReservationPaymentInstructionsEmail,
        sendInternalNewReservationEmail,
      },
    ] = await Promise.all([
      import("@/integrations/supabase/client.server"),
      import("@/lib/admin.server"),
    ]);
    const { data: reservation } = await supabaseAdmin
      .from("reservations")
      .select("id, payment_status")
      .eq("booking_code", row.booking_code)
      .maybeSingle();
    const email = !reservation
      ? { sent: false, reason: "missing_reservation" }
      : reservation.payment_status === "complimentary"
        ? await sendComplimentaryReservationConfirmedEmail(supabaseAdmin, reservation.id)
        : await sendReservationPaymentInstructionsEmail(supabaseAdmin, reservation.id);
    if (!email.sent) {
      console.warn("[email] reservation confirmation not sent", {
        bookingCode: row.booking_code,
        paymentStatus: row.payment_status,
        reason: email.reason ?? "unknown",
      });
    }
    if (reservation) {
      try {
        await sendInternalNewReservationEmail(supabaseAdmin, reservation.id);
      } catch (err) {
        console.error("internal_new_reservation_email_failed", err);
      }
    }

    if (reservation && row.payment_status === "complimentary") {
      const { sendServerGaEvents } = await import("@/lib/analytics.server");
      const item = {
        item_id: data.sessionId,
        item_name: "Café omakase",
        quantity: row.guest_count,
      };
      await sendServerGaEvents(reservation.id, [
        {
          name: "reservation_confirmed",
          params: {
            reservation_id: row.booking_code,
            value: 0,
            currency: "PEN",
            status: "complimentary",
            coupon: row.promotion_code,
            promotion_name: row.promotion_name,
            discount: Number(row.discount),
            items: [item],
          },
        },
        {
          name: "purchase",
          params: {
            transaction_id: row.booking_code,
            value: 0,
            currency: "PEN",
            coupon: row.promotion_code,
            discount: Number(row.discount),
            items: [item],
          },
        },
      ]);
    }

    return {
      bookingCode: row.booking_code,
      subtotal: Number(row.subtotal),
      discount: Number(row.discount),
      total: Number(row.total),
      guests: row.guest_count,
      promotionName: row.promotion_name,
      promotionCode: row.promotion_code,
      reservationStatus: row.reservation_status,
      paymentStatus: row.payment_status,
      isComplimentary: row.payment_status === "complimentary",
      email,
    };
  });

const waitlistInput = z.object({
  sessionId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(30).optional().nullable(),
  email: z.string().trim().email().max(160),
  seats: z.number().int().min(1).max(12),
});

export const joinWaitlist = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => waitlistInput.parse(data))
  .handler(async ({ data }) => {
    const { error } = await publicClient().rpc("join_waitlist", {
      _session_id: data.sessionId,
      _name: data.name,
      _phone: data.phone ?? "",
      _email: data.email,
      _seats: data.seats,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
