import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhoneInput } from "@/components/asocial/PhoneInput";
import { updateReservation } from "@/lib/admin.functions";
import { hour, longDay, money, todayISO } from "@/lib/format";
import { sessionStats, sessionLabelKey } from "@/lib/derive";
import {
  reservationStage,
  reservationStageLabel,
  stageToStatus,
  type ReservationStage,
  type ReservationStatus,
} from "@/lib/domain";

import type { ReservationRow, Workspace } from "@/lib/queries";

export function EditReservationDialog({
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
  const customer = ws.customers.find((c) => c.id === reservation.customer_id);

  const options = useMemo(() => {
    const today = todayISO();
    return ws.sessions
      .filter((s) => s.estado !== "cancelled" || s.id === reservation.session_id)
      .map((s) => ({ session: s, ...sessionStats(ws, s) }))
      .sort((a, b) => {
        const aUpcoming = a.session.fecha >= today ? 0 : 1;
        const bUpcoming = b.session.fecha >= today ? 0 : 1;
        if (aUpcoming !== bUpcoming) return aUpcoming - bUpcoming;
        return sessionLabelKey(a.session).localeCompare(sessionLabelKey(b.session));
      });
  }, [ws, reservation.session_id]);

  const [form, setForm] = useState({
    sessionId: reservation.session_id,
    firstName: customer?.first_name ?? "",
    lastName: customer?.last_name ?? "",
    email: customer?.email ?? "",
    phone: customer?.phone ?? "",
    guestCount: reservation.guest_count,
    notes: reservation.notes ?? "",
    reservationStatus: reservation.reservation_status as ReservationStatus,
  });

  const selected = options.find((o) => o.session.id === form.sessionId) ?? null;
  const guests = Number.isFinite(form.guestCount) ? Math.max(Math.trunc(form.guestCount), 0) : 0;
  const sameSession = form.sessionId === reservation.session_id;
  const room = (selected?.available ?? 0) + (sameSession ? reservation.guest_count : 0);
  const price = Number(selected?.session.precio_por_persona ?? 0);
  const overCapacity = Boolean(selected) && guests > room;
  const invalid = !form.firstName.trim() || guests < 1 || overCapacity;

  const save = useMutation({
    mutationFn: () =>
      updateReservation({
        data: {
          reservationId: reservation.id,
          sessionId: form.sessionId,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          guestCount: guests,
          notes: form.notes.trim(),
          reservationStatus: form.reservationStatus,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace"] });
      queryClient.invalidateQueries({ queryKey: ["public-sessions"] });
      toast("Reserva actualizada");
      onOpenChange(false);
    },
    onError: (e) => toast(e instanceof Error ? e.message : "No pudimos guardar la reserva"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar reserva · {reservation.booking_code}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fecha y hora" className="sm:col-span-2">
            <Select value={form.sessionId} onValueChange={(v) => setForm({ ...form, sessionId: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((o) => (
                  <SelectItem
                    key={o.session.id}
                    value={o.session.id}
                    disabled={o.available === 0 && o.session.id !== reservation.session_id}
                  >
                    {longDay(o.session.fecha)} · {hour(o.session.hora_inicio)} ·{" "}
                    {o.available === 0 ? "sin lugares" : `${o.available} libres`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Nombre">
            <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </Field>
          <Field label="Apellido">
            <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="WhatsApp">
            <PhoneInput value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
          </Field>

          <Field label="Personas">
            <Input
              type="number"
              min={1}
              max={Math.max(room, 1)}
              value={form.guestCount}
              onChange={(e) => setForm({ ...form, guestCount: Number(e.target.value) })}
            />
          </Field>
          <Field label="Estado">
            <Select
              value={reservationStage(form.reservationStatus)}
              onValueChange={(v) =>
                setForm({ ...form, reservationStatus: stageToStatus[v as ReservationStage] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(reservationStageLabel) as ReservationStage[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {reservationStageLabel[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>


          <Field label="Notas" className="sm:col-span-2">
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="min-h-20"
            />
          </Field>

          <p className="text-xs text-muted-foreground sm:col-span-2">
            Nuevo total estimado: {money(price * guests)} · {room} lugares disponibles para esta reserva.
          </p>

          {overCapacity ? (
            <p className="text-sm text-destructive sm:col-span-2">Solo hay {room} lugares en esa sesión.</p>
          ) : null}
          {form.reservationStatus === "confirmed" && reservation.reservation_status !== "confirmed" ? (
            <p className="text-xs text-muted-foreground sm:col-span-2">
              La confirmación al cliente se envía automáticamente al validar el pago.
            </p>
          ) : null}

        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || invalid}>
            {save.isPending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
