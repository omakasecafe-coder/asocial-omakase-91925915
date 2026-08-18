import { useEffect, useState } from "react";
import { ArrowDown, ArrowUpRight, Clock, MapPin, Users } from "lucide-react";
import logoLight from "@/assets/asocial-logo-light.png.asset.json";

type Language = "es" | "en";

const copy = {
  es: {
    navExperience: "La experiencia",
    navJourney: "El recorrido",
    navDetails: "Detalles",
    book: "Reservar",
    eyebrow: "café omakase · barranco",
    heroLead: "Cuatro momentos. Una barra íntima. Una forma distinta de acercarte al café.",
    heroMeta: "domingos · 4:00 pm y 6:00 pm · 45 min",
    originalPrice: "Precio regular S/100 pp",
    offerPrice: "Precio de lanzamiento S/80 pp",
    discover: "Descubrir la experiencia",
    introKicker: "una pausa guiada",
    introTitle: "No es una cata. No es una clase. Es una pausa.",
    introBody:
      "El barista elige el camino y tú solo tienes que estar presente. Cada momento abre una forma nueva de percibir el café: aroma, temperatura, textura, memoria y sorpresa.",
    journeyKicker: "el recorrido",
    journeyTitle: "Cuatro momentos, sin revelar demasiado.",
    journeyBody:
      "Parte de la experiencia es no saber exactamente qué viene. Esto es lo que vas a vivir.",
    moments: [
      {
        number: "01",
        title: "La bienvenida",
        body: "El ruido queda afuera. Tomas tu lugar en la barra y dejamos que la curiosidad marque el inicio.",
      },
      {
        number: "02",
        title: "Cambiar la mirada",
        body: "Una taza conocida desde otro ángulo. Aromas, temperatura y textura empiezan a contar una historia.",
      },
      {
        number: "03",
        title: "El giro inesperado",
        body: "Cuando crees saber qué viene, el café cambia de forma. Contrastes, capas y un pequeño maridaje abren nuevas posibilidades.",
      },
      {
        number: "04",
        title: "El último sorbo",
        body: "Un cierre más lento. Algo cálido, algo sutil y unos minutos para quedarte con lo que descubriste.",
      },
    ],
    detailsKicker: "antes de venir",
    detailsTitle: "Lo esencial. Nada más.",
    duration: "Duración",
    durationValue: "45 minutos",
    capacity: "Barra",
    capacityValue: "5 personas",
    location: "Lugar",
    locationValue: "Barranco, Lima",
    schedule: "Horarios",
    scheduleValue: "Domingos · 4:00 pm y 6:00 pm",
    price: "Precio de lanzamiento",
    priceRegular: "S/100 por persona",
    priceOffer: "S/80 por persona",
    ctaKicker: "tu lugar en la barra",
    ctaTitle: "Trust your barista.",
    ctaBody: "Cinco lugares por sesión. El resto lo preparamos nosotros.",
    reserveExperience: "Reservar experiencia",
    footer: "menos ruido. más café.",
  },
  en: {
    navExperience: "The experience",
    navJourney: "The journey",
    navDetails: "Details",
    book: "Book",
    eyebrow: "coffee omakase · barranco",
    heroLead: "Four moments. An intimate bar. A different way to experience coffee.",
    heroMeta: "sundays · 4:00 pm and 6:00 pm · 45 min",
    originalPrice: "Regular price S/100 pp",
    offerPrice: "Launch price S/80 pp",
    discover: "Discover the experience",
    introKicker: "a guided pause",
    introTitle: "Not a tasting. Not a class. A pause.",
    introBody:
      "The barista chooses the path; you only need to be present. Each moment opens a new way to perceive coffee through aroma, temperature, texture, memory and surprise.",
    journeyKicker: "the journey",
    journeyTitle: "Four moments, without revealing too much.",
    journeyBody:
      "Part of the experience is not knowing exactly what comes next. This is what you will live.",
    moments: [
      {
        number: "01",
        title: "The welcome",
        body: "The noise stays outside. You take your place at the bar and curiosity sets the experience in motion.",
      },
      {
        number: "02",
        title: "A different perspective",
        body: "A familiar cup from another angle. Aroma, temperature and texture begin to tell a story.",
      },
      {
        number: "03",
        title: "The unexpected turn",
        body: "Just when you think you know what comes next, coffee changes form. Contrasts, layers and a small pairing open new possibilities.",
      },
      {
        number: "04",
        title: "The final sip",
        body: "A slower ending. Something warm, something subtle and a few minutes to hold on to what you discovered.",
      },
    ],
    detailsKicker: "before you come",
    detailsTitle: "The essentials. Nothing more.",
    duration: "Duration",
    durationValue: "45 minutes",
    capacity: "At the bar",
    capacityValue: "5 guests",
    location: "Location",
    locationValue: "Barranco, Lima",
    schedule: "Times",
    scheduleValue: "Sundays · 4:00 pm and 6:00 pm",
    price: "Launch price",
    priceRegular: "S/100 per person",
    priceOffer: "S/80 per person",
    ctaKicker: "your place at the bar",
    ctaTitle: "Trust your barista.",
    ctaBody: "Five seats per session. We take care of the rest.",
    reserveExperience: "Book the experience",
    footer: "less noise. more coffee.",
  },
} as const;

