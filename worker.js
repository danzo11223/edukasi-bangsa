const API_URL =
  "https://edukasi-bangsa-api.edukasiii.workers.dev/api/videos";

const SITE_URL =
  "https://edukasi-bangsa.edukasiii.workers.dev";

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function validLastmod(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString();
}

async function buildSitemap() {
  const response = await fetch(API_URL, {
    headers: {
      "Accept": "application/json"
    },
    cf: {
      cacheTtl: 300,
      cacheEverything: true
    }
  });

  if (!response.ok) {
    throw new Error(
      `Video API error: ${response.status}`
    );
  }

  const data = await response.json();

  const videos =
    Array.isArray(data) ? data : [];

  const urls = [];

  urls.push(`
  <url>
    <loc>${escapeXml(SITE_URL + "/")}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`);

  for (const video of videos) {
    if (!video || !video.id) {
      continue;
    }

    const videoUrl =
      SITE_URL +
      "/?video=" +
      encodeURIComponent(
        String(video.id)
      );

    const lastmod =
      validLastmod(video.createdAt);

    urls.push(`
  <url>
    <loc>${escapeXml(videoUrl)}</loc>${lastmod ? `
    <lastmod>${escapeXml(lastmod)}</lastmod>` : ""}
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}
</urlset>`;
}

export default {
  async fetch(request, env) {
    const url =
      new URL(request.url);

    if (
      url.pathname === "/sitemap.xml"
    ) {
      try {
        const xml =
          await buildSitemap();

        return new Response(xml, {
          status: 200,
          headers: {
            "Content-Type":
              "application/xml; charset=UTF-8",
            "Cache-Control":
              "public, max-age=300",
            "X-Content-Type-Options":
              "nosniff"
          }
        });
      } catch (error) {
        console.error(
          "Sitemap error:",
          error
        );

        return new Response(
          "Gagal membuat sitemap.",
          {
            status: 500,
            headers: {
              "Content-Type":
                "text/plain; charset=UTF-8"
            }
          }
        );
      }
    }

    return env.ASSETS.fetch(request);
  }
};
