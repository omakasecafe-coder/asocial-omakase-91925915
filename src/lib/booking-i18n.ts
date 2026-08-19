import { format } from "date-fns";
import { enUS, es } from "date-fns/locale";
import { toDate, hour } from "@/lib/format";

export type Lang = "es" | "en";

/** Lee el idioma desde el parámetro ?lang= (acepta es/en, es-PE, en-US). */
export function parseLang(value: unknown): Lang {
  if (typeof value !== "string") return "es";
  return value.trim().toLowerCase().startsWith("en") ? "en" : "es";
}

const locales = { es, en: enUS } as const;

export function longDayI18n(fecha: string, lang: Lang) {
  return lang === "en"
    ? format(toDate(fecha), "EEEE, MMMM d", { locale: locales.en })
    : format(toDate(fecha), "EEEE d 'de' MMMM", { locale: locales.es });
}

export function relativeDayI18n(fecha: string, lang: Lang) {
  const today = format(new Date(), "yyyy-MM-dd");
  if (fecha === today) return lang === "en" ? "Today" : "Hoy";
  return lang === "en"
    ? format(toDate(fecha), "EEE, MMM d", { locale: locales.en })
    : format(toDate(fecha), "EEE d MMM", { locale: locales.es });
}

export function hourI18n(time: string, _lang: Lang) {
  return hour(time);
}

export function seatsLabelI18n(n: number, lang: Lang) {
  if (lang === "en") {
    if (n <= 0) return "Sold out";
    if (n === 1) return "Last seat";
    return `${n} seats left`;
  }
  if (n <= 0) return "Completa";
  if (n === 1) return "Último cupo";
  return `${n} cupos`;
}

