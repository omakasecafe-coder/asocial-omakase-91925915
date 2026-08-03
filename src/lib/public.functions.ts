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
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
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

const reservationInput = z.object({
  sessionId: z.string().uuid(),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().max(80).default(""),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().min(6).max(30),
  guestCount: z.number().int().min(1).max(12),
  dietary: z.string().trim().max(500).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
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
    });
    if (error) throw new Error(error.message);
    const row = (Array.isArray(res) ? res[0] : res) as unknown as {
      booking_code: string;
      total: number;
      guest_count: number;
    };
    if (!row) throw new Error("No se pudo crear la reserva");
    return { bookingCode: row.booking_code, total: Number(row.total), guests: row.guest_count };
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
