import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/asocial/AdminShell";
import { StatusPill } from "@/components/asocial/StatusPill";
import { SearchInput } from "@/components/asocial/SearchInput";
import { EmptyState } from "@/components/asocial/EmptyState";
import { ReservationDialog } from "@/components/asocial/ReservationDialog";
import { PaymentDialog } from "@/components/asocial/PaymentDialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { workspaceQuery } from "@/lib/queries";
import { paidAmount, customerName } from "@/lib/derive";
import { hour, money, longDay } from "@/lib/format";
import {
  reservationStatusLabel,
  reservationStatusTone,
  paymentStatusLabel,
  paymentStatusTone,
  sourceLabel,
  type ReservationStatus,
  type PaymentStatus,
} from "@/lib/domain";
import { moveReservation, cancelReservation } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/reservas/")({
  component: ReservationsPage,
});

function ReservationsPage() {
  const queryClient = useQueryClient();
  const { data: ws } = useQuery(workspaceQuery());
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [creating, setCreating] = useState(false);
  const [payFor, setPayFor] = useState<{ id: string; pending: number } | null>(null);
  const [moving, setMoving] = useState<string | null>(null);

  const move = useMutation({
    mutationFn: (v: { reservationId: string; sessionId: string }) => moveReservation({ data: v }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace"] });
      setMoving(null);
      toast("Reserva movida");
    },
    onError: (e) => toast(e instanceof Error ? e.message : "Error"),
  });

  const cancel = useMutation({
    mutationFn: (reservationId: string) =>
      cancelReservation({ data: { reservationId, reason: "Cancelada desde reservas" } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace"] });
      toast("Reserva cancelada");
    },
  });

  const rows = useMemo(() => {
    if (!ws) return [];
    const term = q.trim().toLowerCase();
    return ws.reservations.filter((r) => {
      if (status !== "all" && r.reservation_status !== status) return false;
      if (!term) return true;
      const name = customerName(ws, r.customer_id).toLowerCase();
      return name.includes(term) || r.booking_code.toLowerCase().includes(term);
    });
  }, [ws, q, status]);

  return (
    <AdminShell
      title="Reservas"
      description={`${rows.length} en esta vista`}
      actions={
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          Nueva
        </Button>
      }
    >
      <div className="flex flex-wrap gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="Nombre o código" className="w-full sm:w-64" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-44 rounded-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {(Object.keys(reservationStatusLabel) as ReservationStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {reservationStatusLabel[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6 space-y-3">
        {!ws || rows.length === 0 ? (
          <EmptyState title="Sin reservas que coincidan." />
        ) : (
          rows.map((r) => {
            const s = ws.sessions.find((x) => x.id === r.session_id);
            const paid = paidAmount(ws, r.id);
            const pending = Number(r.total) - paid;
            return (
              <div key={r.id} className="card-soft p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      to="/clientes/$id"
                      params={{ id: r.customer_id }}
                      className="text-sm underline-offset-4 hover:underline"
                    >
                      {customerName(ws, r.customer_id)}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {r.booking_code} · {s ? `${longDay(s.fecha)} · ${hour(s.hora_inicio)}` : "—"} · {r.guest_count}p
                      · {sourceLabel[r.source] ?? r.source}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {money(paid)} de {money(r.total)}
                      {pending > 0 ? ` · pendiente ${money(pending)}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone={reservationStatusTone[r.reservation_status as ReservationStatus]}>
                      {reservationStatusLabel[r.reservation_status as ReservationStatus]}
                    </StatusPill>
                    <StatusPill tone={paymentStatusTone[r.payment_status as PaymentStatus]}>
                      {paymentStatusLabel[r.payment_status as PaymentStatus]}
                    </StatusPill>
                    {r.reservation_status !== "cancelled" ? (
                      <>
                        {pending > 0 ? (
                          <Button size="sm" variant="outline" onClick={() => setPayFor({ id: r.id, pending })}>
                            Cobrar
                          </Button>
                        ) : null}
                        <Button size="sm" variant="ghost" onClick={() => setMoving(moving === r.id ? null : r.id)}>
                          Mover
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => cancel.mutate(r.id)}>
                          Cancelar
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>

                {moving === r.id ? (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Select onValueChange={(v) => move.mutate({ reservationId: r.id, sessionId: v })}>
                      <SelectTrigger className="h-9 w-72">
                        <SelectValue placeholder="Mover a otra sesión" />
                      </SelectTrigger>
                      <SelectContent>
                        {ws.sessions
                          .filter((x) => x.id !== r.session_id && x.estado !== "cancelled")
                          .map((x) => (
                            <SelectItem key={x.id} value={x.id}>
                              {longDay(x.fecha)} · {hour(x.hora_inicio)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {creating && ws ? <ReservationDialog open={creating} onOpenChange={setCreating} ws={ws} /> : null}
      {payFor ? (
        <PaymentDialog
          open
          onOpenChange={(o) => !o && setPayFor(null)}
          reservationId={payFor.id}
          pending={payFor.pending}
        />
      ) : null}
    </AdminShell>
  );
}
