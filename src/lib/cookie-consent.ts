export type ConsentValue = "granted" | "denied";

const STORAGE_KEY = "asocial:cookie-consent";
const COOKIE_KEY = "asocial_cookie_consent";
const EVENT = "asocial:cookie-consent-change";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

function isConsentValue(value: string | null | undefined): value is ConsentValue {
  return value === "granted" || value === "denied";
}

function readConsentCookie(): ConsentValue | null {
  const value = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_KEY}=`))
    ?.slice(COOKIE_KEY.length + 1);

  const decoded = value ? decodeURIComponent(value) : null;
  return isConsentValue(decoded) ? decoded : null;
}

function writeConsentCookie(value: ConsentValue) {
  const hostname = window.location.hostname.toLowerCase();
  const sharedDomain =
    hostname === "asocialcafe.com" || hostname.endsWith(".asocialcafe.com")
      ? "; Domain=.asocialcafe.com"
      : "";
  const secure = window.location.protocol === "https:" ? "; Secure" : "";

  document.cookie = `${COOKIE_KEY}=${encodeURIComponent(value)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}${sharedDomain}`;
}

export function readConsent(): ConsentValue | null {
  if (typeof window === "undefined") return null;

  const cookieValue = readConsentCookie();
  if (cookieValue) return cookieValue;

  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (!isConsentValue(v)) return null;
    writeConsentCookie(v);
    return v;
  } catch {
    return null;
  }
}

export function setConsent(value: ConsentValue) {
  if (typeof window === "undefined") return;
  writeConsentCookie(value);
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
