import type { APIRoute } from 'astro';
import { BLOG_POSTS } from '../../data/blog';

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '\'':
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

export const GET: APIRoute = async (context) => {
  const siteUrl = context.site ? context.site.href.replace(/\/$/, '') : 'https://egenberedskapsappen.no';
  const blogUrl = `${siteUrl}/blogg`;
  const feedUrl = `${blogUrl}/rss.xml`;

  // Sort posts by date descending
  const sortedPosts = [...BLOG_POSTS].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const itemsXml = sortedPosts
    .map((post) => {
      const postUrl = `${blogUrl}/${post.slug}`;
      const pubDate = new Date(post.date).toUTCString();
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <description>${escapeXml(post.description)}</description>
      <pubDate>${pubDate}</pubDate>
      <category>${escapeXml(post.category)}</category>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Egenberedskapsappen Blogg</title>
    <description>Praktiske råd, veiledninger og kunnskap om hvordan du forbereder hjemmet og familien på strømbrudd, vannstans og kriser.</description>
    <link>${blogUrl}</link>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
    <language>no</language>
${itemsXml}
  </channel>
</rss>`.trim();

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};
