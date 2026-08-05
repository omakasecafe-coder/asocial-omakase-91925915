import { readConsent } from "@/lib/cookie-consent";

const measurementId = import.meta.env['VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY'] as
  | string
  | undefined;

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

export function gtag(..._args: unknown[]) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  // GA requires the raw `arguments` object here, not an array.
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer.push(arguments);
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

