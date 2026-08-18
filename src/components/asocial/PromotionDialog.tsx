import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { savePromotion } from "@/lib/admin.functions";
import { hour, longDay } from "@/lib/format";
import type { PromotionRow, SessionRow } from "@/lib/queries";

type ApplicationType = "automatic" | "code";
type DiscountType = "percentage" | "fixed" | "free";

const optionalNumber = (value: string) => (value.trim() === "" ? null : Number(value));

export function PromotionDialog({
  open,
  onOpenChange,
  promotion,
  sessions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promotion?: PromotionRow | null;
  sessions: SessionRow[];
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => ({
    name: promotion?.name ?? "",
    description: promotion?.description ?? "",
    applicationType: (promotion?.application_type ?? "automatic") as ApplicationType,
    code: promotion?.code ?? "",
    discountType: (promotion?.discount_type ?? "percentage") as DiscountType,
    discountValue: String(promotion?.discount_value ?? 10),
    maxDiscount: promotion?.max_discount == null ? "" : String(promotion.max_discount),
    minGuests: String(promotion?.min_guests ?? 1),
    maxGuests: promotion?.max_guests == null ? "" : String(promotion.max_guests),
    startsOn: promotion?.starts_on ?? "",
    endsOn: promotion?.ends_on ?? "",
    usageLimit: promotion?.usage_limit == null ? "" : String(promotion.usage_limit),
    usageLimitPerCustomer:
      promotion?.usage_limit_per_customer == null ? "" : String(promotion.usage_limit_per_customer),
    sessionIds: promotion?.session_ids ?? [],
    priority: String(promotion?.priority ?? 0),
    active: promotion?.active ?? true,
  }));

  const save = useMutation({
    mutationFn: () =>
      savePromotion({
        data: {
          ...(promotion ? { id: promotion.id } : {}),
          name: form.name.trim(),
          description: form.description.trim(),
          application_type: form.applicationType,
          code: form.applicationType === "code" ? form.code.trim() : null,
          discount_type: form.discountType,
          discount_value: form.discountType === "free" ? 0 : Number(form.discountValue),
          max_discount:
            form.discountType === "percentage" ? optionalNumber(form.maxDiscount) : null,
          min_guests: Number(form.minGuests),
          max_guests: optionalNumber(form.maxGuests),
          starts_on: form.startsOn || null,
          ends_on: form.endsOn || null,
          usage_limit: optionalNumber(form.usageLimit),
          usage_limit_per_customer: optionalNumber(form.usageLimitPerCustomer),
          session_ids: form.sessionIds,
          priority: Number(form.priority),
          active: form.active,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace"] });
      toast(promotion ? "Promoción actualizada" : "Promoción creada");
      onOpenChange(false);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "No pudimos guardar la promoción"),
  });

  const invalid =
    !form.name.trim() ||
    (form.applicationType === "code" && !form.code.trim()) ||
    (form.discountType !== "free" && Number(form.discountValue) <= 0) ||
    Number(form.minGuests) < 1;

  const toggleSession = (id: string, checked: boolean) => {
    setForm({
      ...form,
      sessionIds: checked
        ? [...form.sessionIds, id]
        : form.sessionIds.filter((sessionId) => sessionId !== id),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{promotion ? "Editar promoción" : "Nueva promoción"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" className="sm:col-span-2">
            <Input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </Field>
          <Field label="Descripción interna" className="sm:col-span-2">
            <Textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              className="min-h-20"
            />
          </Field>
          <Field label="Aplicación">
            <Select
              value={form.applicationType}
              onValueChange={(value) =>
                setForm({ ...form, applicationType: value as ApplicationType })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="automatic">Automática</SelectItem>
                <SelectItem value="code">Con código</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {form.applicationType === "code" ? (
            <Field label="Código promocional">
              <Input
                value={form.code}
                onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
                placeholder="BARISTA20"
              />
            </Field>
          ) : (
            <div />
          )}
          <Field label="Tipo de beneficio">
            <Select
              value={form.discountType}
              onValueChange={(value) => setForm({ ...form, discountType: value as DiscountType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Porcentaje</SelectItem>
                <SelectItem value="fixed">Monto fijo</SelectItem>
                <SelectItem value="free">Reserva gratuita</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {form.discountType !== "free" ? (
            <Field label={form.discountType === "percentage" ? "Descuento (%)" : "Descuento (S/)"}>
              <Input
                type="number"
                min="0"
                max={form.discountType === "percentage" ? "100" : undefined}
                step="0.5"
                value={form.discountValue}
                onChange={(event) => setForm({ ...form, discountValue: event.target.value })}
              />
            </Field>
          ) : (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              El total quedará en S/0 y la reserva se confirmará inmediatamente.
            </div>
          )}
          {form.discountType === "percentage" ? (
            <Field label="Descuento máximo (opcional)">
              <Input
                type="number"
                min="0"
                step="0.5"
                value={form.maxDiscount}
                onChange={(event) => setForm({ ...form, maxDiscount: event.target.value })}
                placeholder="Sin máximo"
              />
            </Field>
          ) : null}
          <Field label="Mínimo de personas">
            <Input
              type="number"
              min="1"
              value={form.minGuests}
              onChange={(event) => setForm({ ...form, minGuests: event.target.value })}
            />
          </Field>
          <Field label="Máximo de personas (opcional)">
            <Input
              type="number"
              min="1"
              value={form.maxGuests}
              onChange={(event) => setForm({ ...form, maxGuests: event.target.value })}
            />
          </Field>
          <Field label="Válida desde">
            <Input
              type="date"
              value={form.startsOn}
              onChange={(e) => setForm({ ...form, startsOn: e.target.value })}
            />
          </Field>
          <Field label="Válida hasta">
            <Input
              type="date"
              value={form.endsOn}
              onChange={(e) => setForm({ ...form, endsOn: e.target.value })}
            />
          </Field>
          <Field label="Límite total de usos">
            <Input
              type="number"
              min="1"
              value={form.usageLimit}
              onChange={(event) => setForm({ ...form, usageLimit: event.target.value })}
              placeholder="Sin límite"
            />
          </Field>
          <Field label="Usos por cliente">
            <Input
              type="number"
              min="1"
              value={form.usageLimitPerCustomer}
              onChange={(event) => setForm({ ...form, usageLimitPerCustomer: event.target.value })}
              placeholder="Sin límite"
            />
          </Field>
          <Field label="Prioridad">
            <Input
              type="number"
              value={form.priority}
              onChange={(event) => setForm({ ...form, priority: event.target.value })}
            />
          </Field>
          <div className="flex items-end">
            <label className="flex items-center gap-3 pb-2 text-sm">
              <Switch
                checked={form.active}
                onCheckedChange={(active) => setForm({ ...form, active })}
              />
              Activa
            </label>
          </div>

          <div className="sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Sesiones aplicables</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Sin selección, la promoción aplica a todas las sesiones.
            </p>
            <div className="mt-3 max-h-44 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
              {sessions.length === 0 ? (
                <p className="text-xs text-muted-foreground">No hay sesiones disponibles.</p>
              ) : (
                sessions.map((session) => (
                  <label key={session.id} className="flex items-center gap-3 text-sm">
                    <Checkbox
                      checked={form.sessionIds.includes(session.id)}
                      onCheckedChange={(checked) => toggleSession(session.id, checked === true)}
                    />
                    <span>
                      {longDay(session.fecha)} · {hour(session.hora_inicio)}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || invalid}>
            {save.isPending ? "Guardando…" : "Guardar promoción"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
