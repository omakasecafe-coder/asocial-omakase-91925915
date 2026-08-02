export type SessionStatus = "draft" | "published" | "full" | "closed" | "cancelled";
export type ReservationStatus = "pending" | "confirmed" | "attended" | "no_show" | "cancelled";
export type PaymentStatus = "pending" | "partial" | "paid" | "refunded" | "complimentary";
export type PaymentMethod =
  | "yape"
  | "plin"
  | "bank_transfer"
  | "card"
  | "payment_link"
  | "cash"
  | "complimentary"
  | "other";
export type BlockReason = "invitado" | "influencer" | "equipo" | "prensa" | "cortesia" | "otro";

export type Tone = "musgo" | "arcilla" | "carbon" | "nogal" | "muted";

export const sessionStatusLabel: Record<SessionStatus, string> = {
  draft: "Borrador",
  published: "Publicada",
  full: "Completa",
  closed: "Cerrada",
  cancelled: "Cancelada",
};

export const sessionStatusTone: Record<SessionStatus, Tone> = {
  draft: "muted",
  published: "musgo",
  full: "carbon",
  closed: "nogal",
  cancelled: "nogal",
};

export const reservationStatusLabel: Record<ReservationStatus, string> = {
  pending: "Por confirmar",
  confirmed: "Confirmada",
  attended: "Asistió",
  no_show: "No asistió",
  cancelled: "Cancelada",
};

export const reservationStatusTone: Record<ReservationStatus, Tone> = {
  pending: "arcilla",
  confirmed: "musgo",
  attended: "musgo",
  no_show: "nogal",
  cancelled: "nogal",
};

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  pending: "Pago por confirmar",
  partial: "Pago parcial",
  paid: "Pagado",
  refunded: "Devuelto",
  complimentary: "Cortesía",
};

export const paymentStatusTone: Record<PaymentStatus, Tone> = {
  pending: "arcilla",
  partial: "arcilla",
  paid: "musgo",
  refunded: "nogal",
  complimentary: "musgo",
};

export const paymentMethodLabel: Record<PaymentMethod, string> = {
  yape: "Yape",
  plin: "Plin",
  bank_transfer: "Transferencia",
  card: "Tarjeta",
  payment_link: "Link de pago",
  cash: "Efectivo",
  complimentary: "Cortesía",
  other: "Otro",
};

export const blockReasonLabel: Record<BlockReason, string> = {
  invitado: "Invitado",
  influencer: "Influencer",
  equipo: "Equipo",
  prensa: "Prensa",
  cortesia: "Cortesía",
  otro: "Otro",
};

export const cancellationReasons = [
  "Solicitado por el cliente",
  "Cambio de fecha",
  "Problema de pago",
  "Cancelado por asocial",
  "Otro",
];

export const sourceLabel: Record<string, string> = {
  web: "Web",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  admin: "Manual",
  referida: "Referida",
};

export function customerTier(attended: number) {
  if (attended >= 4) return "Frecuente";
  if (attended >= 2) return "Recurrente";
  if (attended === 1) return "Primera visita";
  return "Sin visitas";
}
