import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AdminShell } from "@/components/asocial/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendTestEmail } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/probar-correo")({
  component: TestEmailPage,
  head: () => ({
    meta: [
      { title: "Probar correo · asocial café omakase" },
      {
        name: "description",
        content:
          "Envía manualmente los correos de resumen y de confirmación de pago para verificar la entrega.",
      },
      { property: "og:title", content: "Probar correo · asocial café omakase" },
      {
        property: "og:description",
        content: "Envía manualmente los correos de resumen y de confirmación de pago.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type TemplateKey = "reservation_confirmed" | "payment_confirmed" | "complimentary_confirmed";

const CARDS: { key: TemplateKey; title: string; description: string }[] = [
  {
    key: "reservation_confirmed",
    title: "Resumen de reserva",
    description:
      "El correo que recibe el cliente al reservar: datos de la reserva, medios de pago y aviso de enviar el comprobante por WhatsApp.",
  },
  {
    key: "payment_confirmed",
    title: "Confirmación de pago",
    description:
      "El correo que sale cuando se valida el pago: reserva confirmada con todos los datos.",
  },
  {
    key: "complimentary_confirmed",
    title: "Confirmación de cortesía",
    description:
      "El correo inmediato para una reserva cuyo descuento deja el total en S/0; no incluye instrucciones de pago.",
  },
];

function TestEmailPage() {
  const [email, setEmail] = useState("");
  const [last, setLast] = useState<{
    key: TemplateKey;
    ok: boolean;
    reason?: string | undefined;
  } | null>(null);
  const send = useServerFn(sendTestEmail);

  const mutation = useMutation({
    mutationFn: (key: TemplateKey) => send({ data: { template: key, to: email.trim() } }),
    onSuccess: (result, key) => {
      setLast({ key, ok: result.sent, reason: result.reason });
      if (result.sent) toast.success(`Correo enviado a ${email.trim()}`);
      else toast.error(`No se envió: ${result.reason ?? "motivo desconocido"}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  return (
    <AdminShell
      title="Probar correo"
      description="Envía una versión de prueba, con datos de ejemplo, a la dirección que indiques."
    >
      <div className="max-w-xl">
        <Label htmlFor="test-email" className="text-xs text-muted-foreground">
          Dirección de destino
        </Label>
        <Input
          id="test-email"
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Se usan datos ficticios (código TEST-0001). No afecta reservas ni pagos reales.
        </p>
      </div>

      <div className="mt-8 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card) => (
          <div key={card.key} className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-medium text-foreground">{card.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{card.description}</p>
            <Button
              className="mt-4 w-full"
              disabled={!valid || mutation.isPending}
              onClick={() => mutation.mutate(card.key)}
            >
              {mutation.isPending && mutation.variables === card.key
                ? "Enviando…"
                : "Enviar prueba"}
            </Button>
            {last?.key === card.key ? (
              <p
                className={`mt-3 text-xs ${last.ok ? "text-muted-foreground" : "text-destructive"}`}
              >
                {last.ok
                  ? "Enviado correctamente."
                  : `No se envió: ${last.reason ?? "motivo desconocido"}`}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      <p className="mt-8 max-w-xl text-xs leading-relaxed text-muted-foreground">
        Si el envío falla con “email_domain_not_configured”, el dominio de correo aún no terminó de
        verificarse.
      </p>
    </AdminShell>
  );
}
