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
const publicTitleEn = "Coffee omakase in Lima | asocial café";
const publicDescriptionEn =
  "A guided coffee experience in Barranco: four moments, an intimate bar and a different way to discover specialty coffee.";
const publicUrl = "https://asocialcafe.com/";
const publicUrlEn = "https://asocialcafe.com/?lang=en";
const socialImage = "https://asocialcafe.com/asocial-omakase-hero.webp";

function siteHead(publicSite: boolean, lang?: string) {
  const english = publicSite && lang === "en";
  const title = english ? publicTitleEn : publicSite ? publicTitle : bookingTitle;
  const description = english
    ? publicDescriptionEn
    : publicSite
      ? publicDescription
      : bookingDescription;
  const url = english ? publicUrlEn : publicSite ? publicUrl : bookingUrl;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FoodEstablishment",
    name: "asocial café omakase",
    url,
    description,
    servesCuisine: "Café de especialidad",
    priceRange: "S/80",
    image: socialImage,
    telephone: "+51 919 112 980",
    acceptsReservations: true,
    inLanguage: english ? "en" : "es",
    areaServed: { "@type": "City", name: "Lima" },
    sameAs: ["https://www.instagram.com/omakase.cafe/"],
    potentialAction: {
      "@type": "ReserveAction",
      target: english
        ? "https://reservas.asocialcafe.com/reservar?lang=en"
        : "https://reservas.asocialcafe.com/reservar",
      name: english ? "Book a session" : "Reservar una sesión",
    },
  };

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:locale", content: english ? "en_PE" : "es_PE" },
      { property: "og:locale:alternate", content: english ? "es_PE" : "en_PE" },
      { property: "og:image", content: socialImage },
      { property: "og:image:width", content: "1536" },
      { property: "og:image:height", content: "1024" },
      {
        property: "og:image:alt",
        content: english
          ? "Coffee omakase experience at asocial café"
          : "Experiencia de café omakase en asocial café",
      },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: socialImage },
    ],
    links: [
      { rel: "canonical", href: url },
      ...(publicSite
        ? [
            { rel: "alternate", hrefLang: "es", href: publicUrl },
            { rel: "alternate", hrefLang: "en", href: publicUrlEn },
            { rel: "alternate", hrefLang: "x-default", href: publicUrl },
          ]
        : []),
    ],
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
  head: ({ loaderData, match }) => siteHead(isPublicSiteHost(loaderData ?? ""), match.search.lang),
  component: HomePage,
});

function HomePage() {
  const hostname = Route.useLoaderData();
  const { view, lang } = Route.useSearch();
  return isPublicSiteHost(hostname) || view === "public" ? (
    <PublicOmakaseLanding initialLanguage={lang === "en" ? "en" : "es"} />
  ) : (
    <BookingExperience lang={lang} />
  );
}
