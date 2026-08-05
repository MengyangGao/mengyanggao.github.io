import rawMetadata from '../data/link-metadata.json';
import { getTargetSectionUrls } from './site-content';

export type RepoSummary = {
  full_name?: string;
  name?: string;
  url?: string;
  description?: string;
  readme_excerpt?: string;
  readme_image?: string | null;
  readme_image_local?: string | null;
  stars?: number;
  forks?: number;
  created_at?: string;
  updated_at?: string;
  pushed_at?: string;
  language?: string | null;
  topics?: string[];
  top_languages?: string[];
  language_stats?: Array<{ name: string; ratio: number; bytes: number }>;
  homepage?: string | null;
  bucket?: string;
};

export type RepoDetail = {
  url?: string;
  full_name?: string;
  description?: string;
  stars?: number;
  forks?: number;
  created_at?: string;
  updated_at?: string;
  pushed_at?: string;
  homepage?: string | null;
  topics?: string[];
  top_languages?: string[];
  language_stats?: Array<{ name: string; ratio: number; bytes: number }>;
};

export type VideoInfo = {
  bvid?: string;
  title?: string;
  description?: string;
  cover_image?: string | null;
  pubdate?: number;
  url?: string;
  stat?: {
    view?: number;
    like?: number;
    reply?: number;
    favorite?: number;
    coin?: number;
    share?: number;
  };
};

type MetadataShape = {
  generated_at?: string;
  github: {
    repos: Record<string, RepoDetail | null>;
    buckets: {
      robotics: { recent: RepoSummary[] };
      software: { recent: RepoSummary[] };
    };
  };
  bilibili: {
    video: VideoInfo | null;
    video_cover_local: string | null;
    featured_videos: VideoInfo[];
    featured_cover_images: Record<string, string>;
  };
};

const EMPTY_METADATA: MetadataShape = {
  generated_at: '',
  github: {
    repos: {},
    buckets: {
      robotics: { recent: [] },
      software: { recent: [] }
    }
  },
  bilibili: {
    video: null,
    video_cover_local: null,
    featured_videos: [],
    featured_cover_images: {}
  }
};

const asObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const asString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
};

const stripMarkdownEmphasis = (value: string | undefined): string | undefined => {
  if (!value) return value;
  const cleaned = value
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/_([^_\n]+)_/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || undefined;
};

const asNumber = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || Number.isNaN(value)) return undefined;
  return value;
};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const normalizeLanguageStats = (value: unknown): Array<{ name: string; ratio: number; bytes: number }> =>
  asArray(value)
    .map((entry) => {
      const lang = asObject(entry);
      if (!lang) return null;
      const name = asString(lang.name);
      if (!name) return null;
      return {
        name,
        ratio: asNumber(lang.ratio) || 0,
        bytes: asNumber(lang.bytes) || 0
      };
    })
    .filter((entry): entry is { name: string; ratio: number; bytes: number } => Boolean(entry));

function normalizeRepo(input: unknown): RepoSummary | null {
  const item = asObject(input);
  if (!item) return null;

  return {
    full_name: asString(item.full_name),
    name: asString(item.name),
    url: asString(item.url),
    description: stripMarkdownEmphasis(asString(item.description)),
    readme_excerpt: stripMarkdownEmphasis(asString(item.readme_excerpt)),
    readme_image: asString(item.readme_image) || null,
    readme_image_local: asString(item.readme_image_local) || null,
    stars: asNumber(item.stars) || 0,
    forks: asNumber(item.forks) || 0,
    created_at: asString(item.created_at),
    updated_at: asString(item.updated_at),
    pushed_at: asString(item.pushed_at),
    language: asString(item.language) || null,
    topics: asArray(item.topics).map((entry) => String(entry)).filter(Boolean),
    top_languages: asArray(item.top_languages).map((entry) => String(entry)).filter(Boolean),
    language_stats: normalizeLanguageStats(item.language_stats),
    homepage: asString(item.homepage) || null,
    bucket: asString(item.bucket)
  };
}

function normalizeRepoDetail(input: unknown): RepoDetail | null {
  const item = asObject(input);
  if (!item) return null;

  return {
    url: asString(item.url),
    full_name: asString(item.full_name),
    description: asString(item.description),
    stars: asNumber(item.stars) || 0,
    forks: asNumber(item.forks) || 0,
    created_at: asString(item.created_at),
    updated_at: asString(item.updated_at),
    pushed_at: asString(item.pushed_at),
    homepage: asString(item.homepage) || null,
    topics: asArray(item.topics).map((entry) => String(entry)).filter(Boolean),
    top_languages: asArray(item.top_languages).map((entry) => String(entry)).filter(Boolean),
    language_stats: normalizeLanguageStats(item.language_stats)
  };
}

