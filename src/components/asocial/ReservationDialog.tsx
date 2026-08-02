import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createReservationAdmin } from "@/lib/admin.functions";
import { hour, longDay } from "@/lib/format";
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
  const [form, setForm] = useState({
    sessionId: sessionId ?? ws.sessions[0]?.id ?? "",
    customerId: "",
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    guestCount: 2,
    reservationStatus: "confirmed" as ReservationStatus,
    paymentStatus: "pending" as PaymentStatus,
    notes: "",
  });

  const create = useMutation({
    mutationFn: () =>
      createReservationAdmin({
        data: {
          sessionId: form.sessionId,
          ...(form.customerId ? { customerId: form.customerId } : {}),
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          guestCount: Number(form.guestCount),
          reservationStatus: form.reservationStatus,
          paymentStatus: form.paymentStatus,
          notes: form.notes.trim(),
        },
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["workspace"] });
      queryClient.invalidateQueries({ queryKey: ["public-sessions"] });
      toast(`Reserva ${res.bookingCode} creada`);
      onOpenChange(false);
    },
    onError: (e) => toast(e instanceof Error ? e.message : "No pudimos crear la reserva"),
  });

  const customer = ws.customers.find((c) => c.id === form.customerId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                {ws.sessions
                  .filter((s) => s.estado !== "cancelled")
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {longDay(s.fecha)} · {hour(s.hora_inicio)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Field>

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
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
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
                {(["pending", "confirmed", "attended"] as ReservationStatus[]).map((s) => (
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
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending || !form.sessionId}>
            Crear reserva
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
