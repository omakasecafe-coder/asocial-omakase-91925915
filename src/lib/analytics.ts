import { readConsent } from "@/lib/cookie-consent";

const measurementId = import.meta.env['VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY'] as
  | string
  | undefined;

declare global {
  interface Window {
    dataLayer?: unknown[];
    fbq?: (command: "track" | "trackCustom", eventName: string, params?: Record<string, unknown>) => void;
    ttq?: {
      identify?: (params: Record<string, string>) => void;
      track?: (eventName: string, params?: Record<string, unknown>) => void;
    };
  }
}

function toArguments(args: unknown[]): IArguments {
  // eslint-disable-next-line prefer-rest-params
  return (function () { return arguments; } as (...a: unknown[]) => IArguments)(...args);
}

export function gtag(...args: unknown[]) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  // GA requires the raw `arguments` object here, not an array.
  window.dataLayer.push(toArguments(args));
}

let initialized = false;

function allowed() {
  return Boolean(measurementId) && readConsent() === "granted";
}

export function initAnalytics() {
  if (typeof window === "undefined" || initialized || !allowed()) return;
  initialized = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  gtag("js", new Date());
  gtag("config", measurementId, { send_page_view: false });
}

export function trackPageView(path: string) {
  if (!allowed()) return;
  initAnalytics();
  gtag("event", "page_view", { page_path: path, page_location: window.location.href });
}

export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (!allowed()) return;
  initAnalytics();
  gtag("event", name, params);
}

export function trackMetaEvent(eventName: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  window.fbq("track", eventName, params);
}

function normalizeHashInput(value?: string, type: "email" | "phone" | "externalId" = "externalId") {
  const trimmed = value?.trim();
  if (!trimmed) return "";
  if (type === "email") return trimmed.toLowerCase();
  if (type === "phone") return trimmed.replace(/\D/g, "");
  return trimmed;
}

async function sha256(value: string) {
  if (!value) return "";

  const cryptoApi = globalThis.crypto?.subtle;
  if (!cryptoApi) return "";

  const buffer = await cryptoApi.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function identifyTikTokUser({
  email,
  phone,
  externalId,
}: {
  email?: string;
  phone?: string;
  externalId?: string;
}) {
  if (typeof window === "undefined" || typeof window.ttq?.identify !== "function") return;

  const [hashedEmail, hashedPhone, hashedExternalId] = await Promise.all([
    sha256(normalizeHashInput(email, "email")),
    sha256(normalizeHashInput(phone, "phone")),
    sha256(normalizeHashInput(externalId, "externalId")),
  ]);

  const payload: Record<string, string> = {};
  if (hashedEmail) payload.email = hashedEmail;
  if (hashedPhone) payload.phone_number = hashedPhone;
  if (hashedExternalId) payload.external_id = hashedExternalId;

  if (Object.keys(payload).length > 0) {
    window.ttq.identify(payload);
  }
}

export function trackTikTokEvent(eventName: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || typeof window.ttq?.track !== "function") return;
  window.ttq.track(eventName, params);
}
