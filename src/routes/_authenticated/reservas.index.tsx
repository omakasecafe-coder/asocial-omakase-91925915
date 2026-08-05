import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, MessageCircle } from "lucide-react";
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { workspaceQuery, settingsQuery } from "@/lib/queries";
import { paidAmount, customerName } from "@/lib/derive";
import { hour, money, longDay, stamp } from "@/lib/format";
import { renderWhatsappMessage, openWhatsApp } from "@/lib/whatsapp";
import { markReservationsSeen } from "@/hooks/use-new-reservations";
import {
  reservationStage,
  reservationStageLabel,
  reservationStageTone,
  paymentStatusLabel,
  paymentStatusTone,
  sourceLabel,
  type ReservationStage,
  type PaymentStatus,
} from "@/lib/domain";

import { MoveReservationDialog } from "@/components/asocial/MoveReservationDialog";
import { CancelReservationDialog } from "@/components/asocial/CancelReservationDialog";

export const Route = createFileRoute("/_authenticated/reservas/")({
  component: ReservationsPage,
});

function ReservationsPage() {
  const queryClient = useQueryClient();
  const { data: ws } = useQuery(workspaceQuery());
  const { data: settings } = useQuery(settingsQuery());
  const [q, setQ] = useState("");
  // Por defecto mostramos lo que necesita atención del equipo.
  const [status, setStatus] = useState<string>("activa");
  const [creating, setCreating] = useState(false);
  const [payFor, setPayFor] = useState<{ id: string; pending: number } | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<{ id: string; code: string } | null>(null);

  // Al abrir la pantalla, las reservas dejan de ser "nuevas".
  useEffect(() => {
    markReservationsSeen();
  }, [ws]);

  const rows = useMemo(() => {
    if (!ws) return [];
    const term = q.trim().toLowerCase();
    return ws.reservations.filter((r) => {
      const sess = ws.sessions.find((x) => x.id === r.session_id);
      if (status !== "all" && reservationStage(r.reservation_status, sess) !== status) return false;
      if (!term) return true;
      const name = customerName(ws, r.customer_id).toLowerCase();
      return name.includes(term) || r.booking_code.toLowerCase().includes(term);
    });
  }, [ws, q, status]);

  const groups = useMemo(() => {
    if (!ws) return [] as { key: string; title: string; guests: number; items: typeof rows }[];
    const map = new Map<string, { key: string; title: string; sort: string; guests: number; items: typeof rows }>();
    for (const r of rows) {
      const s = ws.sessions.find((x) => x.id === r.session_id);
      const key = r.session_id ?? "sin-sesion";
      const title = s ? `${longDay(s.fecha)} · ${hour(s.hora_inicio)}` : "Sin sesión";
      const sort = s ? `${s.fecha}T${s.hora_inicio}` : "9999";
      const g = map.get(key) ?? { key, title, sort, guests: 0, items: [] as typeof rows };
      g.guests += r.guest_count;
      g.items.push(r);
      map.set(key, g);
    }
    return [...map.values()].sort((a, b) => a.sort.localeCompare(b.sort));
  }, [ws, rows]);

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
            {(Object.keys(reservationStageLabel) as ReservationStage[]).map((s) => (
              <SelectItem key={s} value={s}>
                {reservationStageLabel[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

      </div>

      <div className="mt-6">
        {!ws || rows.length === 0 ? (
          <EmptyState title="Sin reservas que coincidan." />
        ) : (
          <Accordion type="multiple" defaultValue={groups.map((g) => g.key)} className="space-y-3">
          {groups.map((g) => (
            <AccordionItem key={g.key} value={g.key} className="card-soft border-0 px-4">
              <AccordionTrigger className="py-4 hover:no-underline">
                <div className="flex w-full flex-wrap items-center justify-between gap-2 pr-2 text-left">
                  <span className="text-sm">{g.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {g.items.length} {g.items.length === 1 ? "reserva" : "reservas"} · {g.guests}p
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pb-4">
          {g.items.map((r) => {
            const s = ws.sessions.find((x) => x.id === r.session_id);
            const paid = paidAmount(ws, r.id);
            const pending = Number(r.total) - paid;
            const customer = ws.customers.find((c) => c.id === r.customer_id);
            const handleWhatsApp = () => {
              openWhatsApp(
                customer?.phone,
                renderWhatsappMessage(
                  (settings as { whatsapp_message_template?: string } | undefined)?.whatsapp_message_template ?? "",
                  {
                    customer_name: customerName(ws, r.customer_id),
                    booking_code: r.booking_code,
                    session_date: s ? longDay(s.fecha) : "",
                    session_time: s ? hour(s.hora_inicio) : "",
                    guest_count: String(r.guest_count),
                    total: money(r.total),
                    pending_amount: money(Math.max(pending, 0)),
                    payment_options: settings?.payment_instructions ?? "",
                    business_name: settings?.business_name ?? "asocial",
                  },
                ),
              );
            };
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
                    <StatusPill tone={reservationStageTone[reservationStage(r.reservation_status, s)]}>
                      {reservationStageLabel[reservationStage(r.reservation_status, s)]}
                    </StatusPill>

                    <StatusPill tone={paymentStatusTone[r.payment_status as PaymentStatus]}>
                      {paymentStatusLabel[r.payment_status as PaymentStatus]}
                    </StatusPill>
                    {r.reservation_status !== "cancelled" ? (
                      <>

                        {customer?.phone ? (
                          <Button size="sm" variant="outline" onClick={handleWhatsApp}>
                            <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
                            WhatsApp
                          </Button>
                        ) : null}
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


                {r.reservation_status === "cancelled" && r.cancellation_reason ? (
                  <p className="mt-3 text-xs text-muted-foreground">Motivo: {r.cancellation_reason}</p>
                ) : null}
              </div>
            );
          })}
              </AccordionContent>
            </AccordionItem>
          ))}
          </Accordion>
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
