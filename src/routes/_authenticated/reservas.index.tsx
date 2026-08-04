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
import { EditReservationDialog } from "@/components/asocial/EditReservationDialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { workspaceQuery } from "@/lib/queries";
import { paidAmount, customerName } from "@/lib/derive";
import { hour, money, longDay } from "@/lib/format";
import { confirmReservation, setAttendance } from "@/lib/admin.functions";
import {
  reservationStatusLabel,
  reservationStatusTone,
  paymentStatusLabel,
  paymentStatusTone,
  attendanceStatusLabel,
  attendanceStatusTone,
  sourceLabel,
  type ReservationStatus,
  type PaymentStatus,
  type AttendanceStatus,
} from "@/lib/domain";
import { MoveReservationDialog } from "@/components/asocial/MoveReservationDialog";
import { CancelReservationDialog } from "@/components/asocial/CancelReservationDialog";

export const Route = createFileRoute("/_authenticated/reservas/")({
  component: ReservationsPage,
});

function ReservationsPage() {
  const queryClient = useQueryClient();
  const { data: ws } = useQuery(workspaceQuery());
  const [q, setQ] = useState("");
  // Por defecto mostramos lo que necesita atención del equipo.
  const [status, setStatus] = useState<string>("pending");
  const [creating, setCreating] = useState(false);
  const [payFor, setPayFor] = useState<{ id: string; pending: number } | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<{ id: string; code: string } | null>(null);

  const attendance = useMutation({
    mutationFn: (v: { reservationId: string; status: AttendanceStatus }) => setAttendance({ data: v }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workspace"] }),
    onError: (e) => toast(e instanceof Error ? e.message : "No pudimos registrar la asistencia"),
  });

  const confirm = useMutation({
    mutationFn: (reservationId: string) => confirmReservation({ data: { reservationId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace"] });
      toast("Reserva confirmada");
    },
    onError: (e) => toast(e instanceof Error ? e.message : "No pudimos confirmar la reserva"),
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
            const att = (r.attendance_status ?? "pending") as AttendanceStatus;
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
                    {att !== "pending" ? (
                      <StatusPill tone={attendanceStatusTone[att]}>{attendanceStatusLabel[att]}</StatusPill>
                    ) : null}
                    {r.reservation_status !== "cancelled" ? (
                      <>

                        {pending > 0 ? (
                          <Button size="sm" variant="outline" onClick={() => setPayFor({ id: r.id, pending })}>
                            Cobrar
                          </Button>
                        ) : null}
                        <Button size="sm" variant="ghost" onClick={() => setEditing(r.id)}>
                          Editar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setMoving(r.id)}>
                          Mover
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setCancelling({ id: r.id, code: r.booking_code })}
                        >
                          Cancelar
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>

                {r.reservation_status !== "cancelled" ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                    <span className="text-xs text-muted-foreground">Asistencia:</span>
                    <Button
                      size="sm"
                      variant={att === "arrived" ? "default" : "outline"}
                      disabled={attendance.isPending}
                      onClick={() =>
                        attendance.mutate({
                          reservationId: r.id,
                          status: att === "arrived" ? "pending" : "arrived",
                        })
                      }
                    >
                      Llegó
                    </Button>
                    <Button
                      size="sm"
                      variant={att === "no_show" ? "default" : "outline"}
                      disabled={attendance.isPending}
                      onClick={() =>
                        attendance.mutate({
                          reservationId: r.id,
                          status: att === "no_show" ? "pending" : "no_show",
                        })
                      }
                    >
                      No llegó
                    </Button>
                    {r.attendance_at ? (
                      <span className="text-xs text-muted-foreground">
                        Registrado el{" "}
                        {new Date(r.attendance_at).toLocaleString("es-PE", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {r.reservation_status === "cancelled" && r.cancellation_reason ? (
                  <p className="mt-3 text-xs text-muted-foreground">Motivo: {r.cancellation_reason}</p>
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
      {editing && ws
        ? (() => {
            const target = ws.reservations.find((x) => x.id === editing);
            return target ? (
              <EditReservationDialog
                open
                onOpenChange={(o) => !o && setEditing(null)}
                ws={ws}
                reservation={target}
              />
            ) : null;
          })()
        : null}
      {moving && ws
        ? (() => {
            const target = ws.reservations.find((x) => x.id === moving);
            return target ? (
              <MoveReservationDialog
                open
                onOpenChange={(o) => !o && setMoving(null)}
                ws={ws}
                reservation={target}
              />
            ) : null;
          })()
        : null}
      {cancelling ? (
        <CancelReservationDialog
          open
          onOpenChange={(o) => !o && setCancelling(null)}
          reservationId={cancelling.id}
          bookingCode={cancelling.code}
        />
      ) : null}
    </AdminShell>
  );
}
