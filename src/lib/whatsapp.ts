/** Utilidades para abrir WhatsApp Web/Desktop con un mensaje precargado. */

import { toast } from "sonner";

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

/** Solo dígitos, en formato internacional sin el signo +. */
export function whatsappNumber(phone: string | null | undefined) {
  let digits = (phone ?? "").replace(/\D+/g, "");
  // Si parece un móvil peruano de 9 dígitos sin código, agregamos 51.
  if (digits.length === 9) {
    digits = `51${digits}`;
  }
  return digits;
}

export function whatsappUrl(phone: string | null | undefined, message: string) {
  const n = whatsappNumber(phone);
  if (!n) return null;
  return `https://wa.me/${n}?text=${encodeURIComponent(message)}`;
}

/** Abre WhatsApp en una nueva ventana de nivel superior. Si el navegador lo bloquea, copia el enlace y lo muestra en un toast. */
export function openWhatsApp(phone: string | null | undefined, message: string) {
  const url = whatsappUrl(phone, message);
  if (!url) {
    toast.error("No se pudo generar el enlace de WhatsApp: el cliente no tiene teléfono.");
    return;
  }

  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win || win.closed) {
    navigator.clipboard.writeText(url).catch(() => {});
    toast("El navegador bloqueó la apertura de WhatsApp", {
      description: "El enlace se copió al portapapeles. Pégalo en WhatsApp Web o en tu app.",
      duration: 6000,
    });
  }
}
