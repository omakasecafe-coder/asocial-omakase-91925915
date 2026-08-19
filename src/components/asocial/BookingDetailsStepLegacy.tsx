import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AvailabilityBadge } from "@/components/asocial/AvailabilityBadge";
import { PhoneInput } from "@/components/asocial/PhoneInput";
import type { PublicSession } from "@/lib/public.functions";
import {
  bookingCopy,
  hourI18n,
  relativeDayI18n,
  seatsLabelI18n,
  type Lang,
} from "@/lib/booking-i18n";
import { cn } from "@/lib/utils";

export type BookingContactForm = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  dietary: string;
  notes: string;
};

export type BookingContactErrors = Partial<Record<"firstName" | "email" | "phone", string>>;

type BookingText = (typeof bookingCopy)[keyof typeof bookingCopy];

/**
 * Formulario anterior del paso 2. Se mantiene compilable como respaldo para
 * poder reactivarlo cambiando USE_LEGACY_BOOKING_DETAILS en BookingExperience.
 */
export function BookingDetailsStepLegacy({
  session,
  lang,
  t,
  guests,
  setGuests,
  form,
  setForm,
  formErrors,
  clearFormError,
  onContinue,
  onBack,
}: {
  session: PublicSession;
  lang: Lang;
  t: BookingText;
  guests: number;
  setGuests: (guests: number) => void;
  form: BookingContactForm;
  setForm: Dispatch<SetStateAction<BookingContactForm>>;
  formErrors: BookingContactErrors;
  clearFormError: (key: keyof BookingContactErrors) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <section className="card-soft bg-card/85 p-6 md:p-8">
      <h2 className="text-xl font-medium">{t.whoTitle}</h2>
      <LegacySessionSummary session={session} lang={lang} />

      <div className="mt-8 space-y-4">
        <LegacyField label={t.guestsLabel}>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }, (_, index) => index + 1).map((count) => {
              const disabled = count > session.available;
              return (
                <button
                  key={count}
                  type="button"
                  disabled={disabled}
                  onClick={() => setGuests(count)}
                  className={cn(
                    "h-10 w-10 rounded-full border text-sm transition-colors duration-200",
                    disabled
                      ? "cursor-not-allowed border-border/50 text-muted-foreground/40"
                      : guests === count
                        ? "border-carbon bg-carbon text-lino"
                        : "border-border text-foreground hover:border-nogal/40",
                  )}
                >
                  {count}
                </button>
              );
            })}
          </div>
        </LegacyField>

        <div className="grid gap-4">
          <LegacyField label={t.firstName} fieldKey="firstName" error={formErrors.firstName}>
            <Input
              value={form.firstName}
              onChange={(event) => {
                setForm({ ...form, firstName: event.target.value });
                clearFormError("firstName");
              }}
              className="bg-card"
            />
          </LegacyField>
          <LegacyField label={t.lastName}>
            <Input
              value={form.lastName}
              onChange={(event) => setForm({ ...form, lastName: event.target.value })}
              className="bg-card"
            />
          </LegacyField>
          <LegacyField label={t.email} fieldKey="email" error={formErrors.email}>
            <Input
              type="email"
              value={form.email}
              onChange={(event) => {
                setForm({ ...form, email: event.target.value });
                clearFormError("email");
              }}
              className="bg-card"
            />
          </LegacyField>
          <div className="space-y-2" data-booking-field="phone">
            <PhoneInput
              value={form.phone}
              onChange={(phone) => {
                setForm({ ...form, phone });
                clearFormError("phone");
              }}
              placeholder={t.phonePlaceholder}
            />
            {formErrors.phone ? <LegacyFieldError>{formErrors.phone}</LegacyFieldError> : null}
          </div>
        </div>

        <LegacyField label={t.dietary}>
          <Textarea
            value={form.dietary}
            onChange={(event) => setForm({ ...form, dietary: event.target.value })}
            className="min-h-20 bg-card"
          />
        </LegacyField>
        <LegacyField label={t.notes}>
          <Textarea
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
            className="min-h-20 bg-card"
          />
        </LegacyField>
      </div>

      <div className="mt-8 flex gap-2">
        <Button onClick={onContinue}>{t.continue}</Button>
        <Button variant="ghost" onClick={onBack}>
          {t.back}
        </Button>
      </div>
    </section>
  );
}

function LegacySessionSummary({ session, lang }: { session: PublicSession; lang: Lang }) {
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

function LegacyField({
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
      {error ? <LegacyFieldError>{error}</LegacyFieldError> : null}
    </div>
  );
}

function LegacyFieldError({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium text-arcilla">{children}</p>;
}
