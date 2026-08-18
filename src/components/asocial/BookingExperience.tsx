import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Instagram, Phone } from "lucide-react";
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
import { money } from "@/lib/format";
import {
  bookingCopy,
  hourI18n,
  longDayI18n,
  parseLang,
  relativeDayI18n,
  seatsLabelI18n,
  type Lang,
} from "@/lib/booking-i18n";
import { identifyTikTokUser, trackEvent, trackMetaEvent, trackTikTokEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3 | 4;
type ContactErrors = Partial<Record<"firstName" | "email" | "phone", string>>;

function sessionEventParams(session: PublicSession, guests = 1) {
  const value = Number(session.precio_por_persona) * guests;
  return {
    content_ids: [session.id],
    content_name: `Café omakase · ${session.fecha} ${session.hora_inicio.slice(0, 5)}`,
    content_type: "product",
    contents: [{ id: session.id, quantity: guests }],
    currency: "PEN",
    num_items: guests,
    value,
  };
}

function tiktokSessionEventParams(session: PublicSession, guests = 1) {
  const value = Number(session.precio_por_persona) * guests;
  return {
    contents: [
      {
        content_id: session.id,
        content_type: "product",
        content_name: `Café omakase · ${session.fecha} ${session.hora_inicio.slice(0, 5)}`,
      },
    ],
    value,
    currency: "PEN",
  };
}

function analyticsItems(session: PublicSession, guests: number) {
  return [
    {
      item_id: session.id,
      item_name: `Café omakase · ${session.fecha} ${session.hora_inicio.slice(0, 5)}`,
      item_category: "coffee_omakase",
      price: Number(session.precio_por_persona),
      quantity: guests,
    },
  ];
}

export function BookingExperience({ lang: langProp }: { lang?: string | undefined } = {}) {
  const queryClient = useQueryClient();
  const lang: Lang = parseLang(langProp);
  const t = bookingCopy[lang];
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
  const [formErrors, setFormErrors] = useState<ContactErrors>({});
  const [confirmation, setConfirmation] = useState<{ code: string; total: number } | null>(null);

  const total = useMemo(
    () => (selected ? Number(selected.precio_por_persona) * guests : 0),
    [selected, guests],
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const clearFormError = (key: keyof ContactErrors) => {
    setFormErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const validateContact = () => {
    const errors: ContactErrors = {};
    const email = form.email.trim();

    if (!form.firstName.trim()) errors.firstName = t.errFirstName;
    if (!email) {
      errors.email = t.errEmailRequired;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = t.errEmailInvalid;
    }
    if (form.phone.trim().length < 6) errors.phone = t.errPhone;

    setFormErrors(errors);

    const firstError = Object.keys(errors)[0];
    if (firstError) {
      requestAnimationFrame(() => {
        document
          .querySelector(`[data-booking-field="${firstError}"]`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }

    return Object.keys(errors).length === 0;
  };

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
      trackEvent("reservation_created", {
        reservation_id: result.bookingCode,
        value: result.total,
        currency: "PEN",
        status: "payment_pending",
        language: lang,
        items: selected ? analyticsItems(selected, guests) : [],
      });
      trackEvent("generate_lead", {
        value: result.total,
        currency: "PEN",
        lead_source: "website_reservation",
        status: "payment_pending",
        language: lang,
        items: selected ? analyticsItems(selected, guests) : [],
      });
      if (selected) {
        trackMetaEvent("Schedule", {
          ...sessionEventParams(selected, guests),
          order_id: result.bookingCode,
          status: "payment_pending",
        });
        void (async () => {
          await identifyTikTokUser({
            email: form.email,
            phone: form.phone,
            externalId: result.bookingCode,
          });
          trackTikTokEvent("CompleteRegistration", {
            ...tiktokSessionEventParams(selected, guests),
            order_id: result.bookingCode,
            status: "payment_pending",
          });
        })();
      }
      queryClient.invalidateQueries({ queryKey: ["public-sessions"] });
    },
    onError: (error) => {
      trackEvent("reservation_error", {
        message: error instanceof Error ? error.message : "unknown",
      });
      toast(error instanceof Error ? error.message : t.errSave);
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
          <img
            src={logoLight.url}
            alt="asocial · café omakase"
            className="h-11 w-auto drop-shadow-lg md:h-[3.25rem]"
          />

          <div className="mt-4 flex items-start justify-between gap-4">
            <p className="max-w-md text-sm font-medium leading-snug text-lino drop-shadow-md md:text-base">
              {t.tagline}
            </p>
            <LanguageSwitch current={lang} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-8 md:px-10 md:py-12">
        {step < 4 ? <BookingStepper step={step} labels={t.steps} className="mb-8" /> : null}

        {step === 1 ? (
          <section>
            <h1 className="text-lg font-medium">{t.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t.subtitle}</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t.intro}</p>

            <div className="mt-6 space-y-3">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">{t.loading}</p>
              ) : sessions.length === 0 ? (
                <EmptyState title={t.emptyTitle} description={t.emptyDescription} />
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
                      language: lang,
                    });
                    trackMetaEvent("ViewContent", sessionEventParams(session));
                    trackTikTokEvent("ViewContent", tiktokSessionEventParams(session));
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
                            {relativeDayI18n(session.fecha, lang)}
                          </p>
                          <p className="mt-0.5 text-lg font-medium leading-tight">
                            {hourI18n(session.hora_inicio, lang)}
                          </p>
                          {session.descripcion_publica ? (
                            <p className="mt-1 line-clamp-1 text-xs leading-relaxed text-muted-foreground">
                              {session.descripcion_publica}
                            </p>
                          ) : null}
                        </div>
                        <AvailabilityBadge
                          available={session.available}
                          label={seatsLabelI18n(session.available, lang)}
                        />
                      </div>
                      <Button
                        className="mt-3 w-full rounded-xl"
                        disabled={full}
                        onClick={(e) => {
                          e.stopPropagation();
                          open();
                        }}
                      >
                        {full ? t.soldOut : t.reserve}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>

            <section className="mt-10 border-t border-border/70 pt-8">
              <h2 className="text-base font-medium">{t.aboutTitle}</h2>
              <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
                <p>{t.aboutP1}</p>
                <p>{t.aboutP2}</p>
              </div>
              <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    {t.formatLabel}
                  </dt>
                  <dd className="mt-1 text-foreground">{t.formatValue}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    {t.seatsLabel}
                  </dt>
                  <dd className="mt-1 text-foreground">{t.seatsValue}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    {t.bookingLabel}
                  </dt>
                  <dd className="mt-1 text-foreground">{t.bookingValue}</dd>
                </div>
              </dl>
            </section>
          </section>
        ) : null}

        {step === 2 && selected ? (
          <section className="card-soft bg-card/85 p-6 md:p-8">
            <h2 className="text-xl font-medium">{t.whoTitle}</h2>
            <SessionSummary session={selected} lang={lang} />

            <div className="mt-8 space-y-4">
              <Field label={t.guestsLabel}>
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
                <Field label={t.firstName} fieldKey="firstName" error={formErrors.firstName}>
                  <Input
                    value={form.firstName}
                    onChange={(e) => {
                      setForm({ ...form, firstName: e.target.value });
                      clearFormError("firstName");
                    }}
                    className="bg-card"
                  />
                </Field>
                <Field label={t.lastName}>
                  <Input
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="bg-card"
                  />
                </Field>
                <Field label={t.email} fieldKey="email" error={formErrors.email}>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => {
                      setForm({ ...form, email: e.target.value });
                      clearFormError("email");
                    }}
                    className="bg-card"
                  />
                </Field>
                <div className="space-y-2" data-booking-field="phone">
                  <PhoneInput
                    value={form.phone}
                    onChange={(phone) => {
                      setForm({ ...form, phone });
                      clearFormError("phone");
                    }}
                    placeholder={t.phonePlaceholder}
                  />
                  {formErrors.phone ? <FieldError>{formErrors.phone}</FieldError> : null}
                </div>
              </div>

              <Field label={t.dietary}>
                <Textarea
                  value={form.dietary}
                  onChange={(e) => setForm({ ...form, dietary: e.target.value })}
                  className="min-h-20 bg-card"
                />
              </Field>
              <Field label={t.notes}>
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
                  if (!validateContact()) {
                    toast(t.errReview);
                    return;
                  }
                  trackEvent("begin_checkout", {
                    guests,
                    value: total,
                    currency: "PEN",
                    language: lang,
                    items: analyticsItems(selected, guests),
                  });
                  trackMetaEvent(
                    "InitiateCheckout",
                    selected
                      ? sessionEventParams(selected, guests)
                      : {
                          currency: "PEN",
                          num_items: guests,
                          value: total,
                        },
                  );
                  void (async () => {
                    await identifyTikTokUser({ email: form.email, phone: form.phone });
                    trackTikTokEvent("ClickButton", {
                      ...tiktokSessionEventParams(selected, guests),
                      button_name: "Continuar reserva",
                    });
                  })();
                  setStep(3);
                }}
              >
                {t.continue}
              </Button>
              <Button variant="ghost" onClick={() => setStep(1)}>
                {t.back}
              </Button>
            </div>
          </section>
        ) : null}

        {step === 3 && selected ? (
          <section>
            <h2 className="text-xl font-medium">{t.reviewTitle}</h2>
            <div className="card-soft mt-6 divide-y divide-border">
              <Row label={t.date} value={longDayI18n(selected.fecha, lang)} />
              <Row label={t.time} value={hourI18n(selected.hora_inicio, lang)} />
              <Row label={t.people} value={String(guests)} />
              <Row label={t.pricePerPerson} value={money(selected.precio_por_persona)} />
              <Row label={t.paymentStatus} value={t.paymentPending} strong />
              <div className="rounded-lg bg-musgo/15 px-5 py-3.5">
                <Row label={t.total} value={money(total)} strong />
              </div>
            </div>
            <p className="mt-4 flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {t.pendingNote}
            </p>
            <div className="mt-8 flex gap-2">
              <Button
                onClick={() => {
                  trackTikTokEvent("ClickButton", {
                    ...tiktokSessionEventParams(selected, guests),
                    button_name: "Solicitar reserva",
                  });
                  reserve.mutate();
                }}
                disabled={reserve.isPending}
              >
                {reserve.isPending ? t.requesting : t.requestCta}
              </Button>
              <Button variant="ghost" onClick={() => setStep(2)}>
                {t.back}
              </Button>
            </div>
          </section>
        ) : null}

        {step === 4 && confirmation && selected ? (
          <section className="animate-in fade-in duration-200">
            <h2 className="text-xl font-medium">{t.confirmedTitle}</h2>
            <div className="card-soft mt-6 divide-y divide-border">
              <Row label={t.code} value={confirmation.code} strong />
              <Row label={t.date} value={longDayI18n(selected.fecha, lang)} />
              <Row label={t.time} value={hourI18n(selected.hora_inicio, lang)} />
              <Row label={t.people} value={String(guests)} />
              <Row label={t.total} value={money(confirmation.total)} />
              <Row label={t.paymentStatus} value={t.paymentPending} strong />
            </div>
            <p className="mt-6 flex items-start gap-2 text-sm font-semibold leading-relaxed text-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {t.confirmedNote}
            </p>
          </section>
        ) : null}
      </main>

      <footer className="mt-auto border-t border-border/60 px-5 py-6 text-center text-xs tracking-wide text-muted-foreground">
        <div className="flex items-center justify-center gap-4">
          <a
            href="https://wa.me/51919112980"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 transition-colors duration-200 hover:text-foreground"
          >
            <Phone className="h-3.5 w-3.5" />
            WhatsApp
          </a>
          <span className="text-border">·</span>
          <a
            href="https://www.instagram.com/omakase.cafe/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 transition-colors duration-200 hover:text-foreground"
          >
            <Instagram className="h-3.5 w-3.5" />
            Instagram
          </a>
        </div>
        <p className="mt-3">{t.footerTagline}</p>
      </footer>
    </div>
  );
}

