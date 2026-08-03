import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { createPublicReservation, joinWaitlist, type PublicSession } from "@/lib/public.functions";
import { hour, money, relativeDay, longDay } from "@/lib/format";
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
  const [waitlistFor, setWaitlistFor] = useState<PublicSession | null>(null);

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
      queryClient.invalidateQueries({ queryKey: ["public-sessions"] });
    },
    onError: (error) => toast(error instanceof Error ? error.message : "No pudimos guardar tu reserva"),
  });

  const waitlist = useMutation({
    mutationFn: () =>
      joinWaitlist({
        data: {
          sessionId: waitlistFor!.id,
          name: `${form.firstName} ${form.lastName}`.trim() || "Invitado",
          phone: form.phone.trim(),
          email: form.email.trim(),
          seats: guests,
        },
      }),
    onSuccess: () => {
      toast("Te avisaremos si se libera un lugar.");
      setWaitlistFor(null);
    },
    onError: (error) => toast(error instanceof Error ? error.message : "No pudimos guardarte en la lista"),
  });

  return (
    <div
      className="min-h-screen bg-background bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${bgLino.url})` }}
    >
      <header
        className="bg-carbon bg-cover bg-center bg-no-repeat px-5 pb-14 pt-12 text-lino md:px-10 md:pb-20 md:pt-16"
        style={{ backgroundImage: `url(${bgCarbon.url})` }}
      >
        <div className="mx-auto max-w-2xl">
          <img src={logoLight.url} alt="asocial · café omakase" className="h-14 w-auto md:h-16" />

          <p className="mt-10 max-w-md text-base leading-relaxed text-lino/80">
            Una experiencia guiada para descubrir el café con calma.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-10 md:px-10 md:py-14">
        {step < 4 ? <BookingStepper step={step} className="mb-10" /> : null}

        {step === 1 ? (
          <section>
            <h1 className="text-xl font-medium">Elige cuándo venir</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Mostramos solo los momentos que aún tienen lugar.
            </p>

            <div className="mt-8 space-y-3">
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
                  return (
                    <div
                      key={session.id}
                      className={cn(
                        "card-soft flex items-center justify-between gap-4 px-5 py-4 transition-colors duration-200",
                        full ? "opacity-70" : "cursor-pointer hover:border-nogal/40",
                      )}
                      onClick={() => {
                        if (full) {
                          setWaitlistFor(session);
                          return;
                        }
                        setSelected(session);
                        setGuests(Math.min(2, session.available));
                        setStep(2);
                      }}
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-foreground">{relativeDay(session.fecha)}</p>
                        <p className="mt-1 text-lg font-medium">{hour(session.hora_inicio)}</p>
                        {session.descripcion_publica ? (
                          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                            {session.descripcion_publica}
                          </p>
                        ) : null}
                      </div>
                      <AvailabilityBadge available={session.available} />
                    </div>
                  );
                })
              )}
            </div>

            {waitlistFor ? (
              <div className="card-soft mt-8 p-5">
                <p className="text-sm">Esta sesión está completa.</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {relativeDay(waitlistFor.fecha)} · {hour(waitlistFor.hora_inicio)}
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Field label="Nombre">
                    <Input
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      className="bg-background"
                    />
                  </Field>
                  <Field label="WhatsApp">
                    <PhoneInput value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
                  </Field>
                  <Field label="Email">
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="bg-background"
                    />
                  </Field>
                  <Field label="Lugares">
                    <Input
                      type="number"
                      min={1}
                      max={8}
                      value={guests}
                      onChange={(e) => setGuests(Number(e.target.value))}
                      className="bg-background"
                    />
                  </Field>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button onClick={() => waitlist.mutate()} disabled={waitlist.isPending}>
                    Unirme a la lista de espera
                  </Button>
                  <Button variant="ghost" onClick={() => setWaitlistFor(null)}>
                    Volver
                  </Button>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {step === 2 && selected ? (
          <section>
            <h1 className="text-xl font-medium">Cuéntanos quién viene</h1>
            <SessionSummary session={selected} />

            <div className="mt-8 space-y-4">
              <Field label="Número de personas">
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: Math.min(selected.available, 6) }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      onClick={() => setGuests(n)}
                      className={cn(
                        "h-10 w-10 rounded-full border text-sm transition-colors duration-200",
                        guests === n
                          ? "border-carbon bg-carbon text-lino"
                          : "border-border text-foreground hover:border-nogal/40",
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
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
                <Field label="WhatsApp">
                  <PhoneInput value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
                </Field>
                <Field label="Email">
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="bg-card"
                  />
                </Field>
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
            <h1 className="text-xl font-medium">Revisa tu reserva</h1>
            <div className="card-soft mt-6 divide-y divide-border">
              <Row label="Fecha" value={longDay(selected.fecha)} />
              <Row label="Hora" value={hour(selected.hora_inicio)} />
              <Row label="Personas" value={String(guests)} />
              <Row label="Precio por persona" value={money(selected.precio_por_persona)} />
              <Row label="Total" value={money(total)} strong />
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              A nombre de {form.firstName} {form.lastName}. Te escribiremos al {form.phone}.
            </p>
            <div className="mt-8 flex gap-2">
              <Button onClick={() => reserve.mutate()} disabled={reserve.isPending}>
                {reserve.isPending ? "Guardando…" : "Confirmar reserva"}
              </Button>
              <Button variant="ghost" onClick={() => setStep(2)}>
                Volver
              </Button>
            </div>
          </section>
        ) : null}

        {step === 4 && confirmation && selected ? (
          <section className="animate-in fade-in duration-200">
            <h1 className="text-xl font-medium">Tu lugar está reservado</h1>
            <p className="mt-3 text-sm text-muted-foreground">Código {confirmation.code}</p>
            <div className="card-soft mt-6 divide-y divide-border">
              <Row label="Fecha" value={longDay(selected.fecha)} />
              <Row label="Hora" value={hour(selected.hora_inicio)} />
              <Row label="Personas" value={String(guests)} />
              <Row label="Total" value={money(confirmation.total)} />
              <Row label="Estado de pago" value="Pago por confirmar" />
            </div>
            <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
              Te enviaremos por WhatsApp la información necesaria para completar tu reserva.
            </p>
            <Button
              variant="ghost"
              className="mt-8 px-0"
              onClick={() => {
                setStep(1);
                setSelected(null);
                setConfirmation(null);
              }}
            >
              Reservar otro momento
            </Button>
          </section>
        ) : null}
      </main>

      <footer className="px-5 pb-12 text-center text-xs text-muted-foreground">
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
