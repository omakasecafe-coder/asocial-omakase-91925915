/**
 * Server-only email delivery for automatic reservation / payment notifications.
 * Templates live in the database (public.email_templates) and are edited from
 * Configuración > Emails. Sending goes through Lovable's managed email API.
 *
 * If no sender domain is configured yet, sending is skipped gracefully so that
 * saving a reservation or a payment never fails because of email setup.
 */
import { sendLovableEmail } from "@lovable.dev/email-js";

export type EmailVars = Record<string, string>;

export type TemplateRow = {
  template_key: string;
  subject: string;
  title: string;
  body: string;
  signature: string;
  extra_info: string;
  enabled: boolean;
};

export function applyVars(text: string, vars: EmailVars) {
  return (text ?? "").replace(
    /{{\s*([a-z_]+)\s*}}/gi,
    (_m, key: string) => vars[key.toLowerCase()] ?? "",
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paragraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .filter((block) => block.trim().length > 0)
    .map(
      (block) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#2c2621;font-family:Helvetica,Arial,sans-serif;">${escapeHtml(
          block.trim(),
        ).replace(/\n/g, "<br />")}</p>`,
    )
    .join("");
}

const SITE_URL = "https://reservas.asocialcafe.com";
const LOGO_URL = `${SITE_URL}/__l5e/assets-v1/819b9635-b1a1-4a59-925f-37915cc4c331/asocial-logo-light.png`;

export function renderTemplate(template: TemplateRow, vars: EmailVars) {
  const subject = applyVars(template.subject, vars);
  const title = applyVars(template.title, vars);
  const body = applyVars(template.body, vars);
  const signature = applyVars(template.signature, vars);
  const extra = applyVars(template.extra_info, vars);
  const businessName = vars["business_name"] || "asocial · café omakase";
  const year = new Date().getFullYear();

  const text = [title, body, extra, signature, `${businessName} — ${SITE_URL}`]
    .filter(Boolean)
    .join("\n\n");

  const html = `<!doctype html>
<html lang="es" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,address=no,email=no,date=no" />
<meta name="color-scheme" content="light only" />
<meta name="supported-color-schemes" content="light only" />
<title>${escapeHtml(subject)}</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<style type="text/css">
  html,body{margin:0 !important;padding:0 !important;width:100% !important;}
  body{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
  table{border-collapse:collapse !important;mso-table-lspace:0pt;mso-table-rspace:0pt;}
  img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;}
  a{color:#5a6b4d;}
  @media only screen and (max-width:600px){
    .wrap{padding:12px 8px !important;}
    .card{border-radius:12px !important;}
    .px{padding-left:20px !important;padding-right:20px !important;}
    .hd{padding:22px 20px !important;}
    .h1{font-size:19px !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;width:100%;background-color:#efe9e0;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(title)}</div>
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#efe9e0;">
    <tr><td align="center" class="wrap" style="padding:24px 12px;">
      <table role="presentation" width="560" border="0" cellpadding="0" cellspacing="0" class="card" style="width:100%;max-width:560px;background-color:#ffffff;border-radius:16px;border:1px solid #e6ddd2;font-family:Helvetica,Arial,sans-serif;">
        <tr>
          <td align="center" class="hd" style="background-color:#1c1815;padding:28px 24px;border-radius:16px 16px 0 0;">
            <img src="${LOGO_URL}" alt="${escapeHtml(businessName)}" width="132" style="display:block;width:132px;max-width:60%;height:auto;margin:0 auto;border:0;" />
          </td>
        </tr>
        <tr>
          <td class="px" style="padding:32px 28px 8px;">
            <h1 class="h1" style="margin:0 0 20px;font-size:20px;line-height:1.35;font-weight:600;color:#1c1815;letter-spacing:-0.01em;font-family:Helvetica,Arial,sans-serif;">${escapeHtml(
              title,
            )}</h1>
            ${paragraphs(body)}
            ${extra ? `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin:24px 0;background-color:#f6f2ec;border-radius:10px;"><tr><td style="padding:16px;">${paragraphs(extra)}</td></tr></table>` : ""}
            ${signature ? `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-top:24px;border-top:1px solid #e6ddd2;"><tr><td style="padding-top:16px;">${paragraphs(signature)}</td></tr></table>` : ""}
          </td>
        </tr>
        <tr>
          <td class="px" style="background-color:#f6f2ec;border-top:1px solid #e6ddd2;padding:24px 28px;border-radius:0 0 16px 16px;">
            <p style="margin:0 0 6px;font-size:14px;line-height:1.5;font-weight:600;color:#1c1815;font-family:Helvetica,Arial,sans-serif;">${escapeHtml(businessName)}</p>
            <p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:#6b6055;font-family:Helvetica,Arial,sans-serif;">Una experiencia guiada para descubrir el café con calma.</p>
            <p style="margin:0 0 10px;font-size:13px;line-height:1.8;color:#6b6055;font-family:Helvetica,Arial,sans-serif;">
              <a href="${SITE_URL}" style="color:#5a6b4d;text-decoration:none;white-space:nowrap;">reservas.asocialcafe.com</a>
              <br />
              <a href="mailto:reservas@asocialcafe.com" style="color:#5a6b4d;text-decoration:none;white-space:nowrap;">reservas@asocialcafe.com</a>
            </p>
            <p style="margin:0;font-size:12px;line-height:1.6;color:#9a8f83;font-family:Helvetica,Arial,sans-serif;">© ${year} ${escapeHtml(
              businessName,
            )}. Este correo se envía por tu reserva; no es publicidad.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return { subject, html, text };
}

const DEFAULT_EMAIL_SENDER_DOMAIN = "notify.asocialcafe.com";

function senderDomain() {
  const configuredDomain =
    process.env["LOVABLE_EMAIL_SENDER_DOMAIN"] ??
    process.env["EMAIL_SENDER_DOMAIN"] ??
    process.env["SENDER_DOMAIN"];

  // The verified asocial sender domain is stable and is also used by the
  // authentication-email webhook. Keep environment overrides for future
  // migrations, but do not silently skip transactional email when the
  // optional override is absent.
  return configuredDomain?.trim() || DEFAULT_EMAIL_SENDER_DOMAIN;
}

export type SendResult = { sent: boolean; reason?: string };

export async function sendTemplateEmail(args: {
  template: TemplateRow;
  to: string;
  vars: EmailVars;
  idempotencyKey: string;
  label: string;
}): Promise<SendResult> {
  const skipped = (reason: string): SendResult => {
    console.warn("[email] send skipped", { label: args.label, reason });
    return { sent: false, reason };
  };

  if (!args.template.enabled) return skipped("template_disabled");
  if (!args.to || !args.to.includes("@")) return skipped("no_recipient");

  const apiKey = process.env["LOVABLE_API_KEY"];
  const domain = senderDomain();
  if (!apiKey) return skipped("lovable_api_key_not_configured");

  const { subject, html, text } = renderTemplate(args.template, args.vars);

  try {
    await sendLovableEmail(
      {
        to: args.to,
        from: `${args.vars["business_name"] || "asocial"} <reservas@asocialcafe.com>`,
        sender_domain: domain,
        subject,
        html,
        text,
        label: args.label,
        purpose: "transactional",
        idempotency_key: args.idempotencyKey,
      },
      { apiKey },
    );
    return { sent: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "send_failed";
    console.error("[email] send failed", { label: args.label, reason });
    return { sent: false, reason };
  }
}
