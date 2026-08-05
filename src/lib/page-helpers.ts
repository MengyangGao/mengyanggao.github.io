import type { CollectionEntry } from 'astro:content';
import type { HomeContent, LocalizedText } from './site-content';
import { estimateReadingMinutes } from './reading-time';
import {
  formatDate,
  formatNumber,
  getFeaturedCoverMap,
  getMetadata,
  getRepoImage,
  getRepoLanguages,
  getRoboticsRepos,
  getRoboticsVideos,
  getSoftwareRepos
} from './metadata';
import { resolveContentAssetPath } from './site-content';
import type { RepoSummary, VideoInfo } from './metadata';
import { resolveTitle } from './localized-text';

type Metadata = ReturnType<typeof getMetadata>;
export type StatValue = string | LocalizedText;
export type LanguageStat = { name: string; ratio?: number; color?: string };
export type CardStat = {
  platform: 'github' | 'bilibili' | 'text';
  icon?: 'star' | 'fork' | 'view' | 'like' | 'calendar';
  value: StatValue;
};

export type CollectionPageJsonLd = {
  '@context': 'https://schema.org';
  '@type': 'CollectionPage';
  name: string;
  url: string;
  inLanguage: string[];
  mainEntity: {
    '@type': 'ItemList';
    itemListElement: Array<{
      '@type': 'ListItem';
      position: number;
      name: string;
      url: string;
    }>;
  };
};

export type SelectedWorkCard = {
  localizedTitle: LocalizedText;
  description: string;
  href: string;
  image: string | null;
  sortTimestamp: number;
  sortIndex: number;
  languages: LanguageStat[];
  stats: CardStat[];
  resources: Array<{ label: string; href: string }>;
  external: boolean;
};

export type MediaCard = {
  title: string;
  description: string;
  href: string;
  image: string | null;
  languages: LanguageStat[];
  stats: CardStat[];
  timestamp: number;
  external: boolean;
};

export type BlogIndexCard = MediaCard & {
  sourceUrl: string;
  publishDate: string;
  readTime: string;
};

function markdownExcerpt(markdown = '', max = 180) {
  const text = String(markdown || '')
    .replace(/\[([^\]]+)]\((https?:\/\/[^)]+)\)/g, '$1')
    .replace(/[#>*_`~-]/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1).trim()}…` : text;
}

function extractFirstBlogImage(markdown = '', slug = '') {
  const match = String(markdown || '').match(/!\[[^\]]*]\(([^)]+)\)/);
  if (!match) return null;

  const raw = match[1].trim();
  if (!raw) return null;
  if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('/')) return raw;

  const normalized = raw
    .replace(/^\.\/?/, '')
    .replace(/^assets\/?/, '');

  return normalized ? `/blog/${slug}/assets/${normalized}` : null;
}

function formatWorkTitle(tag: LocalizedText, title: LocalizedText): LocalizedText {
  return {
    en: `[${tag.en}]${title.en}`,
    zhHans: `[${tag.zhHans}]${title.zhHans}`,
    zhHant: `[${tag.zhHant}]${title.zhHant}`,
  };
}

const workTags = {
  blog: { en: 'Blog', zhHans: '博客', zhHant: '博客' },
  robotics: { en: 'Robotics', zhHans: '机器人', zhHant: '機器人' },
  software: { en: 'Software', zhHans: '软件', zhHant: '軟體' },
  work: { en: 'Work', zhHans: '作品', zhHant: '作品' },
} satisfies Record<string, LocalizedText>;

function sameLanguageTitle(title: string): LocalizedText {
  return { en: title, zhHans: title, zhHant: title };
}

function selectedWorkTitle(
  item: HomeContent['selectedWork'][number],
  fallbackTag: LocalizedText,
  fallbackTitle: LocalizedText
) {
  return formatWorkTitle(item.tag || fallbackTag, item.title || fallbackTitle);
}

function toTimestamp(value?: string | number | Date | null) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') {
    return value > 1e12 ? value : value * 1000;
  }
  const ts = Date.parse(String(value));
  return Number.isNaN(ts) ? 0 : ts;
}

function sameDate(a?: string | number | Date | null, b?: string | number | Date | null) {
  const aTs = toTimestamp(a);
  const bTs = toTimestamp(b);
  if (!aTs || !bTs) return false;
  return new Date(aTs).toISOString().slice(0, 10) === new Date(bTs).toISOString().slice(0, 10);
}

