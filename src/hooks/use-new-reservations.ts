import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { workspaceQuery } from "@/lib/queries";

const KEY = "asocial:reservas-vistas-at";
const EVENT = "asocial:reservas-vistas";

export function readSeenAt(): number {
  if (typeof window === "undefined") return Date.now();
  const raw = window.localStorage.getItem(KEY);
  const value = raw ? Date.parse(raw) : NaN;
  return Number.isNaN(value) ? 0 : value;
}

/** Marca todas las reservas actuales como vistas. */
export function markReservationsSeen() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, new Date().toISOString());
  window.dispatchEvent(new Event(EVENT));
}

/** Cantidad de reservas creadas desde la última visita a la pantalla de Reservas. */
export function useNewReservationsCount(): number {
  const { data: ws } = useQuery(workspaceQuery());
  const [seenAt, setSeenAt] = useState(0);

  const sync = useCallback(() => setSeenAt(readSeenAt()), []);

  useEffect(() => {
    // Primera vez: tomamos el momento actual como línea base.
    if (!window.localStorage.getItem(KEY)) {
      window.localStorage.setItem(KEY, new Date().toISOString());
    }
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [sync]);

  if (!ws) return 0;
  return ws.reservations.filter(
    (r) => r.reservation_status !== "cancelled" && Date.parse(r.created_at) > seenAt,
  ).length;
}
