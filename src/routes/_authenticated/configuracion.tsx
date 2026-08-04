import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminShell } from "@/components/asocial/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { settingsQuery, emailTemplatesQuery, type EmailTemplateRow } from "@/lib/queries";
import { saveSettings, saveEmailTemplate } from "@/lib/admin.functions";
import { emailTemplateVariables } from "@/lib/domain";
import { whatsappTemplateVariables } from "@/lib/whatsapp";

export const Route = createFileRoute("/_authenticated/configuracion")({
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery(settingsQuery());
  const { data: templates } = useQuery(emailTemplatesQuery());
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
    payment_instructions: "",
    whatsapp_message_template: "",
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
      payment_instructions: data.payment_instructions ?? "",
      whatsapp_message_template: (data as { whatsapp_message_template?: string }).whatsapp_message_template ?? "",
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
        <Field label="Instrucciones de pago (Yape, Plin, transferencia)" className="sm:col-span-2">
          <Textarea
            value={form.payment_instructions}
            onChange={(e) => setForm({ ...form, payment_instructions: e.target.value })}
            className="min-h-32"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Este texto se inserta en los correos con la variable {"{{payment_options}}"}.
          </p>
        </Field>
        <Field label="Mensaje de WhatsApp (reserva pendiente de pago)" className="sm:col-span-2">
          <Textarea
            value={form.whatsapp_message_template}
            onChange={(e) => setForm({ ...form, whatsapp_message_template: e.target.value })}
            className="min-h-32"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Se usa en el botón “WhatsApp” de cada reserva. Variables: {whatsappTemplateVariables.join(" ")}
          </p>
        </Field>
        <div className="sm:col-span-2">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            Guardar cambios
          </Button>
        </div>
      </div>

      <section className="mt-10 max-w-2xl">
        <h2 className="text-sm font-medium">Plantillas de correo</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Variables disponibles: {emailTemplateVariables.join(" ")}
        </p>
        <div className="mt-4 space-y-4">
          {(templates ?? []).map((t) => (
            <TemplateCard key={t.id} template={t} />
          ))}
        </div>
      </section>
    </AdminShell>
  );
}

function TemplateCard({ template }: { template: EmailTemplateRow }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    subject: template.subject ?? "",
    title: template.title ?? "",
    body: template.body ?? "",
    extra_info: template.extra_info ?? "",
    signature: template.signature ?? "",
    enabled: template.enabled ?? true,
  });

  const save = useMutation({
    mutationFn: () => saveEmailTemplate({ data: { id: template.id, ...form } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast("Plantilla guardada");
    },
    onError: (e) => toast(e instanceof Error ? e.message : "No pudimos guardar la plantilla"),
  });

  return (
    <div className="card-soft space-y-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm">{template.name}</p>
          <p className="text-xs text-muted-foreground">{template.template_key}</p>
        </div>
        <Switch checked={form.enabled} onCheckedChange={(enabled) => setForm({ ...form, enabled })} />
      </div>
      <Field label="Asunto">
        <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
      </Field>
      <Field label="Título">
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </Field>
      <Field label="Cuerpo">
        <Textarea
          className="min-h-40"
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
        />
      </Field>
      <Field label="Bloque destacado (instrucciones de pago, notas)">
        <Textarea
          className="min-h-24"
          value={form.extra_info}
          onChange={(e) => setForm({ ...form, extra_info: e.target.value })}
        />
      </Field>
      <Field label="Firma">
        <Textarea
          className="min-h-20"
          value={form.signature}
          onChange={(e) => setForm({ ...form, signature: e.target.value })}
        />
      </Field>
      <Button onClick={() => save.mutate()} disabled={save.isPending}>
        {save.isPending ? "Guardando…" : "Guardar plantilla"}
      </Button>
    </div>
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