function localizedDateStat(label: 'release' | 'latest', dateLike?: string | number | Date | null): StatValue | null {
  const date = formatDate(dateLike || undefined);
  if (!date || date === '-') return null;
  const labels = label === 'release'
    ? { en: 'Released', zhHans: '发布', zhHant: '發布' }
    : { en: 'Latest', zhHans: '最新', zhHant: '最新' };
  return {
    en: `${labels.en}: ${date}`,
    zhHans: `${labels.zhHans}: ${date}`,
    zhHant: `${labels.zhHant}: ${date}`,
  };
}

function dateStats(
  releaseDate?: string | number | Date | null,
  latestDate?: string | number | Date | null
): Array<{ platform: 'text'; icon: 'calendar'; value: StatValue }> {
  const stats: Array<{ platform: 'text'; icon: 'calendar'; value: StatValue }> = [];
  const releaseValue = localizedDateStat('release', releaseDate);
  if (releaseValue) stats.push({ platform: 'text', icon: 'calendar', value: releaseValue });
  if (latestDate && !sameDate(releaseDate, latestDate)) {
    const latestValue = localizedDateStat('latest', latestDate);
    if (latestValue) stats.push({ platform: 'text', icon: 'calendar', value: latestValue });
  }
  return stats;
}

export function createCollectionPageJsonLd(
  name: string,
  url: string,
  itemListElement: CollectionPageJsonLd['mainEntity']['itemListElement'] = [],
  inLanguage: string[] = ['en', 'zh-CN', 'zh-HK']
): CollectionPageJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    url,
    inLanguage,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement
    }
  };
}

export function createListItem(name: string, url: string, position: number) {
  return {
    '@type': 'ListItem' as const,
    position,
    name,
    url
  };
}

export function buildBlogIndexCards(
  posts: CollectionEntry<'blog'>[],
  readTimeTemplate: string
): BlogIndexCard[] {
  return posts.map((post) => {
    const readMins = estimateReadingMinutes(post.body || '');
    const title = resolveTitle(post.data, 'zhHans') || post.id || '-';
    const description = String(post.data.summary || '').trim();
    const timestamp = post.data.publish_date.getTime();

    return {
      title,
      description,
      href: `/blog/${post.id.replace(/\.md$/, '')}/`,
      sourceUrl: String(post.data.url || '').trim(),
      image: resolveContentAssetPath(post.data.cover_image) || '',
      timestamp,
      publishDate: post.data.publish_date.toISOString().slice(0, 10),
      readTime: readTimeTemplate.replace('{count}', String(readMins)),
      languages: [],
      stats: [],
      external: false,
    };
  });
}

export function buildRepoMediaCards(repos: RepoSummary[], meta: Metadata = getMetadata()): MediaCard[] {
  return repos.map((repo) => {
    const latestDate = repo.pushed_at || repo.updated_at;
    const timestamp = toTimestamp(latestDate);
    return {
      title: repo.full_name || repo.name || '-',
      description: repo.readme_excerpt || repo.description || '',
      href: repo.url || '#',
      image: getRepoImage(repo),
      languages: getRepoLanguages(repo, meta),
      stats: [
        { platform: 'github', icon: 'star', value: formatNumber(repo.stars) },
        { platform: 'github', icon: 'fork', value: formatNumber(repo.forks) },
        ...dateStats(repo.created_at, latestDate)
      ],
      timestamp,
      external: true
    };
  });
}

export function buildVideoMediaCards(
  videos: VideoInfo[],
  coverMap: Record<string, string> = {}
): MediaCard[] {
  return videos.map((video) => {
    const timestamp = toTimestamp(video.pubdate);
    return {
      title: video.title || '-',
      description: video.description || '',
      href: video.url || '#',
      image: coverMap[video.bvid || ''] || video.cover_image || null,
      languages: [],
      stats: [
        { platform: 'bilibili', icon: 'view', value: formatNumber(video.stat?.view) },
        { platform: 'bilibili', icon: 'like', value: formatNumber(video.stat?.like) },
        ...dateStats(video.pubdate)
      ],
      timestamp,
      external: true
    };
  });
}

