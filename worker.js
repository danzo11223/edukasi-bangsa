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

function formatLastmod(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString();
}

async function fetchVideos() {
  const response = await fetch(API_URL, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "User-Agent": "Edukasi-Bangsa-Sitemap/1.0"
    }
  });

  if (!response.ok) {
    const body =
      await response.text();

    throw new Error(
      `Video API error ${response.status}: ${body.slice(0, 200)}`
    );
  }

  const data =
    await response.json();

  return Array.isArray(data)
    ? data
    : [];
}

function buildXml(videos) {
  const entries = [];

  entries.push(`
  <url>
    <loc>${escapeXml(SITE_URL + "/")}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`);

  for (const video of videos) {
    if (!video || !video.id) {
      continue;
    }

    const url =
      SITE_URL +
      "/?video=" +
      encodeURIComponent(
        String(video.id)
      );

    const lastmod =
      formatLastmod(
        video.createdAt
      );

    entries.push(`
  <url>
    <loc>${escapeXml(url)}</loc>${lastmod ? `
    <lastmod>${escapeXml(lastmod)}</lastmod>` : ""}
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.join("")}
</urlset>`;
}

export default {
  async fetch(request, env) {
    const url =
      new URL(request.url);

    if (
      url.pathname ===
      "/sitemap.xml"
    ) {
      try {
        const videos =
          await fetchVideos();

        const xml =
          buildXml(videos);

        return new Response(
          xml,
          {
            status: 200,
            headers: {
              "Content-Type":
                "application/xml; charset=UTF-8",
              "Cache-Control":
                "public, max-age=300",
              "X-Robots-Tag":
                "noindex"
            }
          }
        );
      } catch (error) {
        console.error(
          "Sitemap error:",
          error
        );

        return new Response(
          `Gagal membuat sitemap.\n${error.message}`,
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
