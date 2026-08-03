import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { moveReservation } from "@/lib/admin.functions";
import { sessionStats } from "@/lib/derive";
import { hour, longDay, money } from "@/lib/format";
import type { Workspace, ReservationRow } from "@/lib/queries";

export function MoveReservationDialog({
  open,
  onOpenChange,
  ws,
  reservation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ws: Workspace;
  reservation: ReservationRow;
}) {
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState("");

  const options = useMemo(() => {
    return ws.sessions
      .filter((s) => s.id !== reservation.session_id && s.estado !== "cancelled" && s.estado !== "closed")
      .map((s) => ({ session: s, stats: sessionStats(ws, s) }))
      .sort((a, b) =>
        `${a.session.fecha}${a.session.hora_inicio}`.localeCompare(`${b.session.fecha}${b.session.hora_inicio}`),
      );
  }, [ws, reservation.session_id]);

  const selected = options.find((o) => o.session.id === sessionId);
  const newTotal = selected
    ? Number(selected.session.precio_por_persona) * reservation.guest_count - Number(reservation.discount)
    : null;

  const move = useMutation({
    mutationFn: () => moveReservation({ data: { reservationId: reservation.id, sessionId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace"] });
      toast("Reserva movida", { description: "El cambio quedó registrado en la bitácora." });
      onOpenChange(false);
    },
    onError: (e) => toast(e instanceof Error ? e.message : "No pudimos mover la reserva"),
  });

  const current = ws.sessions.find((s) => s.id === reservation.session_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mover reserva</DialogTitle>
          <DialogDescription>
            {reservation.booking_code} · {reservation.guest_count} personas
            {current ? ` · hoy en ${longDay(current.fecha)} ${hour(current.hora_inicio)}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Select value={sessionId} onValueChange={setSessionId}>
            <SelectTrigger>
              <SelectValue placeholder="Elige la nueva sesión" />
            </SelectTrigger>
            <SelectContent>
              {options.map(({ session, stats }) => (
                <SelectItem
                  key={session.id}
                  value={session.id}
                  disabled={stats.available < reservation.guest_count}
                >
                  {longDay(session.fecha)} · {hour(session.hora_inicio)} · {stats.available} libres
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selected ? (
            <p className="text-xs text-muted-foreground">
              {selected.stats.reserved} reservados · {selected.stats.blocked} bloqueados ·{" "}
              {selected.stats.available} libres. Nuevo total {money(newTotal ?? 0)}.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Solo se listan sesiones activas; las que no tienen aforo suficiente quedan deshabilitadas.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Volver
          </Button>
          <Button onClick={() => move.mutate()} disabled={!sessionId || move.isPending}>
            {move.isPending ? "Moviendo…" : "Mover reserva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
