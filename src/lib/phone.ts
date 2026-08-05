export type Country = { code: string; name: string; dial: string };

export const COUNTRIES: Country[] = [
  { code: "PE", name: "Perú", dial: "+51" },
  { code: "AR", name: "Argentina", dial: "+54" },
  { code: "BO", name: "Bolivia", dial: "+591" },
  { code: "BR", name: "Brasil", dial: "+55" },
  { code: "CL", name: "Chile", dial: "+56" },
  { code: "CO", name: "Colombia", dial: "+57" },
  { code: "CR", name: "Costa Rica", dial: "+506" },
  { code: "EC", name: "Ecuador", dial: "+593" },
  { code: "SV", name: "El Salvador", dial: "+503" },
  { code: "ES", name: "España", dial: "+34" },
  { code: "US", name: "Estados Unidos", dial: "+1" },
  { code: "GT", name: "Guatemala", dial: "+502" },
  { code: "MX", name: "México", dial: "+52" },
  { code: "PA", name: "Panamá", dial: "+507" },
  { code: "PY", name: "Paraguay", dial: "+595" },
  { code: "UY", name: "Uruguay", dial: "+598" },
  { code: "VE", name: "Venezuela", dial: "+58" },
];

export const DEFAULT_DIAL = "+51";

/** Emoji flag from an ISO country code (e.g. "PE" -> 🇵🇪). */
export function flagEmoji(code: string) {
  return code
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .split("")
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join("");
}

/** Digits only, no leading zeros. */
function digits(value: string) {
  return value.replace(/\D+/g, "").replace(/^0+/, "");
}

/**
 * Builds an E.164 number from a dial code and a local number.
 * Tolerates the user pasting the dial code (or a full +51... number) in the local field.
 */
export function toE164(dial: string, local: string) {
  const d = digits(dial);
  let n = digits(local);
  if (!n) return "";
  if (n.startsWith(d)) n = n.slice(d.length);
  if (!n) return `+${d}`;
  return `+${d}${n}`;
}

/** Splits a stored phone back into { dial, local }. */
export function splitPhone(phone?: string | null): { dial: string; local: string } {
  const raw = (phone ?? "").trim();
  if (!raw) return { dial: DEFAULT_DIAL, local: "" };
  const n = digits(raw);
  const match = [...COUNTRIES]
    .sort((a, b) => b.dial.length - a.dial.length)
    .find((c) => n.startsWith(digits(c.dial)));
  if (raw.startsWith("+") && match) {
    return { dial: match.dial, local: n.slice(digits(match.dial).length) };
  }
  if (match && raw.startsWith(match.dial)) {
    return { dial: match.dial, local: n.slice(digits(match.dial).length) };
  }
  return { dial: DEFAULT_DIAL, local: n };
}

export function formatPhone(phone?: string | null) {
  return (phone ?? "").trim() || "—";
}