const bookingUrl = "https://reservas.asocialcafe.com/reservar";

export function PublicOmakaseLanding() {
  const [language, setLanguage] = useState<Language>("es");
  const t = copy[language];

  useEffect(() => {
    document.documentElement.lang = language;
    return () => {
      document.documentElement.lang = "es";
    };
  }, [language]);

  return (
    <div className="min-h-screen overflow-hidden bg-lino text-carbon selection:bg-nogal selection:text-lino">
      <header className="absolute inset-x-0 top-0 z-20 border-b border-white/10 text-lino">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 md:px-10">
          <a href="#inicio" aria-label="asocial café omakase">
            <img src={logoLight.url} alt="asocial · café omakase" className="h-9 w-auto" />
          </a>
          <nav className="hidden items-center gap-8 text-xs tracking-wide text-lino/70 md:flex">
            <a href="#experiencia" className="transition-colors hover:text-lino">
              {t.navExperience}
            </a>
            <a href="#recorrido" className="transition-colors hover:text-lino">
              {t.navJourney}
            </a>
            <a href="#detalles" className="transition-colors hover:text-lino">
              {t.navDetails}
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <div className="flex rounded-full border border-white/20 p-0.5 text-[10px] tracking-[0.14em]">
              {(["es", "en"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setLanguage(item)}
                  aria-pressed={language === item}
                  className={`rounded-full px-2.5 py-1.5 transition-colors ${
                    language === item ? "bg-lino text-carbon" : "text-lino/65 hover:text-lino"
                  }`}
                >
                  {item.toUpperCase()}
                </button>
              ))}
            </div>
            <a
              href={bookingUrl}
              className="hidden items-center gap-1.5 rounded-full bg-lino px-4 py-2 text-xs font-medium text-carbon transition-transform hover:-translate-y-0.5 sm:inline-flex"
            >
              {t.book} <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </header>

      <main>
        <section
          id="inicio"
          className="relative flex min-h-[760px] items-end bg-carbon text-lino md:min-h-screen"
        >
          <img
            src="/asocial-omakase-hero.webp"
            alt="Experiencia de café omakase en una barra de madera"
            className="absolute inset-0 h-full w-full object-cover object-[58%_center]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/15" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/25" />
          <div className="relative mx-auto w-full max-w-7xl px-5 pb-16 pt-36 md:px-10 md:pb-20">
            <p className="text-[11px] uppercase tracking-[0.28em] text-lino/65">{t.eyebrow}</p>
            <h1 className="mt-6 max-w-3xl text-5xl font-medium leading-[0.95] tracking-[-0.045em] sm:text-6xl md:text-8xl">
              Trust your barista.
            </h1>
            <p className="mt-7 max-w-xl text-base leading-relaxed text-lino/78 md:text-lg">
              {t.heroLead}
            </p>
            <p className="mt-4 text-xs tracking-wide text-lino/55">{t.heroMeta}</p>
            <div className="mt-9 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
              <a
                href={bookingUrl}
                className="inline-flex items-center gap-2 rounded-full bg-lino px-6 py-3.5 text-sm font-medium text-carbon transition-transform hover:-translate-y-0.5"
              >
                {t.reserveExperience} <ArrowUpRight className="h-4 w-4" />
              </a>
              <div>
                <p className="text-xs text-lino/45 line-through">{t.originalPrice}</p>
                <p className="mt-1 text-sm font-medium text-lino">{t.offerPrice}</p>
              </div>
            </div>
            <a
              href="#experiencia"
              className="mt-12 inline-flex items-center gap-2 text-xs text-lino/55 hover:text-lino"
            >
              {t.discover} <ArrowDown className="h-3.5 w-3.5" />
            </a>
          </div>
        </section>

        <section id="experiencia" className="px-5 py-24 md:px-10 md:py-36">
          <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[0.75fr_1.25fr] md:gap-20">
            <p className="text-[11px] uppercase tracking-[0.25em] text-nogal/60">{t.introKicker}</p>
            <div>
              <h2 className="max-w-3xl text-3xl leading-tight tracking-[-0.025em] md:text-5xl">
                {t.introTitle}
              </h2>
              <p className="mt-8 max-w-2xl text-base leading-8 text-nogal/80 md:text-lg">
                {t.introBody}
              </p>
            </div>
          </div>
        </section>

        <section id="recorrido" className="bg-carbon px-5 py-24 text-lino md:px-10 md:py-36">
          <div className="mx-auto max-w-6xl">
            <p className="text-[11px] uppercase tracking-[0.25em] text-lino/45">
              {t.journeyKicker}
            </p>
            <div className="mt-5 grid gap-8 md:grid-cols-2 md:items-end">
              <h2 className="max-w-xl text-3xl leading-tight tracking-[-0.025em] md:text-5xl">
                {t.journeyTitle}
              </h2>
              <p className="max-w-lg text-sm leading-7 text-lino/60 md:justify-self-end">
                {t.journeyBody}
              </p>
            </div>
            <div className="mt-16 border-t border-lino/15">
              {t.moments.map((moment) => (
                <article
                  key={moment.number}
                  className="grid gap-4 border-b border-lino/15 py-8 md:grid-cols-[0.2fr_0.55fr_1fr] md:gap-10 md:py-10"
                >
                  <span className="text-xs tracking-[0.2em] text-lino/35">{moment.number}</span>
                  <h3 className="text-xl text-lino md:text-2xl">{moment.title}</h3>
                  <p className="max-w-xl text-sm leading-7 text-lino/58">{moment.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="detalles" className="px-5 py-24 md:px-10 md:py-36">
          <div className="mx-auto max-w-6xl">
            <p className="text-[11px] uppercase tracking-[0.25em] text-nogal/60">
              {t.detailsKicker}
            </p>
            <h2 className="mt-5 text-3xl tracking-[-0.025em] md:text-5xl">{t.detailsTitle}</h2>
            <div className="mt-14 grid border-y border-nogal/20 sm:grid-cols-2 lg:grid-cols-4">
              <Detail icon={Clock} label={t.duration} value={t.durationValue} />
              <Detail icon={Users} label={t.capacity} value={t.capacityValue} />
              <Detail icon={MapPin} label={t.location} value={t.locationValue} />
              <Detail icon={Clock} label={t.schedule} value={t.scheduleValue} />
            </div>
            <div className="mt-10 flex flex-col justify-between gap-6 rounded-2xl bg-white/35 p-6 sm:flex-row sm:items-center md:p-8">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-nogal/55">{t.price}</p>
                <p className="mt-3 text-sm text-nogal/50 line-through">{t.priceRegular}</p>
                <p className="mt-1 text-2xl font-medium text-carbon">{t.priceOffer}</p>
              </div>
              <a
                href={bookingUrl}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-carbon px-6 py-3.5 text-sm font-medium text-lino transition-transform hover:-translate-y-0.5"
              >
                {t.reserveExperience} <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-nogal px-5 py-24 text-lino md:px-10 md:py-32">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full border border-lino/10" />
          <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full border border-lino/10" />
          <div className="relative mx-auto max-w-4xl text-center">
            <p className="text-[11px] uppercase tracking-[0.25em] text-lino/45">{t.ctaKicker}</p>
            <h2 className="mt-6 text-4xl tracking-[-0.035em] md:text-6xl">{t.ctaTitle}</h2>
            <p className="mx-auto mt-6 max-w-lg text-sm leading-7 text-lino/65">{t.ctaBody}</p>
            <a
              href={bookingUrl}
              className="mt-9 inline-flex items-center gap-2 rounded-full bg-lino px-7 py-3.5 text-sm font-medium text-carbon transition-transform hover:-translate-y-0.5"
            >
              {t.reserveExperience} <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </section>
      </main>

      <footer className="bg-carbon px-5 py-10 text-lino md:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <img src={logoLight.url} alt="asocial · café omakase" className="h-9 w-auto self-start" />
          <div className="text-left sm:text-right">
            <p className="text-sm text-lino/75">{t.footer}</p>
            <p className="mt-2 text-[11px] text-lino/35">Barranco · Lima</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="border-b border-nogal/20 py-7 last:border-b-0 lg:border-b-0 lg:border-r lg:px-7 lg:first:pl-0 lg:last:border-r-0">
      <Icon className="h-4 w-4 text-nogal/55" strokeWidth={1.5} />
      <p className="mt-5 text-[11px] uppercase tracking-[0.16em] text-nogal/50">{label}</p>
      <p className="mt-2 max-w-[15rem] text-sm leading-6 text-carbon">{value}</p>
    </div>
  );
}
