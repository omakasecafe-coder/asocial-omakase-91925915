import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BookingStepper } from "@/components/asocial/BookingStepper";
import { AvailabilityBadge } from "@/components/asocial/AvailabilityBadge";
import { EmptyState } from "@/components/asocial/EmptyState";
import { PhoneInput } from "@/components/asocial/PhoneInput";
import logoLight from "@/assets/asocial-logo-light.png.asset.json";
import bgLino from "@/assets/background-lino.png.asset.json";
import bgCarbon from "@/assets/background-carbon.png.asset.json";
import { publicSessionsQuery } from "@/lib/queries";
import { createPublicReservation, type PublicSession } from "@/lib/public.functions";
import { hour, money, relativeDay, longDay } from "@/lib/format";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";


type Step = 1 | 2 | 3 | 4;

export function BookingExperience() {
  const queryClient = useQueryClient();
  const { data: sessions = [], isLoading } = useQuery(publicSessionsQuery());

  const [step, setStep] = useState<Step>(1);
  const [selected, setSelected] = useState<PublicSession | null>(null);
  const [guests, setGuests] = useState(1);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    dietary: "",
    notes: "",
  });
  const [confirmation, setConfirmation] = useState<{ code: string; total: number } | null>(null);

  const total = useMemo(
    () => (selected ? Number(selected.precio_por_persona) * guests : 0),
    [selected, guests],
  );

  const reserve = useMutation({
    mutationFn: () =>
      createPublicReservation({
        data: {
          sessionId: selected!.id,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          guestCount: guests,
          dietary: form.dietary.trim(),
          notes: form.notes.trim(),
        },
      }),
    onSuccess: (result) => {
      setConfirmation({ code: result.bookingCode, total: result.total });
      setStep(4);
      trackEvent("purchase", {
        transaction_id: result.bookingCode,
        value: result.total,
        currency: "PEN",
        items: selected ? [{ item_id: selected.id, item_name: longDay(selected.fecha), quantity: guests }] : [],
      });
      queryClient.invalidateQueries({ queryKey: ["public-sessions"] });
    },
    onError: (error) => {
      trackEvent("reservation_error", { message: error instanceof Error ? error.message : "unknown" });
      toast(error instanceof Error ? error.message : "No pudimos guardar tu reserva");
    },

  });

  return (
    <div
      className="flex min-h-screen flex-col bg-background bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${bgLino.url})` }}
    >
      <header className="sticky top-0 z-50 px-5 pb-6 pt-7 text-lino md:px-10 md:pb-8 md:pt-9">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-20 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${bgCarbon.url})` }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-carbon/70 via-carbon/45 to-carbon/60"
        />

        <div className="mx-auto max-w-2xl">
          <img src={logoLight.url} alt="asocial · café omakase" className="h-11 w-auto drop-shadow-lg md:h-[3.25rem]" />

          <p className="mt-4 text-sm font-medium leading-snug text-lino drop-shadow-md md:text-base">
            Una experiencia guiada para descubrir el café con calma.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-8 md:px-10 md:py-12">
        {step < 4 ? <BookingStepper step={step} className="mb-8" /> : null}

        {step === 1 ? (
          <section>
            <h1 className="text-lg font-medium">Reserva tu sesión de café omakase</h1>
            <p className="mt-1 text-sm text-muted-foreground">Elige el horario que prefieras.</p>

            <div className="mt-6 space-y-3">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Preparando las sesiones…</p>
              ) : sessions.length === 0 ? (
                <EmptyState
                  title="No hay sesiones abiertas por ahora."
                  description="Publicamos nuevas fechas cada semana."
                />
              ) : (
                sessions.map((session) => {
                  const full = session.available <= 0;
                  const open = () => {
                    if (full) return;
                    setSelected(session);
                    setGuests(1);
                    setStep(2);
                    trackEvent("select_session", {
                      session_id: session.id,
                      session_date: session.fecha,
                      session_time: session.hora_inicio,
                    });
                  };

                  return (
                    <div
                      key={session.id}
                      className={cn(
                        "card-soft bg-card/85 px-4 py-3.5 transition-colors duration-200",
                        full ? "opacity-70" : "cursor-pointer hover:border-nogal/40",
                      )}
                      onClick={open}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                            {relativeDay(session.fecha)}
                          </p>
                          <p className="mt-0.5 text-lg font-medium leading-tight">{hour(session.hora_inicio)}</p>
                          {session.descripcion_publica ? (
                            <p className="mt-1 line-clamp-1 text-xs leading-relaxed text-muted-foreground">
                              {session.descripcion_publica}
                            </p>
                          ) : null}
                        </div>
                        <AvailabilityBadge available={session.available} />
                      </div>
                      <Button
                        className="mt-3 w-full rounded-xl"
                        disabled={full}
                        onClick={(e) => {
                          e.stopPropagation();
                          open();
                        }}
                      >
                        {full ? "Agotado" : "Reservar"}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        ) : null}

        {step === 2 && selected ? (
          <section className="card-soft bg-card/85 p-6 md:p-8">
            <h2 className="text-xl font-medium">Cuéntanos quién viene</h2>
            <SessionSummary session={selected} />

            <div className="mt-8 space-y-4">
              <Field label="Número de personas">
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 6 }, (_, i) => i + 1).map((n) => {
                    const disabled = n > selected.available;
                    return (
                      <button
                        key={n}
                        disabled={disabled}
                        onClick={() => setGuests(n)}
                        className={cn(
                          "h-10 w-10 rounded-full border text-sm transition-colors duration-200",
                          disabled
                            ? "cursor-not-allowed border-border/50 text-muted-foreground/40"
                            : guests === n
                              ? "border-carbon bg-carbon text-lino"
                              : "border-border text-foreground hover:border-nogal/40",
                        )}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <div className="grid gap-4">
                <Field label="Nombre">
                  <Input
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="bg-card"
                  />
                </Field>
                <Field label="Apellido">
                  <Input
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="bg-card"
                  />
                </Field>
                <Field label="Email">
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="bg-card"
                  />
                </Field>
                <div>
                  <PhoneInput
                    value={form.phone}
                    onChange={(phone) => setForm({ ...form, phone })}
                    placeholder="Número de celular"
                  />
                </div>
              </div>

              <Field label="Alergias o restricciones (opcional)">
                <Textarea
                  value={form.dietary}
                  onChange={(e) => setForm({ ...form, dietary: e.target.value })}
                  className="min-h-20 bg-card"
                />
              </Field>
              <Field label="Comentarios (opcional)">
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="min-h-20 bg-card"
                />
              </Field>
            </div>

            <div className="mt-8 flex gap-2">
              <Button
                onClick={() => {
                  if (!form.firstName.trim() || !form.email.trim() || form.phone.trim().length < 6) {
                    toast("Necesitamos tu nombre, WhatsApp y email.");
                    return;
                  }
                  trackEvent("begin_checkout", { guests, value: total, currency: "PEN" });
                  setStep(3);
                }}
              >
                Continuar
              </Button>
              <Button variant="ghost" onClick={() => setStep(1)}>
                Volver
              </Button>
            </div>
          </section>
        ) : null}

        {step === 3 && selected ? (
          <section>
            <h2 className="text-xl font-medium">Revisa tu reserva</h2>
            <div className="card-soft mt-6 divide-y divide-border">
              <Row label="Fecha" value={longDay(selected.fecha)} />
              <Row label="Hora" value={hour(selected.hora_inicio)} />
              <Row label="Personas" value={String(guests)} />
              <Row label="Precio por persona" value={money(selected.precio_por_persona)} />
              <div className="rounded-lg bg-musgo/15 px-5 py-3.5">
                <Row label="Total" value={money(total)} strong />
              </div>
            </div>
            <div className="mt-8 flex gap-2">
              <Button onClick={() => reserve.mutate()} disabled={reserve.isPending}>
                {reserve.isPending ? "Guardando…" : "Registrar reserva"}
              </Button>
              <Button variant="ghost" onClick={() => setStep(2)}>
                Volver
              </Button>
            </div>
          </section>
        ) : null}

        {step === 4 && confirmation && selected ? (
          <section className="animate-in fade-in duration-200">
            <h2 className="text-xl font-medium">Tu lugar está reservado</h2>
            <div className="card-soft mt-6 divide-y divide-border">
              <Row label="Código" value={confirmation.code} strong />
              <Row label="Fecha" value={longDay(selected.fecha)} />
              <Row label="Hora" value={hour(selected.hora_inicio)} />
              <Row label="Personas" value={String(guests)} />
              <Row label="Total" value={money(confirmation.total)} />
              <Row label="Estado de pago" value="Pago por confirmar" strong />
            </div>
            <p className="mt-6 flex items-start gap-2 text-sm font-semibold leading-relaxed text-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Te enviamos un correo con el resumen y los medios de pago. Envíanos el comprobante por WhatsApp y tu
              reserva quedará confirmada.
            </p>
          </section>
        ) : null}
      </main>

      <footer className="mt-auto border-t border-border/60 px-5 py-6 text-center text-xs tracking-wide text-muted-foreground">
        menos ruido, más café.
      </footer>
    </div>
  );
}

function SessionSummary({ session }: { session: PublicSession }) {
  return (
    <div className="card-soft mt-6 flex items-center justify-between gap-4 px-5 py-4">
      <div>
        <p className="text-sm">{relativeDay(session.fecha)}</p>
        <p className="mt-0.5 text-base font-medium">{hour(session.hora_inicio)}</p>
      </div>
      <AvailabilityBadge available={session.available} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-sm", strong && "font-semibold")}>{value}</span>
    </div>
  );
}