function normalizeVideo(input: unknown): VideoInfo | null {
  const item = asObject(input);
  if (!item) return null;

  const statRaw = asObject(item.stat);
  const stat = statRaw
    ? {
        view: asNumber(statRaw.view) || 0,
        like: asNumber(statRaw.like) || 0,
        reply: asNumber(statRaw.reply) || 0,
        favorite: asNumber(statRaw.favorite) || 0,
        coin: asNumber(statRaw.coin) || 0,
        share: asNumber(statRaw.share) || 0
      }
    : undefined;

  return {
    bvid: asString(item.bvid),
    title: asString(item.title),
    description: asString(item.description),
    cover_image: asString(item.cover_image) || null,
    pubdate: asNumber(item.pubdate) || 0,
    url: asString(item.url),
    stat
  };
}

function normalizeMetadata(input: unknown): MetadataShape {
  const root = asObject(input);
  if (!root) return EMPTY_METADATA;

  const github = asObject(root.github);
  const githubBuckets = asObject(github?.buckets);
  const roboticsBucket = asObject(githubBuckets?.robotics);
  const softwareBucket = asObject(githubBuckets?.software);
  const githubReposRaw = asObject(github?.repos) || {};

  const roboticsRecent = asArray(roboticsBucket?.recent).map(normalizeRepo).filter((item): item is RepoSummary => Boolean(item));
  const softwareRecent = asArray(softwareBucket?.recent).map(normalizeRepo).filter((item): item is RepoSummary => Boolean(item));

  const bilibili = asObject(root.bilibili);
  const featuredVideos = asArray(bilibili?.featured_videos).map(normalizeVideo).filter((item): item is VideoInfo => Boolean(item));
  const primaryVideo = normalizeVideo(bilibili?.video);
  const coverMapRaw = asObject(bilibili?.featured_cover_images) || {};
  const featuredCoverImages = Object.fromEntries(
    Object.entries(coverMapRaw)
      .map(([key, value]) => [String(key), asString(value)])
      .filter((entry): entry is [string, string] => Boolean(entry[1]))
  );

  return {
    generated_at: asString(root.generated_at) || '',
    github: {
      repos: Object.fromEntries(
        Object.entries(githubReposRaw).map(([key, value]) => [key, normalizeRepoDetail(value)])
      ),
      buckets: {
        robotics: { recent: roboticsRecent },
        software: { recent: softwareRecent }
      }
    },
    bilibili: {
      video: primaryVideo,
      video_cover_local: asString(bilibili?.video_cover_local) || null,
      featured_videos: featuredVideos,
      featured_cover_images: featuredCoverImages
    }
  };
}

const metadata = normalizeMetadata(rawMetadata);

export function getMetadata() {
  return metadata;
}

export function getRepoImage(repo: RepoSummary) {
  return repo.readme_image_local || repo.readme_image || null;
}

function getRepoDetail(repo: RepoSummary, meta = metadata): RepoDetail | null {
  if (!repo?.full_name) return null;
  return meta?.github?.repos?.[repo.full_name] || null;
}

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  'C++': '#f34b7d',
  C: '#555555',
  Astro: '#ff5d01',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Shell: '#89e051',
  Vue: '#41b883',
  Rust: '#dea584',
  Go: '#00add8',
  Java: '#b07219',
  Markdown: '#083fa1'
};

export function getRepoLanguages(
  repo: RepoSummary,
  meta = metadata
): Array<{ name: string; ratio?: number; color?: string }> {
  const detail = getRepoDetail(repo, meta);
  const stats = detail?.language_stats || repo.language_stats || [];
  if (stats.length > 0) {
    return stats
      .filter((item) => item.name && item.ratio > 0)
      .slice(0, 3)
      .map((item) => ({
        name: item.name,
        ratio: item.ratio,
        color: LANGUAGE_COLORS[item.name] || '#6e7781'
      }));
  }

  const top = detail?.top_languages || repo.top_languages || [];
  if (top.length > 0) {
    return top.slice(0, 3).map((name) => ({
      name,
      color: LANGUAGE_COLORS[name] || '#6e7781'
    }));
  }

  if (repo.language && repo.language.toLowerCase() !== 'unknown') {
    return [{ name: repo.language, color: LANGUAGE_COLORS[repo.language] || '#6e7781' }];
  }
  return [];
}

