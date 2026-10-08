import type { APIRoute } from 'astro';

export const GET: APIRoute = async (context) => {
  const siteUrl = context.site ? context.site.href.replace(/\/$/, '') : 'https://egenberedskapsappen.no';

  // Only the build for the prod project may be indexed.
  // Firebase passes GCLOUD_PROJECT to the predeploy build (see Base.astro and firebase.json).
  // Non-prod deployments (such as egenberedskapsappen-test) disallow indexing.
  // Production deployments (egenberedskapsappen) and standard/local preview builds allow indexing and link the sitemap.
  const isDisallowed = Boolean(
    process.env.GCLOUD_PROJECT && process.env.GCLOUD_PROJECT !== 'egenberedskapsappen'
  );

  const body = isDisallowed
    ? `User-agent: *\nDisallow: /\n`
    : `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