export const bookingCopy = {
  es: {
    tagline: "Una experiencia guiada para descubrir el café con calma.",
    steps: ["Sesión", "Tus datos", "Revisión"],
    title: "Reserva tu sesión de café omakase",
    subtitle: "Elige el horario que prefieras.",
    intro: "Luego registras tus datos y te enviamos los medios de pago para confirmar tu lugar.",
    loading: "Preparando las sesiones…",
    emptyTitle: "No hay sesiones abiertas por ahora.",
    emptyDescription: "Publicamos nuevas fechas cada semana.",
    soldOut: "Agotado",
    reserve: "Reservar",
    aboutTitle: "Café omakase en Lima, con ritmo pausado.",
    aboutP1:
      "asocial café omakase es una experiencia privada de café de especialidad en formato barra guiada. Cada sesión reúne pocos lugares para explorar métodos, aromas y conversaciones alrededor del café.",
    aboutP2:
      "La reserva queda registrada con pago por confirmar. Te enviamos los medios disponibles por correo y, cuando validamos tu comprobante por WhatsApp o email, recibes la confirmación final de tu sesión.",
    formatLabel: "Formato",
    formatValue: "Experiencia guiada",
    seatsLabel: "Cupos",
    seatsValue: "Limitados por sesión",
    bookingLabel: "Reserva",
    bookingValue: "Pago por confirmar",
    whoTitle: "Reserva tus lugares",
    whoSubtitle: "Completa tus datos para preparar el resumen de tu reserva.",
    sessionSummary: "Tu sesión",
    changeSession: "Cambiar sesión",
    guestsLabel: "Número de personas",
    contactTitle: "Tus datos de contacto",
    contactHint: "Los usaremos para enviarte el resumen y coordinar la confirmación.",
    firstName: "Nombre",
    lastName: "Apellido",
    email: "Email",
    phonePlaceholder: "Número de celular",
    dietary: "Alergias o restricciones (opcional)",
    notes: "Comentarios (opcional)",
    optionalDetails: "Agregar alergias o algún comentario",
    hideOptionalDetails: "Ocultar información adicional",
    continue: "Revisar reserva",
    back: "Volver",
    backToSessions: "Volver a sesiones",
    reviewTitle: "Revisa tu reserva",
    reviewSubtitle: "Confirma que todo esté correcto antes de solicitarla.",
    date: "Fecha",
    time: "Hora",
    people: "Personas",
    pricePerPerson: "Precio por persona",
    subtotal: "Subtotal",
    promotion: "Promoción",
    discount: "Descuento",
    automaticPromotion: "Promoción aplicada automáticamente",
    automaticBadge: "Automática",
    automaticDiscountDetail: "Descuento aplicado automáticamente",
    codeApplied: "Código aplicado",
    promoCode: "¿Tienes un código promocional?",
    promoPlaceholder: "Ingresa tu código",
    apply: "Aplicar",
    applying: "Aplicando…",
    removeCode: "Quitar código",
    promoCodeHint: "Aplicaremos el código solo si mejora tu descuento actual.",
    betterPromotionKept:
      "Ya tienes una promoción automática mejor. Conservamos el descuento de {amount}.",
    paymentStatus: "Estado de pago",
    paymentPending: "Pago por confirmar",
    complimentary: "Cortesía · confirmado",
    total: "Total",
    code: "Código",
    pendingNote:
      "Tu reserva quedará pendiente hasta que validemos el pago. Te enviaremos los medios disponibles por correo.",
    complimentaryNote:
      "La promoción cubre el total. Tu reserva quedará confirmada inmediatamente y no tendrás que pagar.",
    noPaymentYet: "Aún no realizarás ningún pago.",
    noPaymentRequired: "No tendrás que realizar ningún pago.",
    requestCta: "Solicitar reserva",
    confirmFreeCta: "Confirmar reserva",
    requesting: "Solicitando…",
    confirmedTitle: "Tu lugar está reservado",
    confirmedNote:
      "Te enviamos un correo con el resumen de tu solicitud de reserva; así como los medios de pago disponibles. Envíanos el comprobante al WhatsApp +51 919 112 980 y tu reserva quedará confirmada.",
    complimentaryConfirmedNote:
      "Tu reserva ya está confirmada y no requiere pago. Te enviamos inmediatamente el correo de confirmación.",
    footerTagline: "menos ruido, más café.",
    errFirstName: "Cuéntanos tu nombre.",
    errEmailRequired: "Necesitamos tu email para enviarte los medios de pago.",
    errEmailInvalid: "Revisa que el email esté bien escrito.",
    errPhone: "Necesitamos tu WhatsApp para coordinar la confirmación.",
    errReview: "Revisa los datos marcados.",
    errSave: "No pudimos guardar tu reserva",
    errPromotion: "No pudimos validar la promoción",
  },
  en: {
    tagline: "A guided experience to discover coffee, slowly.",
    steps: ["Session", "Your details", "Review"],
    title: "Book your coffee omakase session",
    subtitle: "Choose the time that works for you.",
    intro: "Then you share your details and we send you the payment options to confirm your seat.",
    loading: "Loading sessions…",
    emptyTitle: "No open sessions right now.",
    emptyDescription: "We publish new dates every week.",
    soldOut: "Sold out",
    reserve: "Book",
    aboutTitle: "Coffee omakase in Lima, at a slower pace.",
    aboutP1:
      "asocial café omakase is a private specialty coffee experience served at a guided bar. Each session hosts only a few seats to explore brewing methods, aromas and conversation around coffee.",
    aboutP2:
      "Your booking is registered with payment pending. We email you the available payment options and, once we validate your receipt via WhatsApp or email, you receive the final confirmation.",
    formatLabel: "Format",
    formatValue: "Guided experience",
    seatsLabel: "Seats",
    seatsValue: "Limited per session",
    bookingLabel: "Booking",
    bookingValue: "Payment pending",
    whoTitle: "Reserve your seats",
    whoSubtitle: "Share your details so we can prepare your booking summary.",
    sessionSummary: "Your session",
    changeSession: "Change session",
    guestsLabel: "Number of guests",
    contactTitle: "Your contact details",
    contactHint: "We will use them to send your summary and coordinate confirmation.",
    firstName: "First name",
    lastName: "Last name",
    email: "Email",
    phonePlaceholder: "Mobile number",
    dietary: "Allergies or restrictions (optional)",
    notes: "Comments (optional)",
    optionalDetails: "Add allergies or a comment",
    hideOptionalDetails: "Hide additional information",
    continue: "Review booking",
    back: "Back",
    backToSessions: "Back to sessions",
    reviewTitle: "Review your booking",
    reviewSubtitle: "Confirm everything is correct before requesting your booking.",
    date: "Date",
    time: "Time",
    people: "Guests",
    pricePerPerson: "Price per person",
    subtotal: "Subtotal",
    promotion: "Promotion",
    discount: "Discount",
    automaticPromotion: "Promotion applied automatically",
    automaticBadge: "Automatic",
    automaticDiscountDetail: "Discount applied automatically",
    codeApplied: "Code applied",
    promoCode: "Do you have a promo code?",
    promoPlaceholder: "Enter your code",
    apply: "Apply",
    applying: "Applying…",
    removeCode: "Remove code",
    promoCodeHint: "We will apply the code only if it improves your current discount.",
    betterPromotionKept:
      "You already have a better automatic promotion. We kept the {amount} discount.",
    paymentStatus: "Payment status",
    paymentPending: "Payment pending",
    complimentary: "Complimentary · confirmed",
    total: "Total",
    code: "Code",
    pendingNote:
      "Your booking stays pending until we validate the payment. We will email you the available payment options.",
    complimentaryNote:
      "The promotion covers the full amount. Your booking will be confirmed immediately and no payment is required.",
    noPaymentYet: "No payment is taken yet.",
    noPaymentRequired: "No payment will be required.",
    requestCta: "Request booking",
    confirmFreeCta: "Confirm booking",
    requesting: "Sending…",
    confirmedTitle: "Your seat is reserved",
    confirmedNote:
      "We sent you an email with the summary of your booking request and the available payment options. Send your receipt to WhatsApp +51 919 112 980 and your booking will be confirmed.",
    complimentaryConfirmedNote:
      "Your booking is already confirmed and no payment is required. We sent your confirmation email immediately.",
    footerTagline: "less noise, more coffee.",
    errFirstName: "Please tell us your name.",
    errEmailRequired: "We need your email to send you the payment options.",
    errEmailInvalid: "Please check your email address.",
    errPhone: "We need your WhatsApp number to coordinate the confirmation.",
    errReview: "Please check the highlighted fields.",
    errSave: "We could not save your booking",
    errPromotion: "We could not validate the promotion",
  },
} as const;

export type BookingCopy = (typeof bookingCopy)["es"];
