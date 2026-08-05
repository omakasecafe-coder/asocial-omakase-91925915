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
  return (text ?? "").replace(/{{\s*([a-z_]+)\s*}}/gi, (_m, key: string) => vars[key.toLowerCase()] ?? "");
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
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#2c2621;">${escapeHtml(
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

  const text = [title, body, extra, signature, `${businessName} — ${SITE_URL}`].filter(Boolean).join("\n\n");

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /><title>${escapeHtml(
    subject,
  )}</title></head><body style="margin:0;padding:0;background-color:#efe9e0;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(title)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#efe9e0;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e6ddd2;font-family:Helvetica,Arial,sans-serif;">
        <tr>
          <td align="center" style="background-color:#1c1815;padding:28px 24px;">
            <img src="${LOGO_URL}" alt="${escapeHtml(businessName)}" width="132" style="display:block;width:132px;max-width:60%;height:auto;margin:0 auto;" />
          </td>
        </tr>
        <tr>
          <td style="padding:32px 28px 8px;">
            <h1 style="margin:0 0 20px;font-size:20px;font-weight:600;color:#1c1815;letter-spacing:-0.01em;">${escapeHtml(
              title,
            )}</h1>
            ${paragraphs(body)}
            ${extra ? `<div style="margin:24px 0;padding:16px;background-color:#f6f2ec;border-radius:10px;">${paragraphs(extra)}</div>` : ""}
            ${signature ? `<div style="margin-top:24px;border-top:1px solid #e6ddd2;padding-top:16px;">${paragraphs(signature)}</div>` : ""}
          </td>
        </tr>
        <tr>
          <td style="background-color:#f6f2ec;border-top:1px solid #e6ddd2;padding:24px 28px;">
            <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#1c1815;">${escapeHtml(businessName)}</p>
            <p style="margin:0 0 10px;font-size:12px;line-height:1.6;color:#6b6055;">Una experiencia guiada para descubrir el café con calma.</p>
            <p style="margin:0 0 10px;font-size:12px;line-height:1.6;color:#6b6055;">
              <a href="${SITE_URL}" style="color:#5a6b4d;text-decoration:none;">reservas.asocialcafe.com</a>
              &nbsp;·&nbsp;
              <a href="mailto:reservas@asocialcafe.com" style="color:#5a6b4d;text-decoration:none;">reservas@asocialcafe.com</a>
            </p>
            <p style="margin:0;font-size:11px;line-height:1.6;color:#9a8f83;">© ${year} ${escapeHtml(
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


function senderDomain() {
  return (
    process.env["LOVABLE_EMAIL_SENDER_DOMAIN"] ??
    process.env["EMAIL_SENDER_DOMAIN"] ??
    process.env["SENDER_DOMAIN"] ??
    ""
  );
}

export type SendResult = { sent: boolean; reason?: string };

export async function sendTemplateEmail(args: {
  template: TemplateRow;
  to: string;
  vars: EmailVars;
  idempotencyKey: string;
  label: string;
}): Promise<SendResult> {
  if (!args.template.enabled) return { sent: false, reason: "template_disabled" };
  if (!args.to || !args.to.includes("@")) return { sent: false, reason: "no_recipient" };

  const apiKey = process.env["LOVABLE_API_KEY"];
  const domain = senderDomain();
  if (!apiKey || !domain) return { sent: false, reason: "email_domain_not_configured" };

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
    console.error("[email] send failed", error);
    return { sent: false, reason: error instanceof Error ? error.message : "send_failed" };
  }
}
