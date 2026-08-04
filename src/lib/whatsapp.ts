/** Utilidades para abrir WhatsApp Web/Desktop con un mensaje precargado. */

export const whatsappTemplateVariables = [
  "{{customer_name}}",
  "{{booking_code}}",
  "{{session_date}}",
  "{{session_time}}",
  "{{guest_count}}",
  "{{total}}",
  "{{pending_amount}}",
  "{{payment_options}}",
  "{{business_name}}",
];

export const defaultWhatsappTemplate =
  "Hola {{customer_name}}, recibimos tu solicitud de reserva {{booking_code}} para el {{session_date}} a las {{session_time}} ({{guest_count}} personas). Tu pago aún está pendiente: {{pending_amount}}. Puedes pagar así:\n{{payment_options}}\nEnvíanos el comprobante por aquí para confirmar tu reserva. ¡Gracias!";

export function renderWhatsappMessage(template: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.split(`{{${key}}}`).join(value),
    template || defaultWhatsappTemplate,
  );
}

/** Solo dígitos, en formato que acepta wa.me. */
export function whatsappNumber(phone: string | null | undefined) {
  return (phone ?? "").replace(/\D+/g, "");
}

export function whatsappUrl(phone: string | null | undefined, message: string) {
  const n = whatsappNumber(phone);
  if (!n) return null;
  return `https://wa.me/${n}?text=${encodeURIComponent(message)}`;
}
