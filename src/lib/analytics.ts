import { readConsent } from "@/lib/cookie-consent";

const measurementId = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY"] as
  string | undefined;
const metaPixelId = "1687497742354743";
const tiktokPixelId = "D9PTFCRC77UFAJG52AQG";

declare global {
  interface Window {
    dataLayer?: unknown[];
    fbq?: (
      command: "init" | "track" | "trackCustom",
      eventName: string,
      params?: Record<string, unknown>,
    ) => void;
    ttq?: {
      identify?: (params: Record<string, string>) => void;
      track?: (eventName: string, params?: Record<string, unknown>) => void;
    };
  }
}

function toArguments(args: unknown[]): IArguments {
  return (function (..._args: unknown[]) {
    // GA's dataLayer expects the raw function arguments object.
    // eslint-disable-next-line prefer-rest-params
    return arguments;
  })(...args);
}

export function gtag(...args: unknown[]) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  // GA requires the raw `arguments` object here, not an array.
  window.dataLayer.push(toArguments(args));
}

let initialized = false;
let marketingInitialized = false;
let consentDefaultsInitialized = false;

function allowed() {
  return Boolean(measurementId) && readConsent() === "granted";
}

function consentParams(value: "granted" | "denied") {
  return {
    analytics_storage: value,
    ad_storage: value,
    ad_user_data: value,
    ad_personalization: value,
  };
}

export function initConsentMode() {
  if (typeof window === "undefined" || consentDefaultsInitialized) return;
  consentDefaultsInitialized = true;
  gtag("consent", "default", consentParams("denied"));

  const current = readConsent();
  if (current) updateConsentMode(current);
}

export function updateConsentMode(value: "granted" | "denied") {
  if (typeof window === "undefined") return;
  gtag("consent", "update", consentParams(value));
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

function appendInlineScript(id: string, code: string) {
  if (document.getElementById(id)) return;
  const script = document.createElement("script");
  script.id = id;
  script.textContent = code;
  document.head.appendChild(script);
}

export function initMarketingPixels() {
  if (typeof window === "undefined" || marketingInitialized || readConsent() !== "granted") return;
  marketingInitialized = true;

  appendInlineScript(
    "asocial-meta-pixel",
    `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixelId}');fbq('track','PageView');`,
  );

  appendInlineScript(
    "asocial-tiktok-pixel",
    `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=['page','track','identify','instances','debug','on','off','once','ready','alias','group','enableCookie','disableCookie','holdConsent','revokeConsent','grantConsent'];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var r='https://analytics.tiktok.com/i18n/pixel/events.js';ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=r;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};n=d.createElement('script');n.type='text/javascript';n.async=!0;n.src=r+'?sdkid='+e+'&lib='+t;e=d.getElementsByTagName('script')[0];e.parentNode.insertBefore(n,e)};ttq.load('${tiktokPixelId}');ttq.page()}(window,document,'ttq');`,
  );
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
  if (typeof window === "undefined" || readConsent() !== "granted") return;
  initMarketingPixels();
  if (typeof window.fbq !== "function") return;
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
  if (typeof window === "undefined" || readConsent() !== "granted") return;
  initMarketingPixels();
  if (typeof window.ttq?.identify !== "function") return;

  const [hashedEmail, hashedPhone, hashedExternalId] = await Promise.all([
    sha256(normalizeHashInput(email, "email")),
    sha256(normalizeHashInput(phone, "phone")),
    sha256(normalizeHashInput(externalId, "externalId")),
  ]);

  const payload: Record<string, string> = {};
  if (hashedEmail) payload["email"] = hashedEmail;
  if (hashedPhone) payload["phone_number"] = hashedPhone;
  if (hashedExternalId) payload["external_id"] = hashedExternalId;

  if (Object.keys(payload).length > 0) {
    window.ttq.identify(payload);
  }
}

export function trackTikTokEvent(eventName: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || readConsent() !== "granted") return;
  initMarketingPixels();
  if (typeof window.ttq?.track !== "function") return;
  window.ttq.track(eventName, params);
}
