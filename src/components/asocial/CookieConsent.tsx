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
      className="fixed inset-x-3 bottom-3 z-50 sm:left-auto sm:right-4 sm:w-[min(24rem,calc(100vw-2rem))]"
    >
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card/95 p-3 shadow-lg backdrop-blur">
        <div className="flex gap-2">
          <Cookie className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Usamos analítica para mejorar la experiencia de reserva. Puedes aceptar o seguir solo con lo necesario.
          </p>
        </div>
        <div className="flex justify-end gap-2">
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
