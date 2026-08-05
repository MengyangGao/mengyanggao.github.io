import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { getSiteContent } from '../lib/site-content';
import { buildArchiveItems } from '../lib/archive';
import { resolveSite } from '../lib/site-url';

const { siteName } = getSiteContent();

export async function GET(context: { site?: URL }) {
  const site = resolveSite(context.site);
  const blogPosts = await getCollection('blog', ({ data }) => !data.draft);
  const archiveItems = buildArchiveItems(blogPosts);
  const items = archiveItems
    .filter((item) => item.url && item.url !== '#')
    .map((item) => ({
      title: item.title,
      description: item.description || item.title,
      link: item.url,
      pubDate: item.timestamp ? new Date(item.timestamp) : undefined,
      categories: item.tags
    }))
    .sort((a, b) => (b.pubDate ? b.pubDate.getTime() : 0) - (a.pubDate ? a.pubDate.getTime() : 0));

  return rss({
    title: `${siteName} RSS`,
    description: 'Timeline feed across blog, robotics, software and music updates.',
    site,
    items,
    customData: '<language>zh-CN</language>'
  });
}
