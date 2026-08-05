import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhoneInput } from "@/components/asocial/PhoneInput";
import { createReservationAdmin } from "@/lib/admin.functions";
import { hour, longDay, money, seatsLabel, todayISO } from "@/lib/format";
import { sessionStats, sessionLabelKey } from "@/lib/derive";
import {
  reservationStatusLabel,
  paymentStatusLabel,
  type ReservationStatus,
  type PaymentStatus,
} from "@/lib/domain";
import type { Workspace } from "@/lib/queries";

export function ReservationDialog({
  open,
  onOpenChange,
  ws,
  sessionId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ws: Workspace;
  sessionId?: string;
}) {
  const queryClient = useQueryClient();
  const [created, setCreated] = useState<{ code: string; guests: number; total: number } | null>(null);

  const options = useMemo(() => {
    const today = todayISO();
    return ws.sessions
      .filter((s) => s.estado !== "cancelled")
      .map((s) => ({ session: s, ...sessionStats(ws, s) }))
      .sort((a, b) => {
        const aUpcoming = a.session.fecha >= today ? 0 : 1;
        const bUpcoming = b.session.fecha >= today ? 0 : 1;
        if (aUpcoming !== bUpcoming) return aUpcoming - bUpcoming;
        return sessionLabelKey(a.session).localeCompare(sessionLabelKey(b.session));
      });
  }, [ws]);

  const defaultSession =
    sessionId ?? options.find((o) => o.available > 0)?.session.id ?? options[0]?.session.id ?? "";

  const emptyForm = {
    sessionId: defaultSession,
    customerId: "",
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    guestCount: 1,
    reservationStatus: "confirmed" as ReservationStatus,
    paymentStatus: "pending" as PaymentStatus,
    notes: "",
  };

  const [form, setForm] = useState(emptyForm);

  // Cada vez que se abre el diálogo empezamos con un formulario limpio,
  // para que no queden pegados los datos de una reserva anterior.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      setCreated(null);
      setForm({ ...emptyForm, sessionId: defaultSession });
    }
    wasOpen.current = open;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selected = options.find((o) => o.session.id === form.sessionId) ?? null;
  const guests = Number.isFinite(form.guestCount) ? Math.max(Math.trunc(form.guestCount), 0) : 0;
  const available = selected?.available ?? 0;
  const price = Number(selected?.session.precio_por_persona ?? 0);
  const customer = ws.customers.find((c) => c.id === form.customerId);

  const overCapacity = Boolean(selected) && guests > available;
  const missingContact = !customer && !form.firstName.trim();
  const invalid = !form.sessionId || guests < 1 || overCapacity || missingContact;

  const create = useMutation({
    mutationFn: () =>
      createReservationAdmin({
        data: {
          sessionId: form.sessionId,
          ...(form.customerId ? { customerId: form.customerId } : {}),
          firstName: customer ? customer.first_name : form.firstName.trim(),
          lastName: customer ? (customer.last_name ?? "") : form.lastName.trim(),
          email: customer ? (customer.email ?? "") : form.email.trim(),
          phone: customer ? (customer.phone ?? "") : form.phone.trim(),
          guestCount: guests,
          reservationStatus: form.reservationStatus,
          paymentStatus: form.paymentStatus,
          notes: form.notes.trim(),
        },
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["workspace"] });
      queryClient.invalidateQueries({ queryKey: ["public-sessions"] });
      setCreated({ code: res.bookingCode, guests, total: price * guests });
    },
    onError: (e) => toast(e instanceof Error ? e.message : "No pudimos crear la reserva"),
  });

  function close() {
    setCreated(null);
    setForm({ ...emptyForm, sessionId: defaultSession });
    onOpenChange(false);
  }

  if (created) {
    return (
      <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reserva creada</DialogTitle>
          </DialogHeader>
          <div className="rounded-lg border border-border bg-muted/40 p-6 text-center">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Código de reserva</p>
            <p className="mt-2 font-mono text-2xl">{created.code}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              {seatsLabel(created.guests)} · {money(created.total)}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                void navigator.clipboard?.writeText(created.code);
                toast("Código copiado");
              }}
            >
              Copiar código
            </Button>
            <Button onClick={close}>Listo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva reserva</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sesión" className="sm:col-span-2">
            <Select value={form.sessionId} onValueChange={(v) => setForm({ ...form, sessionId: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Elegir sesión" />
              </SelectTrigger>
              <SelectContent>
                {options.map((o) => (
                  <SelectItem key={o.session.id} value={o.session.id} disabled={o.available === 0}>
                    {longDay(o.session.fecha)} · {hour(o.session.hora_inicio)} ·{" "}
                    {o.available === 0 ? "sin lugares" : `${o.available} libres`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {selected ? (
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm sm:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-muted-foreground">
                  {selected.reserved} reservados · {selected.blocked} bloqueados ·{" "}
                  {selected.session.capacidad_maxima} de aforo
                </span>
                <span className={overCapacity ? "text-destructive" : "text-foreground"}>
                  {available} lugares disponibles
                </span>
              </div>
              <p className="mt-1 text-muted-foreground">
                {money(price)} por persona · total estimado {money(price * guests)}
              </p>
            </div>
          ) : null}

          <Field label="Cliente existente" className="sm:col-span-2">
            <Select
              value={form.customerId || "new"}
              onValueChange={(v) => setForm({ ...form, customerId: v === "new" ? "" : v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">Cliente nuevo</SelectItem>
                {ws.customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {customer ? (
            <p className="text-xs text-muted-foreground sm:col-span-2">
              {customer.phone} · {customer.email}
            </p>
          ) : (
            <>
              <Field label="Nombre">
                <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </Field>
              <Field label="Apellido">
                <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </Field>
              <Field label="WhatsApp">
                <PhoneInput value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
              </Field>
              <Field label="Email">
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
            </>
          )}

          <Field label="Personas">
            <Input
              type="number"
              min={1}
              max={Math.max(available, 1)}
              value={form.guestCount}
              onChange={(e) => setForm({ ...form, guestCount: Number(e.target.value) })}
            />
          </Field>
          <Field label="Estado">
            <Select
              value={form.reservationStatus}
              onValueChange={(v) => setForm({ ...form, reservationStatus: v as ReservationStatus })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["pending", "attended"] as ReservationStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {reservationStatusLabel[s]}
                  </SelectItem>
                ))}

              </SelectContent>
            </Select>
          </Field>
          <Field label="Pago" className="sm:col-span-2">
            <Select
              value={form.paymentStatus}
              onValueChange={(v) => setForm({ ...form, paymentStatus: v as PaymentStatus })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["pending", "partial", "paid", "complimentary"] as PaymentStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {paymentStatusLabel[s]}
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

          {overCapacity ? (
            <p className="text-sm text-destructive sm:col-span-2">
              Solo quedan {available} lugares en esta sesión.
            </p>
          ) : missingContact ? (
            <p className="text-sm text-muted-foreground sm:col-span-2">
              Indica un nombre o elige un cliente existente.
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={close}>
            Cancelar
          </Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending || invalid}>
            {create.isPending ? "Creando…" : "Crear reserva"}
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