function LanguageSwitch({ current }: { current: Lang }) {
  const setLang = (next: Lang) => {
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    window.history.replaceState({}, "", url.toString());
    window.dispatchEvent(new PopStateEvent("popstate"));
  };
  return (
    <div className="flex shrink-0 rounded-full border border-lino/25 p-0.5 text-[10px] tracking-[0.14em]">
      {(["es", "en"] as const).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setLang(item)}
          aria-pressed={current === item}
          className={cn(
            "rounded-full px-2.5 py-1.5 transition-colors duration-200",
            current === item ? "bg-lino text-carbon" : "text-lino/70 hover:text-lino",
          )}
        >
          {item.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function SessionSummary({ session, lang }: { session: PublicSession; lang: Lang }) {
  return (
    <div className="card-soft mt-6 flex items-center justify-between gap-4 px-5 py-4">
      <div>
        <p className="text-sm">{relativeDayI18n(session.fecha, lang)}</p>
        <p className="mt-0.5 text-base font-medium">{hourI18n(session.hora_inicio, lang)}</p>
      </div>
      <AvailabilityBadge
        available={session.available}
        label={seatsLabelI18n(session.available, lang)}
      />
    </div>
  );
}

function Field({
  label,
  children,
  error,
  fieldKey,
}: {
  label: string;
  children: React.ReactNode;
  error?: string | undefined;
  fieldKey?: string;
}) {
  return (
    <div className="space-y-2" data-booking-field={fieldKey}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium text-arcilla">{children}</p>;
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-sm", strong && "font-semibold")}>{value}</span>
    </div>
  );
}
