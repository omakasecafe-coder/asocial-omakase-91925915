import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";

import { Button } from "@/components/ui/button";
import { readConsent, setConsent } from "@/lib/cookie-consent";

const copy = {
  es: {
    label: "Preferencias de cookies",
    body: "Usamos analítica para mejorar la experiencia de reserva. Puedes aceptar o seguir solo con lo necesario.",
    necessary: "Solo necesarias",
    accept: "Aceptar",
  },
  en: {
    label: "Cookie preferences",
    body: "We use analytics to improve the booking experience. You can accept or continue with necessary cookies only.",
    necessary: "Necessary only",
    accept: "Accept",
  },
} as const;

export function CookieConsent({ lang = "es" }: { lang?: "es" | "en" }) {
  const [visible, setVisible] = useState(false);
  const t = copy[lang];

  useEffect(() => {
    if (!readConsent()) setVisible(true);
  }, []);

  if (!visible) return null;

  const choose = (value: "granted" | "denied") => {
    setConsent(value);
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label={t.label}
      className="fixed inset-x-3 bottom-3 z-50 sm:left-auto sm:right-4 sm:w-[min(24rem,calc(100vw-2rem))]"
    >
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card/95 p-3 shadow-lg backdrop-blur">
        <div className="flex gap-2">
          <Cookie className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-xs leading-relaxed text-muted-foreground">{t.body}</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => choose("denied")}>
            {t.necessary}
          </Button>
          <Button size="sm" onClick={() => choose("granted")}>
            {t.accept}
          </Button>
        </div>
      </div>
    </div>
  );
}
