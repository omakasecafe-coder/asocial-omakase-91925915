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

export function renderTemplate(template: TemplateRow, vars: EmailVars) {
  const subject = applyVars(template.subject, vars);
  const title = applyVars(template.title, vars);
  const body = applyVars(template.body, vars);
  const signature = applyVars(template.signature, vars);
  const extra = applyVars(template.extra_info, vars);

  const text = [title, body, extra, signature].filter(Boolean).join("\n\n");

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /><title>${escapeHtml(
    subject,
  )}</title></head><body style="margin:0;padding:0;background-color:#ffffff;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;font-family:Helvetica,Arial,sans-serif;">
    <h1 style="margin:0 0 24px;font-size:20px;font-weight:600;color:#1c1815;letter-spacing:-0.01em;">${escapeHtml(
      title,
    )}</h1>
    ${paragraphs(body)}
    ${extra ? `<div style="margin:24px 0;padding:16px;background-color:#f6f2ec;border-radius:10px;">${paragraphs(extra)}</div>` : ""}
    ${signature ? `<div style="margin-top:24px;border-top:1px solid #e6ddd2;padding-top:16px;">${paragraphs(signature)}</div>` : ""}
  </div></body></html>`;

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
