import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminShell } from "@/components/asocial/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { settingsQuery } from "@/lib/queries";
import { saveSettings } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/configuracion")({
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery(settingsQuery());
  const [form, setForm] = useState({
    business_name: "asocial · café omakase",
    logo_url: "",
    address: "",
    currency: "PEN",
    timezone: "America/Lima",
    default_capacity: 8,
    default_price: 120,
    cancellation_policy: "",
    confirmation_text: "",
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      business_name: data.business_name ?? "",
      logo_url: data.logo_url ?? "",
      address: data.address ?? "",
      currency: data.currency ?? "PEN",
      timezone: data.timezone ?? "America/Lima",
      default_capacity: data.default_capacity ?? 8,
      default_price: Number(data.default_price ?? 120),
      cancellation_policy: data.cancellation_policy ?? "",
      confirmation_text: data.confirmation_text ?? "",
    });
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      saveSettings({
        data: {
          ...form,
          default_capacity: Number(form.default_capacity),
          default_price: Number(form.default_price),
          payment_methods: (data?.payment_methods as string[]) ?? ["yape", "plin", "cash"],
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast("Configuración guardada");
    },
    onError: (e) => toast(e instanceof Error ? e.message : "No pudimos guardar"),
  });

  return (
    <AdminShell title="Configuración" description="Los valores por defecto de la casa.">
      <div className="card-soft grid max-w-2xl gap-4 p-5 sm:grid-cols-2">
        <Field label="Nombre del negocio" className="sm:col-span-2">
          <Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
        </Field>
        <Field label="Dirección" className="sm:col-span-2">
          <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </Field>
        <Field label="Capacidad por defecto">
          <Input
            type="number"
            min={1}
            value={form.default_capacity}
            onChange={(e) => setForm({ ...form, default_capacity: Number(e.target.value) })}
          />
        </Field>
        <Field label="Precio por defecto">
          <Input
            type="number"
            min={0}
            step="0.5"
            value={form.default_price}
            onChange={(e) => setForm({ ...form, default_price: Number(e.target.value) })}
          />
        </Field>
        <Field label="Política de cancelación" className="sm:col-span-2">
          <Textarea
            value={form.cancellation_policy}
            onChange={(e) => setForm({ ...form, cancellation_policy: e.target.value })}
            className="min-h-24"
          />
        </Field>
        <Field label="Texto de confirmación" className="sm:col-span-2">
          <Textarea
            value={form.confirmation_text}
            onChange={(e) => setForm({ ...form, confirmation_text: e.target.value })}
            className="min-h-24"
          />
        </Field>
        <div className="sm:col-span-2">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            Guardar cambios
          </Button>
        </div>
      </div>
    </AdminShell>
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
