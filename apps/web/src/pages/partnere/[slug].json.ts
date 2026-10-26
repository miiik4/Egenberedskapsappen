import type { APIRoute, GetStaticPaths } from 'astro';

import { getPartners, type Partner } from '../../partners';

/**
 * What the app shows on Oversikt, marked «Sponset», after an install from a partner's page (Android: the Play
 * referrer names the partner, `@egenberedskap/core` partners.ts). A static file on our own site, so the app
 * asks nobody else; logos are data: URLs inside it. Only partners with a greeting get one.
 */
export const getStaticPaths = (async () => {
  const partners = await getPartners();
  return partners.filter((partner) => partner.appGreeting).map((partner) => ({ params: { slug: partner.slug }, props: { partner } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const { partner } = props as { partner: Partner };
  return new Response(
    JSON.stringify({
      name: partner.name,
      greeting: partner.appGreeting,
      logo: partner.logo.src,
      logoDark: partner.logoDark.src,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
};
