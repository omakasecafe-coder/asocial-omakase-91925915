import { createFileRoute } from "@tanstack/react-router";

import { isPublicSiteHost } from "@/lib/site";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const hostname = new URL(request.url).hostname;
        const sitemapOrigin = isPublicSiteHost(hostname)
          ? "https://asocialcafe.com"
          : "https://reservas.asocialcafe.com";
        const body = `User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Twitterbot
Allow: /

User-agent: facebookexternalhit
Allow: /

User-agent: *
Allow: /

Sitemap: ${sitemapOrigin}/sitemap.xml
`;

        return new Response(body, {
          headers: {
            "Cache-Control": "public, max-age=0, s-maxage=3600",
            "Content-Type": "text/plain; charset=utf-8",
          },
        });
      },
    },
  },
});
