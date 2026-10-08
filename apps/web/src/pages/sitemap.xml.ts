import type { APIRoute } from 'astro';
import { BLOG_POSTS } from '../data/blog';

interface SitemapEntry {
  loc: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
}

export const GET: APIRoute = async (context) => {
  const siteUrl = context.site ? context.site.href.replace(/\/$/, '') : 'https://egenberedskapsappen.no';

  // Find the latest post date for the main and blog overview pages
  const latestBlogDate = BLOG_POSTS.reduce((latest, post) => {
    return post.date > latest ? post.date : latest;
  }, '2026-10-08');

  const entries: SitemapEntry[] = [
    {
      loc: `${siteUrl}/`,
      lastmod: latestBlogDate,
      changefreq: 'weekly',
    },
    {
      loc: `${siteUrl}/blogg`,
      lastmod: latestBlogDate,
      changefreq: 'weekly',
    },
    ...BLOG_POSTS.map((post) => ({
      loc: `${siteUrl}/blogg/${post.slug}`,
      lastmod: post.date,
      changefreq: 'monthly' as const,
    })),
    {
      loc: `${siteUrl}/personvern`,
      lastmod: '2026-10-08',
      changefreq: 'monthly',
    },
    {
      loc: `${siteUrl}/kontakt`,
      lastmod: '2026-10-08',
      changefreq: 'monthly',
    },
  ];

  const urlsXml = entries
    .map(
      (entry) => `  <url>
    <loc>${entry.loc}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
  </url>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>`.trim();

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};
