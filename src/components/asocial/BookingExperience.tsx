import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  BadgePercent,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Instagram,
  Minus,
  Phone,
  Plus,
  ShieldCheck,
  TicketPercent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BookingStepper } from "@/components/asocial/BookingStepper";
import { AvailabilityBadge } from "@/components/asocial/AvailabilityBadge";
import { EmptyState } from "@/components/asocial/EmptyState";
import { PhoneInput } from "@/components/asocial/PhoneInput";
import {
  BookingDetailsStepLegacy,
  type BookingContactErrors,
  type BookingContactForm,
} from "@/components/asocial/BookingDetailsStepLegacy";
import logoLight from "@/assets/asocial-logo-light.png.asset.json";
import bgLino from "@/assets/background-lino.png.asset.json";
import bgCarbon from "@/assets/background-carbon.png.asset.json";
import { publicSessionsQuery } from "@/lib/queries";
import {
  createPublicReservation,
  getPublicPriceQuote,
  type PublicPriceQuote,
  type PublicSession,
} from "@/lib/public.functions";
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
const USE_LEGACY_BOOKING_DETAILS = false;

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
  const [form, setForm] = useState<BookingContactForm>({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    dietary: "",
    notes: "",
  });
  const [formErrors, setFormErrors] = useState<BookingContactErrors>({});
  const [confirmation, setConfirmation] = useState<{
    code: string;
    subtotal: number;
    discount: number;
    total: number;
    promotionName: string | null;
    promotionCode: string | null;
    complimentary: boolean;
  } | null>(null);
  const [promoInput, setPromoInput] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [priceQuote, setPriceQuote] = useState<PublicPriceQuote | null>(null);
  const [promotionError, setPromotionError] = useState("");
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [showOptionalDetails, setShowOptionalDetails] = useState(false);
  const [showPromoCode, setShowPromoCode] = useState(false);

  const subtotal = useMemo(
    () => (selected ? Number(selected.precio_por_persona) * guests : 0),
    [selected, guests],
  );

  const quoteRequest = (code: string) =>
    getPublicPriceQuote({
      data: {
        sessionId: selected!.id,
        guestCount: guests,
        promoCode: code,
        email: form.email.trim(),
        phone: form.phone.trim(),
      },
    });

  useEffect(() => {
    if (step !== 3 || !selected) return;
    let current = true;
    setQuoteLoading(true);
    setPromotionError("");
    void quoteRequest(appliedCode)
      .then((quote) => {
        if (current) setPriceQuote(quote);
      })
      .catch((error) => {
        if (current) setPromotionError(error instanceof Error ? error.message : t.errPromotion);
      })
      .finally(() => {
        if (current) setQuoteLoading(false);
      });
    return () => {
      current = false;
    };
    // The quote only changes when the booking inputs or applied code change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selected?.id, guests, appliedCode, form.email, form.phone]);

  const applyPromotion = useMutation({
    mutationFn: async (code: string) => {
      const [automaticQuote, codeQuote] = await Promise.all([quoteRequest(""), quoteRequest(code)]);
      if (codeQuote.promotionApplicationType !== "code" || !codeQuote.promotionCode) {
        throw new Error(t.errPromotion);
      }
      return { automaticQuote, codeQuote, code };
    },
    onSuccess: ({ automaticQuote, codeQuote, code }) => {
      if (codeQuote.discount <= automaticQuote.discount) {
        setAppliedCode("");
        setPriceQuote(automaticQuote);
        setPromotionError(
          t.betterPromotionKept.replace("{amount}", money(automaticQuote.discount)),
        );
        trackEvent("coupon_rejected", {
          coupon: code,
          reason: "automatic_promotion_is_better",
          automatic_discount: automaticQuote.discount,
          code_discount: codeQuote.discount,
          currency: "PEN",
        });
        return;
      }

      setAppliedCode(code);
      setPriceQuote(codeQuote);
      setPromotionError("");
      setShowPromoCode(false);
      trackEvent("coupon_apply", {
        coupon: codeQuote.promotionCode ?? code,
        promotion_name: codeQuote.promotionName,
        discount: codeQuote.discount,
        value: codeQuote.total,
        currency: "PEN",
      });
    },
    onError: (error) => {
      setPromotionError(error instanceof Error ? error.message : t.errPromotion);
      trackEvent("coupon_error", { coupon: promoInput.trim().toUpperCase() });
    },
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const clearFormError = (key: keyof BookingContactErrors) => {
    setFormErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const validateContact = () => {
    const errors: BookingContactErrors = {};
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

  const continueToReview = () => {
    if (!selected) return;
    if (!validateContact()) {
      toast(t.errReview);
      return;
    }
    trackEvent("begin_checkout", {
      guests,
      value: subtotal,
      currency: "PEN",
      language: lang,
      items: analyticsItems(selected, guests),
    });
    trackMetaEvent("InitiateCheckout", sessionEventParams(selected, guests));
    void (async () => {
      await identifyTikTokUser({ email: form.email, phone: form.phone });
      trackTikTokEvent("ClickButton", {
        ...tiktokSessionEventParams(selected, guests),
        button_name: t.continue,
      });
    })();
    setStep(3);
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
          promoCode: appliedCode,
        },
      }),
    onSuccess: (result) => {
      setConfirmation({
        code: result.bookingCode,
        subtotal: result.subtotal,
        discount: result.discount,
        total: result.total,
        promotionName: result.promotionName,
        promotionCode: result.promotionCode,
        complimentary: result.isComplimentary,
      });
      setStep(4);
      trackEvent("reservation_created", {
        reservation_id: result.bookingCode,
        value: result.total,
        currency: "PEN",
        status: result.isComplimentary ? "confirmed" : "payment_pending",
        coupon: result.promotionCode,
        promotion_name: result.promotionName,
        discount: result.discount,
        language: lang,
        items: selected ? analyticsItems(selected, guests) : [],
      });
      trackEvent("generate_lead", {
        value: result.total,
        currency: "PEN",
        lead_source: "website_reservation",
        status: result.isComplimentary ? "confirmed" : "payment_pending",
        coupon: result.promotionCode,
        discount: result.discount,
        language: lang,
        items: selected ? analyticsItems(selected, guests) : [],
      });
      if (selected) {
        trackMetaEvent("Schedule", {
          ...sessionEventParams(selected, guests),
          value: result.total,
          order_id: result.bookingCode,
          status: result.isComplimentary ? "confirmed" : "payment_pending",
        });
        void (async () => {
          await identifyTikTokUser({
            email: form.email,
            phone: form.phone,
            externalId: result.bookingCode,
          });
          trackTikTokEvent("CompleteRegistration", {
            ...tiktokSessionEventParams(selected, guests),
            value: result.total,
            order_id: result.bookingCode,
            status: result.isComplimentary ? "confirmed" : "payment_pending",
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
      <header
        className={cn(
          "sticky top-0 z-50 px-5 text-lino md:px-10 md:pb-8 md:pt-9",
          step === 1 ? "pb-6 pt-7" : "pb-4 pt-4 md:pb-8 md:pt-9",
        )}
      >
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
            className={cn("w-auto drop-shadow-lg md:h-[3.25rem]", step === 1 ? "h-11" : "h-8")}
          />

          <div
            className={cn(
              "flex items-start justify-between gap-4",
              step === 1 ? "mt-4" : "mt-2 justify-end md:mt-4 md:justify-between",
            )}
          >
            <p
              className={cn(
                "max-w-md text-sm font-medium leading-snug text-lino drop-shadow-md md:block md:text-base",
                step > 1 && "hidden",
              )}
            >
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
          </section>
        ) : null}

        {step === 2 && selected ? (
          USE_LEGACY_BOOKING_DETAILS ? (
            <BookingDetailsStepLegacy
              session={selected}
              lang={lang}
              t={t}
              guests={guests}
              setGuests={setGuests}
              form={form}
              setForm={setForm}
              formErrors={formErrors}
              clearFormError={clearFormError}
              onContinue={continueToReview}
              onBack={() => setStep(1)}
            />
          ) : (
            <section className="card-soft bg-card/85 p-5 md:p-8">
              <div>
                <h1 className="text-2xl font-medium tracking-tight">{t.whoTitle}</h1>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {t.whoSubtitle}
                </p>
              </div>

              <SessionSummary
                session={selected}
                lang={lang}
                label={t.sessionSummary}
                changeLabel={t.changeSession}
                onChange={() => setStep(1)}
              />

              <div className="mt-6 border-b border-border/70 pb-6">
                <div className="flex items-center justify-between gap-5">
                  <div>
                    <Label className="text-sm font-medium text-foreground">{t.guestsLabel}</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {seatsLabelI18n(selected.available, lang)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 rounded-full border border-border bg-background/55 p-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full"
                      disabled={guests <= 1}
                      aria-label={lang === "en" ? "Remove one guest" : "Quitar una persona"}
                      onClick={() => setGuests((current) => Math.max(1, current - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="min-w-6 text-center text-lg font-medium tabular-nums">
                      {guests}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full"
                      disabled={guests >= Math.min(selected.available, 12)}
                      aria-label={lang === "en" ? "Add one guest" : "Agregar una persona"}
                      onClick={() =>
                        setGuests((current) => Math.min(selected.available, 12, current + 1))
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h2 className="text-base font-medium">{t.contactTitle}</h2>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {t.contactHint}
                </p>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label={t.firstName} fieldKey="firstName" error={formErrors.firstName}>
                    <Input
                      autoComplete="given-name"
                      value={form.firstName}
                      onChange={(event) => {
                        setForm({ ...form, firstName: event.target.value });
                        clearFormError("firstName");
                      }}
                      className="bg-card"
                    />
                  </Field>
                  <Field label={t.lastName}>
                    <Input
                      autoComplete="family-name"
                      value={form.lastName}
                      onChange={(event) => setForm({ ...form, lastName: event.target.value })}
                      className="bg-card"
                    />
                  </Field>
                  <div className="space-y-2" data-booking-field="phone">
                    <Label className="text-xs text-muted-foreground">WhatsApp</Label>
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
                  <Field label={t.email} fieldKey="email" error={formErrors.email}>
                    <Input
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={(event) => {
                        setForm({ ...form, email: event.target.value });
                        clearFormError("email");
                      }}
                      className="bg-card"
                    />
                  </Field>
                </div>

                <Collapsible
                  className="mt-5 border-t border-border/70 pt-3"
                  open={showOptionalDetails}
                  onOpenChange={setShowOptionalDetails}
                >
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between py-2 text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <span>{showOptionalDetails ? t.hideOptionalDetails : t.optionalDetails}</span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform",
                          showOptionalDetails && "rotate-180",
                        )}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-3">
                    <Field label={t.dietary}>
                      <Textarea
                        value={form.dietary}
                        onChange={(event) => setForm({ ...form, dietary: event.target.value })}
                        className="min-h-20 bg-card"
                      />
                    </Field>
                    <Field label={t.notes}>
                      <Textarea
                        value={form.notes}
                        onChange={(event) => setForm({ ...form, notes: event.target.value })}
                        className="min-h-20 bg-card"
                      />
                    </Field>
                  </CollapsibleContent>
                </Collapsible>
              </div>

              <div className="mt-7 space-y-2">
                <Button className="w-full rounded-xl" size="lg" onClick={continueToReview}>
                  {t.continue}
                </Button>
                <Button className="w-full" variant="ghost" onClick={() => setStep(1)}>
                  {t.backToSessions}
                </Button>
                <p className="flex items-center justify-center gap-2 pt-1 text-center text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4" strokeWidth={1.5} />
                  {t.noPaymentYet}
                </p>
              </div>
            </section>
          )
        ) : null}

        {step === 3 && selected ? (
          <section className="card-soft bg-card/85 p-5 md:p-8">
            <div>
              <h1 className="text-2xl font-medium tracking-tight">{t.reviewTitle}</h1>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {t.reviewSubtitle}
              </p>
            </div>

            <div className="mt-6 divide-y divide-border/70 border-y border-border/70">
              <div className="flex items-start justify-between gap-4 py-3.5">
                <span className="text-sm text-muted-foreground">{t.sessionSummary}</span>
                <strong className="text-right text-sm font-medium">
                  {relativeDayI18n(selected.fecha, lang)} · {hourI18n(selected.hora_inicio, lang)}
                </strong>
              </div>
              <div className="flex items-center justify-between gap-4 py-3.5">
                <span className="text-sm text-muted-foreground">{t.people}</span>
                <strong className="text-sm font-medium tabular-nums">{guests}</strong>
              </div>
            </div>

            <div className="mt-5 divide-y divide-border/70" aria-live="polite">
              <div className="flex items-center justify-between gap-4 py-3.5">
                <span className="text-sm text-muted-foreground">{t.subtotal}</span>
                <strong className="text-sm font-medium tabular-nums">
                  {money(priceQuote?.subtotal ?? subtotal)}
                </strong>
              </div>

              {priceQuote?.promotionName ? (
                <div className="flex items-start justify-between gap-4 py-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-musgo/10 text-musgo">
                      <BadgePercent className="h-4 w-4" strokeWidth={1.5} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm font-medium">{priceQuote.promotionName}</strong>
                        <span className="rounded-full border border-musgo/25 bg-musgo/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-musgo">
                          {priceQuote.promotionApplicationType === "automatic"
                            ? t.automaticBadge
                            : (priceQuote.promotionCode ?? appliedCode)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {priceQuote.promotionApplicationType === "automatic"
                          ? t.automaticDiscountDetail
                          : t.codeApplied}
                      </p>
                    </div>
                  </div>
                  <strong className="shrink-0 text-sm font-semibold tabular-nums text-musgo">
                    −{money(priceQuote.discount)}
                  </strong>
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-4 py-4">
                <strong className="text-base font-medium">{t.total}</strong>
                <strong className="text-lg font-semibold tabular-nums">
                  {money(priceQuote?.total ?? subtotal)}
                </strong>
              </div>
            </div>

            {!appliedCode ? (
              <Collapsible className="mt-2" open={showPromoCode} onOpenChange={setShowPromoCode}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <span className="flex items-center gap-2">
                      <TicketPercent className="h-4 w-4" strokeWidth={1.5} />
                      {t.promoCode}
                    </span>
                    <ChevronDown
                      className={cn("h-4 w-4 transition-transform", showPromoCode && "rotate-180")}
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pb-3 pt-1">
                  <div className="flex flex-col gap-2 min-[360px]:flex-row">
                    <Input
                      id="promo-code"
                      value={promoInput}
                      onChange={(event) => {
                        setPromoInput(event.target.value.toUpperCase());
                        setPromotionError("");
                      }}
                      placeholder={t.promoPlaceholder}
                      disabled={applyPromotion.isPending}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0"
                      disabled={!promoInput.trim() || applyPromotion.isPending}
                      onClick={() => applyPromotion.mutate(promoInput.trim().toUpperCase())}
                    >
                      {applyPromotion.isPending ? t.applying : t.apply}
                    </Button>
                  </div>
                  <p
                    className={cn(
                      "mt-2 text-xs leading-relaxed",
                      promotionError ? "font-medium text-arcilla" : "text-muted-foreground",
                    )}
                  >
                    {promotionError || t.promoCodeHint}
                  </p>
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <div className="mt-2 flex items-center justify-between gap-3 py-3 text-sm">
                <span>
                  {t.codeApplied}: <strong>{appliedCode}</strong>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAppliedCode("");
                    setPromoInput("");
                    setPromotionError("");
                    setShowPromoCode(false);
                  }}
                >
                  {t.removeCode}
                </Button>
              </div>
            )}

            <div className="mt-5 space-y-2">
              <Button
                className="w-full rounded-xl"
                size="lg"
                onClick={() => {
                  trackTikTokEvent("ClickButton", {
                    ...tiktokSessionEventParams(selected, guests),
                    button_name: "Solicitar reserva",
                  });
                  reserve.mutate();
                }}
                disabled={reserve.isPending || quoteLoading}
              >
                {reserve.isPending
                  ? t.requesting
                  : (priceQuote?.total ?? subtotal) === 0
                    ? t.confirmFreeCta
                    : `${t.requestCta} · ${money(priceQuote?.total ?? subtotal)}`}
              </Button>
              <p className="flex items-center justify-center gap-2 py-1 text-center text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4" strokeWidth={1.5} />
                {(priceQuote?.total ?? subtotal) === 0 ? t.noPaymentRequired : t.noPaymentYet}
              </p>
              <Button className="w-full" variant="ghost" onClick={() => setStep(2)}>
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
              {confirmation.promotionName ? (
                <Row
                  label={t.promotion}
                  value={`${confirmation.promotionName}${confirmation.promotionCode ? ` · ${confirmation.promotionCode}` : ""}`}
                />
              ) : null}
              {confirmation.discount > 0 ? (
                <Row label={t.discount} value={`−${money(confirmation.discount)}`} />
              ) : null}
              <Row label={t.total} value={money(confirmation.total)} />
              <Row
                label={t.paymentStatus}
                value={confirmation.complimentary ? t.complimentary : t.paymentPending}
                strong
              />
            </div>
            <p className="mt-6 flex items-start gap-2 text-sm font-semibold leading-relaxed text-foreground">
              {confirmation.complimentary ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-musgo" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              {confirmation.complimentary ? t.complimentaryConfirmedNote : t.confirmedNote}
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

function SessionSummary({
  session,
  lang,
  label,
  changeLabel,
  onChange,
}: {
  session: PublicSession;
  lang: Lang;
  label: string;
  changeLabel: string;
  onChange: () => void;
}) {
  return (
    <div className="mt-6 flex items-center gap-3 border-b border-border/70 pb-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-musgo/10 text-musgo">
        <CalendarDays className="h-4 w-4" strokeWidth={1.5} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm font-medium">{longDayI18n(session.fecha, lang)}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {hourI18n(session.hora_inicio, lang)} · Café omakase
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-auto shrink-0 px-2 py-2 text-xs"
        onClick={onChange}
      >
        {changeLabel}
      </Button>
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
