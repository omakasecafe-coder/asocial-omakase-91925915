import { createFileRoute } from "@tanstack/react-router";
import { BookingExperience } from "@/components/asocial/BookingExperience";
import { PublicOmakaseLanding } from "@/components/asocial/PublicOmakaseLanding";
import { getSiteHostname } from "@/lib/site.functions";
import { isPublicSiteHost } from "@/lib/site";

const bookingTitle = "Reservas de café omakase en Lima | asocial café";
const bookingDescription =
  "Reserva una experiencia privada de café omakase en asocial. Cupos limitados, barra guiada y un recorrido pausado para descubrir cafés con calma.";
const bookingUrl = "https://reservas.asocialcafe.com/";

const publicTitle = "asocial café omakase | Trust your barista";
const publicDescription =
  "Una experiencia guiada de café en Barranco: cuatro momentos, una barra íntima y una forma distinta de acercarte al café.";
const publicUrl = "https://asocialcafe.com/";

function siteHead(publicSite: boolean) {
  const title = publicSite ? publicTitle : bookingTitle;
  const description = publicSite ? publicDescription : bookingDescription;
  const url = publicSite ? publicUrl : bookingUrl;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FoodEstablishment",
    name: "asocial café omakase",
    url,
    description,
    servesCuisine: "Café de especialidad",
    priceRange: "S/80",
    areaServed: { "@type": "City", name: "Lima" },
    potentialAction: {
      "@type": "ReserveAction",
      target: "https://reservas.asocialcafe.com/reservar",
      name: "Reservar una sesión",
    },
  };

  return {
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
  };
}

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { view?: "public"; lang?: string } => ({
    ...(search["view"] === "public" ? { view: "public" as const } : {}),
    ...(typeof search["lang"] === "string" ? { lang: search["lang"] } : {}),
  }),
  loader: () => getSiteHostname(),
  head: ({ loaderData }) => siteHead(isPublicSiteHost(loaderData ?? "")),
  component: HomePage,
});


function HomePage() {
  const hostname = Route.useLoaderData();
  const { view, lang } = Route.useSearch();
  return isPublicSiteHost(hostname) || view === "public" ? (
    <PublicOmakaseLanding />
  ) : (
    <BookingExperience lang={lang} />
  );
}
