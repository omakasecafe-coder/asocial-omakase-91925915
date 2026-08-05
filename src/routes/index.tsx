import { createFileRoute } from "@tanstack/react-router";
import { BookingExperience } from "@/components/asocial/BookingExperience";

const title = "Reservas de café omakase en Lima | asocial café";
const description =
  "Reserva una experiencia privada de café omakase en asocial. Cupos limitados, barra guiada y un recorrido pausado para descubrir cafés con calma.";
const url = "https://reservas.asocialcafe.com/";
const structuredData = {
  "@context": "https://schema.org",
  "@type": "FoodEstablishment",
  name: "asocial café omakase",
  url,
  description,
  servesCuisine: "Café de especialidad",
  priceRange: "S/.",
  areaServed: {
    "@type": "City",
    name: "Lima",
  },
  potentialAction: {
    "@type": "ReserveAction",
    target: "https://reservas.asocialcafe.com/reservar",
    name: "Reservar una sesión",
  },
};

export const Route = createFileRoute("/")({
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
  component: BookingExperience,
});