export function buildSelectedWorkCards(
  selectedWork: HomeContent['selectedWork'],
  blogPosts: CollectionEntry<'blog'>[] = [],
  metadata: Metadata = getMetadata()
): SelectedWorkCard[] {
  const blogMap = new Map<string, CollectionEntry<'blog'>>(
    blogPosts.map((post) => [post.id.replace(/\.md$/, ''), post] as const)
  );
  const roboticsRepos = [...getRoboticsRepos(metadata)];
  const softwareRepos = [...getSoftwareRepos(metadata)];
  const allRepos = [...roboticsRepos, ...softwareRepos];
  const roboticsVideos = [...getRoboticsVideos(metadata)];
  const featuredCoverMap = getFeaturedCoverMap(metadata);

  return selectedWork
    .map((item, index) => {
      const href = String(item.href || '').trim();

      if (href.startsWith('/blog/')) {
        const slug = href.replace(/^\/blog\/+/, '').replace(/\/+$/, '');
        const post = blogMap.get(slug);
        const readTime = post ? `${estimateReadingMinutes(post.body || '')}m` : '';
        const sortTimestamp = post ? post.data.publish_date.getTime() : 0;
        const image = post
          ? resolveContentAssetPath(post.data.cover_image) || extractFirstBlogImage(post.body || '', slug)
          : null;
        const description = post
          ? String(post.data.summary || '').trim() || markdownExcerpt(post.body || '')
          : '';
        const fallbackTitle = post
          ? {
              en: post.data.title_en,
              zhHans: post.data.title_zh,
              zhHant: post.data.title_zh,
            }
          : sameLanguageTitle(slug);

        return {
          localizedTitle: selectedWorkTitle(item, workTags.blog, fallbackTitle),
          description,
          href,
          image,
          sortTimestamp,
          sortIndex: index,
          languages: [],
          stats: [
            ...dateStats(post?.data.publish_date, post?.data.modify_date),
            ...(readTime ? [{ platform: 'text' as const, value: readTime }] : [])
          ],
          resources: item.resources,
          external: false
        };
      }

      if (/^https?:\/\/(?:www\.)?bilibili\.com\/video\//i.test(href)) {
        const video = roboticsVideos.find((entry) => entry.url === href || (entry.bvid ? href.includes(entry.bvid) : false)) || null;
        const description = video ? markdownExcerpt(video.description || '') : '';
        const image = video ? (featuredCoverMap[video.bvid || ''] || video.cover_image || null) : null;
        const sortTimestamp = video?.pubdate ? video.pubdate * 1000 : 0;

        return {
          localizedTitle: selectedWorkTitle(
            item,
            workTags.robotics,
            sameLanguageTitle(video?.title || href)
          ),
          description,
          href,
          image,
          sortTimestamp,
          sortIndex: index,
          languages: [],
          stats: [
            ...(video?.stat?.view !== undefined ? [{ platform: 'bilibili' as const, icon: 'view' as const, value: formatNumber(video.stat?.view) }] : []),
            ...(video?.stat?.like !== undefined ? [{ platform: 'bilibili' as const, icon: 'like' as const, value: formatNumber(video.stat?.like) }] : []),
            ...dateStats(video?.pubdate)
          ],
          resources: item.resources,
          external: true
        };
      }

      if (/^https?:\/\/github\.com\//i.test(href)) {
        const repo = allRepos.find((entry) => entry.url === href) || null;
        const description = repo ? repo.readme_excerpt || repo.description || '' : '';
        const image = repo ? getRepoImage(repo) : null;
        const latestDate = repo?.pushed_at || repo?.updated_at;
        const sortTimestamp = repo ? Date.parse(latestDate || '') || 0 : 0;
        const fallbackTag = roboticsRepos.some((entry) => entry.url === href)
          ? workTags.robotics
          : softwareRepos.some((entry) => entry.url === href)
            ? workTags.software
            : workTags.work;

        return {
          localizedTitle: selectedWorkTitle(
            item,
            fallbackTag,
            sameLanguageTitle(repo?.full_name || href.replace(/^https?:\/\/github\.com\//i, ''))
          ),
          description,
          href,
          image,
          sortTimestamp,
          sortIndex: index,
          languages: repo ? getRepoLanguages(repo, metadata) : [],
          stats: [
            ...(repo?.stars !== undefined ? [{ platform: 'github' as const, icon: 'star' as const, value: formatNumber(repo.stars) }] : []),
            ...(repo?.forks !== undefined ? [{ platform: 'github' as const, icon: 'fork' as const, value: formatNumber(repo.forks) }] : []),
            ...dateStats(repo?.created_at, latestDate)
          ],
          resources: item.resources,
          external: true
        };
      }

      return {
        localizedTitle: selectedWorkTitle(item, workTags.work, sameLanguageTitle(href)),
        description: '',
        href,
        image: null,
        sortTimestamp: 0,
        sortIndex: index,
        languages: [],
        stats: [],
        resources: item.resources,
        external: /^https?:\/\//i.test(href)
      };
    })
    .sort((a, b) => {
      if (b.sortTimestamp !== a.sortTimestamp) return b.sortTimestamp - a.sortTimestamp;
      return a.sortIndex - b.sortIndex;
    });
}
