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
  published: "Disponible",
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

export type AttendanceStatus = "pending" | "arrived" | "no_show";

export const attendanceStatusLabel: Record<AttendanceStatus, string> = {
  pending: "Pendiente",
  arrived: "Llegó",
  no_show: "No llegó",
};

export const attendanceStatusTone: Record<AttendanceStatus, Tone> = {
  pending: "muted",
  arrived: "musgo",
  no_show: "nogal",
};

export type PaymentTxnStatus = "pending" | "paid" | "refunded" | "partially_refunded" | "cancelled";

export const paymentTxnStatusLabel: Record<PaymentTxnStatus, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  refunded: "Devuelto",
  partially_refunded: "Devolución parcial",
  cancelled: "Cancelado",
};

export const paymentTxnStatusTone: Record<PaymentTxnStatus, Tone> = {
  pending: "arcilla",
  paid: "musgo",
  refunded: "nogal",
  partially_refunded: "arcilla",
  cancelled: "nogal",
};

export const emailTemplateVariables = [
  "{{customer_name}}",
  "{{reservation_date}}",
  "{{reservation_time}}",
  "{{party_size}}",
  "{{reservation_total}}",
  "{{reservation_status}}",
  "{{booking_code}}",
  "{{payment_amount}}",
  "{{payment_status}}",
  "{{payment_options}}",
  "{{business_name}}",
];

export type AppRole = "admin" | "operator";

export const appRoleLabel: Record<AppRole, string> = {
  admin: "Administrador",
  operator: "Operador",
};
