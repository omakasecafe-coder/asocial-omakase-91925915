import { createFileRoute } from "@tanstack/react-router";

import { isPublicSiteHost } from "@/lib/site";

const lastModified = "2026-08-18";

function publicSitemap() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://asocialcafe.com/</loc>
    <lastmod>${lastModified}</lastmod>
    <xhtml:link rel="alternate" hreflang="es" href="https://asocialcafe.com/" />
    <xhtml:link rel="alternate" hreflang="en" href="https://asocialcafe.com/?lang=en" />
    <xhtml:link rel="alternate" hreflang="x-default" href="https://asocialcafe.com/" />
  </url>
  <url>
    <loc>https://asocialcafe.com/?lang=en</loc>
    <lastmod>${lastModified}</lastmod>
    <xhtml:link rel="alternate" hreflang="es" href="https://asocialcafe.com/" />
    <xhtml:link rel="alternate" hreflang="en" href="https://asocialcafe.com/?lang=en" />
    <xhtml:link rel="alternate" hreflang="x-default" href="https://asocialcafe.com/" />
  </url>
</urlset>`;
}

function bookingSitemap() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://reservas.asocialcafe.com/</loc>
    <lastmod>${lastModified}</lastmod>
  </url>
  <url>
    <loc>https://reservas.asocialcafe.com/reservar</loc>
    <lastmod>${lastModified}</lastmod>
  </url>
</urlset>`;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const hostname = new URL(request.url).hostname;
        const xml = isPublicSiteHost(hostname) ? publicSitemap() : bookingSitemap();

        return new Response(xml, {
          headers: {
            "Cache-Control": "public, max-age=0, s-maxage=3600",
            "Content-Type": "application/xml; charset=utf-8",
          },
        });
      },
    },
  },
});
