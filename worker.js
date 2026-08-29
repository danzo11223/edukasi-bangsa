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

async function fetchVideos(env) {
  const response = await env.VIDEO_API.fetch(
    new Request(
      "https://internal/api/videos",
      {
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      }
    )
  );

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Video API error ${response.status}: ${body.slice(0, 200)}`
    );
  }

  const data = await response.json();

  return Array.isArray(data)
    ? data
    : [];
}

function buildXml(videos) {
  const entries = [];

  // Homepage
  entries.push(`
  <url>
    <loc>${escapeXml(SITE_URL + "/")}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`);

  // Semua video dari API
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
      formatLastmod(video.createdAt);

    entries.push(`
  <url>
    <loc>${escapeXml(videoUrl)}</loc>${lastmod ? `
    <lastmod>${escapeXml(lastmod)}</lastmod>` : ""}
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("")}
</urlset>`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Sitemap otomatis
    if (url.pathname === "/sitemap.xml") {
      try {
        const videos =
          await fetchVideos(env);

        const xml =
          buildXml(videos);

        return new Response(xml, {
          status: 200,
          headers: {
            "Content-Type":
              "application/xml; charset=UTF-8",

            "Cache-Control":
              "public, max-age=300"
          }
        });

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

    // Website normal
    return env.ASSETS.fetch(request);
  }
};
