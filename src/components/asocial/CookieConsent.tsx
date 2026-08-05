import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";

import { Button } from "@/components/ui/button";
import { readConsent, setConsent } from "@/lib/cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

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
      aria-label="Preferencias de cookies"
      className="fixed inset-x-0 bottom-0 z-50 p-4"
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-3 rounded-xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center">
        <Cookie className="hidden h-5 w-5 shrink-0 text-muted-foreground sm:block" strokeWidth={1.5} />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Usamos cookies de analítica para entender cómo se usa la web y mejorar la experiencia de
          reserva. Puedes aceptarlas o seguir solo con las cookies necesarias.
        </p>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="outline" onClick={() => choose("denied")}>
            Solo necesarias
          </Button>
          <Button size="sm" onClick={() => choose("granted")}>
            Aceptar
          </Button>
        </div>
      </div>
    </div>
  );
}
