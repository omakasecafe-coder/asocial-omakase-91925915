export type ConsentValue = "granted" | "denied";

const STORAGE_KEY = "asocial:cookie-consent";
const EVENT = "asocial:cookie-consent-change";

export function readConsent(): ConsentValue | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(value: ConsentValue) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* almacenamiento no disponible */
  }
  window.dispatchEvent(new CustomEvent<ConsentValue>(EVENT, { detail: value }));
}

export function onConsentChange(cb: (value: ConsentValue) => void) {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => cb((e as CustomEvent<ConsentValue>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
