import { createFileRoute } from "@tanstack/react-router";
import { BookingExperience } from "@/components/asocial/BookingExperience";

const title = "Reservar café omakase en Lima | asocial café";
const description =
  "Elige una sesión de café omakase en asocial, registra tus datos y recibe los medios de pago para confirmar tu lugar.";
const url = "https://reservas.asocialcafe.com/reservar";
const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: title,
  url,
  description,
  isPartOf: {
    "@type": "WebSite",
    name: "asocial café omakase",
    url: "https://reservas.asocialcafe.com/",
  },
  about: {
    "@type": "FoodEstablishment",
    name: "asocial café omakase",
  },
  potentialAction: {
    "@type": "ReserveAction",
    target: url,
    name: "Reservar una sesión de café omakase",
  },
};

export const Route = createFileRoute("/reservar")({
  validateSearch: (search: Record<string, unknown>): { lang?: string } =>
    typeof search["lang"] === "string" ? { lang: search["lang"] } : {},
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(structuredData),
      },
    ],
  }),
  component: ReservarPage,
});

function ReservarPage() {
  const { lang } = Route.useSearch();
  return <BookingExperience lang={lang} />;
}
