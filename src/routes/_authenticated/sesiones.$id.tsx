import { useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/asocial/AdminShell";
import { StatusPill } from "@/components/asocial/StatusPill";
import { OccupancyBar } from "@/components/asocial/AvailabilityBadge";
import { EmptyState } from "@/components/asocial/EmptyState";
import { SessionDialog } from "@/components/asocial/SessionDialog";
import { ReservationDialog } from "@/components/asocial/ReservationDialog";
import { PaymentDialog } from "@/components/asocial/PaymentDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { workspaceQuery } from "@/lib/queries";
import { sessionStats, paidAmount, customerName } from "@/lib/derive";
import { hour, longDay, money } from "@/lib/format";
import {
  reservationStatusLabel,
  reservationStatusTone,
  paymentStatusLabel,
  paymentStatusTone,
  blockReasonLabel,
  sessionStatusLabel,
  sessionStatusTone,
  type ReservationStatus,
  type PaymentStatus,
  type BlockReason,
  type SessionStatus,
} from "@/lib/domain";
import { blockSeats, removeBlock, setAttendance } from "@/lib/admin.functions";
import { MoveReservationDialog } from "@/components/asocial/MoveReservationDialog";
import { CancelReservationDialog } from "@/components/asocial/CancelReservationDialog";

export const Route = createFileRoute("/_authenticated/sesiones/$id")({
  component: SessionDetail,
});

function SessionDetail() {
  const { id } = useParams({ from: "/_authenticated/sesiones/$id" });
  const queryClient = useQueryClient();
  const { data: ws } = useQuery(workspaceQuery());
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [payFor, setPayFor] = useState<{ id: string; pending: number } | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<{ id: string; code: string } | null>(null);
  const [blockForm, setBlockForm] = useState({ quantity: 1, reason: "invitado" as BlockReason, notes: "" });


  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["workspace"] });
    queryClient.invalidateQueries({ queryKey: ["public-sessions"] });
  };

  const attend = useMutation({
    mutationFn: (v: { reservationId: string; status: "attended" | "no_show" | "confirmed" }) =>
      setAttendance({ data: v }),
    onSuccess: invalidate,
    onError: (e) => toast(e instanceof Error ? e.message : "Error"),
  });




  const addBlock = useMutation({
    mutationFn: () =>
      blockSeats({
        data: {
          session_id: id,
          quantity: Number(blockForm.quantity),
          reason: blockForm.reason,
          notes: blockForm.notes.trim(),
        },
      }),
    onSuccess: () => {
      invalidate();
      setBlockForm({ quantity: 1, reason: "invitado", notes: "" });
    },
    onError: (e) => toast(e instanceof Error ? e.message : "Error"),
  });

  const dropBlock = useMutation({
    mutationFn: (blockId: string) => removeBlock({ data: { id: blockId } }),
    onSuccess: invalidate,
  });

  if (!ws) {
    return (
      <AdminShell title="Sesión">
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </AdminShell>
    );
  }

  const session = ws.sessions.find((s) => s.id === id);
  if (!session) {
    return (
      <AdminShell title="Sesión">
        <EmptyState title="No encontramos esta sesión." action={<Link to="/sesiones">Volver a sesiones</Link>} />
      </AdminShell>
    );
  }

  const stats = sessionStats(ws, session);
  const roster = ws.reservations.filter((r) => r.session_id === id);
  const blocks = ws.blocks.filter((b) => b.session_id === id);

  return (
    <AdminShell
      title={`${longDay(session.fecha)} · ${hour(session.hora_inicio)}`}
      description={`${session.ubicacion} · ${money(session.precio_por_persona)} por persona`}
      actions={
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => setEditing(true)} aria-label="Editar sesión">
            <Pencil className="h-4 w-4" strokeWidth={1.5} />
          </Button>
          <Button onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            Reserva
          </Button>
        </div>
      }
    >
      <div className="card-soft p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StatusPill tone={sessionStatusTone[session.estado as SessionStatus]}>
            {sessionStatusLabel[session.estado as SessionStatus]}
          </StatusPill>
          <p className="text-xs text-muted-foreground">
            {stats.reserved} reservados · {stats.blocked} bloqueados · {stats.available} disponibles
          </p>
        </div>
        <OccupancyBar value={stats.occupancy} className="mt-4" />
        {session.notas_internas ? (
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{session.notas_internas}</p>
        ) : null}
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-medium">Lista de asistentes</h2>
        <div className="mt-4 space-y-3">
          {roster.length === 0 ? (
            <EmptyState title="Todavía nadie reservó esta sesión." />
          ) : (
            roster.map((r) => {
              const paid = paidAmount(ws, r.id);
              const pending = Number(r.total) - paid;
              return (
                <div key={r.id} className="card-soft flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <Link
                      to="/clientes/$id"
                      params={{ id: r.customer_id }}
                      className="text-sm underline-offset-4 hover:underline"
                    >
                      {customerName(ws, r.customer_id)}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {r.booking_code} · {r.guest_count}p · {money(paid)} de {money(r.total)}
                    </p>
                    {r.dietary_notes ? (
                      <p className="mt-1 text-xs text-arcilla">{r.dietary_notes}</p>
                    ) : null}
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
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => attend.mutate({ reservationId: r.id, status: "attended" })}
                        >
                          Llegó
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => attend.mutate({ reservationId: r.id, status: "no_show" })}
                        >
                          No vino
                        </Button>
                        {pending > 0 ? (
                          <Button size="sm" variant="outline" onClick={() => setPayFor({ id: r.id, pending })}>
                            Cobrar
                          </Button>
                        ) : null}
                        <Button size="sm" variant="ghost" onClick={() => cancel.mutate(r.id)}>
                          Cancelar
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium">Lugares bloqueados</h2>
        <div className="card-soft mt-4 p-5">
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <Label className="text-xs text-muted-foreground">Cantidad</Label>
              <Input
                type="number"
                min={1}
                value={blockForm.quantity}
                onChange={(e) => setBlockForm({ ...blockForm, quantity: Number(e.target.value) })}
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Motivo</Label>
              <Select
                value={blockForm.reason}
                onValueChange={(v) => setBlockForm({ ...blockForm, reason: v as BlockReason })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(blockReasonLabel) as BlockReason[]).map((b) => (
                    <SelectItem key={b} value={b}>
                      {blockReasonLabel[b]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Nota</Label>
              <Input
                value={blockForm.notes}
                onChange={(e) => setBlockForm({ ...blockForm, notes: e.target.value })}
                className="mt-2"
              />
            </div>
          </div>
          <Button className="mt-4" variant="outline" onClick={() => addBlock.mutate()} disabled={addBlock.isPending}>
            Bloquear lugares
          </Button>

          <div className="mt-5 space-y-2">
            {blocks.map((b) => (
              <div key={b.id} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {b.quantity} · {blockReasonLabel[b.reason as BlockReason]} {b.notes ? `· ${b.notes}` : ""}
                </span>
                <button
                  onClick={() => dropBlock.mutate(b.id)}
                  className="text-muted-foreground underline-offset-4 hover:underline"
                >
                  Liberar
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {editing ? <SessionDialog open={editing} onOpenChange={setEditing} session={session} /> : null}
      {adding ? (
        <ReservationDialog open={adding} onOpenChange={setAdding} ws={ws} sessionId={session.id} />
      ) : null}
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
