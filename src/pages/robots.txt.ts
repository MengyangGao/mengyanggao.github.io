import type { APIContext } from 'astro';
import { resolveSite } from '../lib/site-url';

export function GET(context: APIContext) {
  const site = resolveSite(context.site);
  const sitemapUrl = new URL('/sitemap-index.xml', site).toString();

  const content = `User-agent: *
Allow: /

Sitemap: ${sitemapUrl}
`;

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
}