export function formatDate(dateLike?: string | number | Date) {
  if (!dateLike) return '-';
  if (dateLike instanceof Date) {
    return Number.isNaN(dateLike.getTime()) ? '-' : dateLike.toISOString().slice(0, 10);
  }
  if (typeof dateLike === 'number') {
    return new Date(dateLike * 1000).toISOString().slice(0, 10);
  }
  return String(dateLike).slice(0, 10);
}

export function formatNumber(value?: number) {
  return typeof value === 'number' ? value.toLocaleString('en-US') : '-';
}

function extractGithubRepoFromUrl(value?: string) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const urlMatch = raw.match(/^https?:\/\/github\.com\/([^/\s]+\/[^/\s?#]+?)(?:\.git)?\/?$/i);
  if (urlMatch) return urlMatch[1];
  const repoMatch = raw.match(/^([^/\s]+\/[^/\s]+)$/);
  return repoMatch ? repoMatch[1] : null;
}

function extractBvidFromUrl(value?: string) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const match = raw.match(/BV[0-9A-Za-z]+/);
  return match ? match[0] : null;
}

function configuredRepoKeys(section: string) {
  return new Set(
    getTargetSectionUrls(section)
      .map((item) => extractGithubRepoFromUrl(item))
      .filter(Boolean)
      .map((item) => String(item).trim().toLowerCase())
  );
}

function configuredBvids(section: string) {
  return new Set(
    getTargetSectionUrls(section)
      .map((item) => extractBvidFromUrl(item))
      .filter(Boolean)
      .map((item) => String(item).trim())
  );
}

export function getPrimaryMusicVideo(meta = metadata): VideoInfo | null {
  const targetBvid = Array.from(configuredBvids('music'))[0] || '';
  if (!targetBvid) return null;
  const candidates = [meta?.bilibili?.video, ...(meta?.bilibili?.featured_videos || [])].filter(Boolean) as VideoInfo[];
  const matched = candidates.find((video) => video.bvid === targetBvid);
  if (matched) return matched;

  return {
    bvid: targetBvid,
    title: `Bilibili video ${targetBvid}`,
    description: '',
    url: `https://www.bilibili.com/video/${targetBvid}/`,
    pubdate: undefined,
    cover_image: undefined,
    stat: {
      view: undefined,
      like: undefined
    }
  } as VideoInfo;
}

export function getMusicVideoCover(video: VideoInfo | null, meta = metadata) {
  if (!video) return null;
  if (meta?.bilibili?.video?.bvid === video.bvid && meta?.bilibili?.video_cover_local) {
    return meta.bilibili.video_cover_local;
  }
  return meta?.bilibili?.featured_cover_images?.[video.bvid || ''] || video.cover_image || null;
}

export function getRoboticsRepos(meta = metadata): RepoSummary[] {
  const normalizeRepoKey = (value?: string) => String(value || '').trim().toLowerCase();
  const configured = configuredRepoKeys('robotics');
  return (meta?.github?.buckets?.robotics?.recent || []).filter(
    (repo) =>
      repo.full_name &&
      configured.has(normalizeRepoKey(repo.full_name)) &&
      normalizeRepoKey(repo.full_name) !== 'mengyanggao/open-robocon'
  );
}

export function getSoftwareRepos(meta = metadata): RepoSummary[] {
  const normalizeRepoKey = (value?: string) => String(value || '').trim().toLowerCase();
  const configured = configuredRepoKeys('software');
  return (meta?.github?.buckets?.software?.recent || []).filter(
    (repo) => repo.full_name && configured.has(normalizeRepoKey(repo.full_name))
  );
}

export function getRoboticsVideos(meta = metadata): VideoInfo[] {
  const configured = configuredBvids('robotics');
  if (!configured.size) return [];
  return (meta?.bilibili?.featured_videos || []).filter((video) => video.bvid && configured.has(video.bvid));
}

export function getFeaturedCoverMap(meta = metadata): Record<string, string> {
  const configured = configuredBvids('robotics');
  const coverMap = meta?.bilibili?.featured_cover_images || {};
  if (!configured.size) return {};
  return Object.fromEntries(Object.entries(coverMap).filter(([key]) => configured.has(key)));
}
